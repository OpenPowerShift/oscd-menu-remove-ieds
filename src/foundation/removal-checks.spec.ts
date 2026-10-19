import { expect } from '@open-wc/testing';
import { XMLEditor } from '@openscd/oscd-editor';

import { checkForEmptyCommunicationContainers } from './removal-checks.js';
import { parseDoc, testDocs } from '../oscd-menu-remove-ieds.testfiles.js';

describe('checking for empty communication containers', () => {
  it('requires the combined selection to remove every connection', () => {
    const doc = parseDoc(testDocs.emptySubNetwork);
    const ieds = Array.from(doc.querySelectorAll('IED'));
    expect(ieds).to.have.lengthOf(2);
    expect(doc.querySelectorAll('ConnectedAP')).to.have.lengthOf(2);
    expect(checkForEmptyCommunicationContainers(doc, [ieds[0]]).subNetworks).to.have.lengthOf(0);
    const result = checkForEmptyCommunicationContainers(doc, ieds);
    expect(result.subNetworks).to.deep.equal([doc.querySelector('SubNetwork')]);
    expect(result.communication).to.equal(doc.querySelector('Communication'));
  });

  it('ignores an empty selection and documents without Communication', () => {
    const doc = parseDoc(testDocs.emptySubNetwork);
    expect(checkForEmptyCommunicationContainers(doc, []).subNetworks).to.have.lengthOf(0);
    expect(checkForEmptyCommunicationContainers(
      parseDoc(testDocs.noIEDs), [],
    )).to.deep.equal({ subNetworks: [], communication: null });
  });

  it('distinguishes affected networks from networks with surviving connections', () => {
    const doc = parseDoc(testDocs.communicationChoices);
    const ieds = Array.from(doc.querySelectorAll('IED'));
    expect(ieds).to.have.lengthOf(3);
    const result = checkForEmptyCommunicationContainers(doc, ieds.slice(0, 2));
    expect(result.subNetworks.map(network => network.getAttribute('name'))).to.deep.equal(['StationBus']);
    expect(result.communication).to.equal(null);
    expect(checkForEmptyCommunicationContainers(doc, ieds).subNetworks).to.have.lengthOf(2);
  });

  it('leaves pre-existing empty networks and private extension contents alone', () => {
    const doc = parseDoc(testDocs.communicationChoices);
    const empty = doc.querySelector('Private SubNetwork')!;
    expect(empty).to.exist;
    expect(empty.querySelectorAll('ConnectedAP')).to.have.lengthOf(0);
    const result = checkForEmptyCommunicationContainers(
      doc, Array.from(doc.querySelectorAll(':root > IED')),
    );
    expect(result.subNetworks).not.to.include(empty);
    expect(result.subNetworks).to.have.lengthOf(2);
    const stationBus = doc.querySelector('Communication > SubNetwork[name="StationBus"]')!;
    const editor = new XMLEditor();
    editor.commit(
      Array.from(stationBus.querySelectorAll(':scope > ConnectedAP')).map(node => ({ node })),
    );
    const after = checkForEmptyCommunicationContainers(
      doc, Array.from(doc.querySelectorAll(':root > IED')),
    );
    expect(after.subNetworks).not.to.include(stationBus);
    expect(after.subNetworks.map(network => network.getAttribute('name'))).to.deep.equal(['ProcessBus']);
    expect(after.communication).to.equal(null);
  });
});
