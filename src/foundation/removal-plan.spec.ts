import { expect } from '@open-wc/testing';
import { isRemove, isSetAttributes } from '@openscd/oscd-api/utils.js';

import {
  iedRemovalEdits,
  removalSummary,
  sectionRemovalEdits,
  wouldEmptyCommunication,
} from './removal-plan.js';

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<SCL xmlns="http://www.iec.ch/61850/2003/SCL" version="2007" revision="B" release="4">
  <Communication>
    <SubNetwork name="StationBus">
      <ConnectedAP iedName="IED1" apName="AP1"/>
    </SubNetwork>
    <SubNetwork name="ProcessBus">
      <ConnectedAP iedName="IED1" apName="AP1"/>
    </SubNetwork>
  </Communication>
  <IED name="IED1">
    <AccessPoint name="AP1"/>
  </IED>
  <Substation name="S1">
    <VoltageLevel name="V1">
      <Bay name="B1">
        <ConductingEquipment name="QA1">
          <LNode iedName="IED1" ldInst="L" lnClass="XCBR" lnInst="1"/>
        </ConductingEquipment>
      </Bay>
    </VoltageLevel>
  </Substation>
</SCL>`;

function parse(xmlText = xml): XMLDocument {
  return new DOMParser().parseFromString(xmlText, 'application/xml');
}

describe('removal plan', () => {
  describe('IED edits', () => {
    it('preserves bound LNodes as unbound specifications', () => {
      const doc = parse();
      const ied = doc.querySelector('IED[name="IED1"]')!;
      const lNode = doc.querySelector('LNode')!;
      const edits = iedRemovalEdits(ied, true);

      expect(
        edits.some(
          edit =>
            isSetAttributes(edit) &&
            edit.element === lNode &&
            edit.attributes?.iedName === 'None',
        ),
      ).to.be.true;
      expect(edits.some(edit => isRemove(edit) && edit.node === lNode)).to.be
        .false;
      expect(edits.some(edit => isRemove(edit) && edit.node === ied)).to.be
        .true;
    });

    it('removes bound LNodes when preservation is off', () => {
      const doc = parse();
      const ied = doc.querySelector('IED[name="IED1"]')!;
      const lNode = doc.querySelector('LNode')!;
      const edits = iedRemovalEdits(ied, false);

      expect(edits.some(edit => isRemove(edit) && edit.node === lNode)).to.be
        .true;
      expect(
        edits.some(edit => isSetAttributes(edit) && edit.element === lNode),
      ).to.be.false;
    });

    it('returns no edits for an element which is not an IED', () => {
      const doc = parse();
      expect(iedRemovalEdits(doc.documentElement, true)).to.deep.equal([]);
    });
  });

  describe('section edits', () => {
    it('removes Communication as one edit when it is chosen', () => {
      const doc = parse();
      const communication = doc.querySelector(':root > Communication')!;
      const [station, process] = Array.from(doc.querySelectorAll('SubNetwork'));

      expect(sectionRemovalEdits(communication, [station, process])).to.deep.equal(
        [{ node: communication }],
      );
    });

    it('removes only the chosen networks otherwise', () => {
      const doc = parse();
      const [station, process] = Array.from(doc.querySelectorAll('SubNetwork'));

      expect(sectionRemovalEdits(null, [station, process])).to.deep.equal([
        { node: station },
        { node: process },
      ]);
      expect(sectionRemovalEdits(null, [])).to.deep.equal([]);
    });
  });

  describe('empty Communication', () => {
    it('requires every affected network to be deleted', () => {
      const doc = parse();
      const communication = doc.querySelector(':root > Communication')!;
      const [station, process] = Array.from(doc.querySelectorAll('SubNetwork'));

      expect(wouldEmptyCommunication(null, [station, process], new Set())).to.be
        .false;
      expect(wouldEmptyCommunication(communication, [], new Set())).to.be.false;
      expect(
        wouldEmptyCommunication(communication, [station, process], new Set([station])),
      ).to.be.false;
      expect(
        wouldEmptyCommunication(
          communication,
          [station, process],
          new Set([station, process]),
        ),
      ).to.be.true;
    });
  });

  describe('summary', () => {
    it('lists deleted and retained networks without changing the document', () => {
      const doc = parse();
      const [station, process] = Array.from(doc.querySelectorAll('SubNetwork'));
      const original = new XMLSerializer().serializeToString(doc);
      const summary = removalSummary({
        ieds: [doc.querySelector('IED')!],
        hasBoundLNodes: true,
        preserveLNodes: true,
        communication: doc.querySelector(':root > Communication'),
        affectedSubNetworks: [station, process],
        deletedSubNetworks: new Set([station]),
        deleteCommunication: false,
      });

      expect(summary).to.deep.equal({
        iedNames: ['IED1'],
        hasBoundLNodes: true,
        preserveLNodes: true,
        deletedSubNetworks: ['StationBus'],
        retainedSubNetworks: ['ProcessBus'],
        deleteCommunication: false,
        retainCommunication: false,
      });
      expect(new XMLSerializer().serializeToString(doc)).to.equal(original);
    });

    it('reports a deleted Communication only when every network is deleted', () => {
      const doc = parse();
      const [station, process] = Array.from(doc.querySelectorAll('SubNetwork'));
      const base = {
        ieds: [doc.querySelector('IED')!],
        hasBoundLNodes: false,
        preserveLNodes: true,
        communication: doc.querySelector(':root > Communication'),
        affectedSubNetworks: [station, process],
      };

      expect(
        removalSummary({
          ...base,
          deletedSubNetworks: new Set([station, process]),
          deleteCommunication: true,
        }).deleteCommunication,
      ).to.be.true;
      expect(
        removalSummary({
          ...base,
          deletedSubNetworks: new Set([station]),
          deleteCommunication: true,
        }).deleteCommunication,
      ).to.be.false;
    });

    it('reports retained Communication when deletion was not chosen', () => {
      const doc = parse();
      const [station, process] = Array.from(doc.querySelectorAll('SubNetwork'));
      const summary = removalSummary({
        ieds: [doc.querySelector('IED')!],
        hasBoundLNodes: false,
        preserveLNodes: true,
        communication: doc.querySelector(':root > Communication'),
        affectedSubNetworks: [station, process],
        deletedSubNetworks: new Set([station, process]),
        deleteCommunication: false,
      });

      expect(summary.retainCommunication).to.be.true;
      expect(summary.deleteCommunication).to.be.false;
    });
  });
});
