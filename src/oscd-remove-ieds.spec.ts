import { expect, fixture, html } from '@open-wc/testing';
import { LitElement } from 'lit';

import { XMLEditor } from '@openscd/oscd-editor';

import type { EditDetailV2 } from '@openscd/oscd-api';
import type { OscdSelectionList } from '@omicronenergy/oscd-ui/selection-list/OscdSelectionList.js';
import { testDocs, parseDoc } from './oscd-remove-ieds.testfiles.js';
import OscdRemoveIEDs from './oscd-remove-ieds.js';

customElements.define('oscd-remove-ieds', OscdRemoveIEDs);

function getIedNames(doc: XMLDocument): string[] {
  return Array.from(doc.querySelectorAll('IED')).map(
    ied => ied.getAttribute('name')!,
  );
}

describe('oscd-remove-ieds', () => {
  let oscdRemoveIedsPlugin: OscdRemoveIEDs & LitElement;
  let doc: XMLDocument;
  let docVersion = 0;

  const editor = new XMLEditor();

  const selectAndRemoveAllIEDs = async (sclDoc: XMLDocument) => {
    const plugin: OscdRemoveIEDs & LitElement = await fixture(
      html`<oscd-remove-ieds .doc=${sclDoc}></oscd-remove-ieds>`,
    );
    const sclEditor = new XMLEditor();

    plugin.addEventListener('oscd-edit-v2', (event: Event) => {
      const { edit, title, squash } = (event as CustomEvent<EditDetailV2>)
        .detail;
      sclEditor.commit(edit, { title, squash });
    });
    await plugin.updateComplete;

    plugin.selectionList.items = plugin.selectionList.items.map(item => ({
      ...item,
      selected: true,
    }));
    await plugin.removeIEDs();
  };

  describe('with multiple IEDs', () => {
    beforeEach(async () => {
      doc = parseDoc(testDocs.multipleIEDs);
      oscdRemoveIedsPlugin = await fixture(
        html`<oscd-remove-ieds
          .doc=${doc}
          .docVersion=${docVersion}
        ></oscd-remove-ieds>`,
      );

      oscdRemoveIedsPlugin.addEventListener('oscd-edit-v2', (e: Event) => {
        const { edit, title, squash } = (e as CustomEvent<EditDetailV2>).detail;
        editor.commit(edit, { title, squash });
        docVersion++;
        oscdRemoveIedsPlugin.docVersion = docVersion;
      });
      await oscdRemoveIedsPlugin.updateComplete;
    });

    it('renders the dialog element', () => {
      const dialog =
        oscdRemoveIedsPlugin.shadowRoot!.querySelector('#selection-dialog');
      expect(dialog).to.exist;
    });

    it('renders the selection list', () => {
      const selectionList =
        oscdRemoveIedsPlugin.shadowRoot!.querySelector('#selection-list');
      expect(selectionList).to.exist;
    });

    it('lists all IEDs from the document', () => {
      const selectionList = oscdRemoveIedsPlugin.shadowRoot!.querySelector(
        '#selection-list',
      ) as OscdSelectionList;
      expect(selectionList).to.exist;

      const iedNames = getIedNames(doc);
      expect(iedNames).to.have.lengthOf(2);
      expect(iedNames).to.include('PUB_A');
      expect(iedNames).to.include('SUB_A');
    });

    it('includes IED description in list items', () => {
      const selectionList = oscdRemoveIedsPlugin.shadowRoot!.querySelector(
        '#selection-list',
      ) as OscdSelectionList;

      const pubItem = selectionList.items.find(item =>
        item.headline.includes('PUB_A'),
      );
      expect(pubItem).to.exist;
      expect(pubItem!.headline).to.contain('ABB');
      expect(pubItem!.headline).to.contain('REL670');
      expect(pubItem!.supportingText).to.contain('Publisher A');
      expect(pubItem!.supportingText).to.contain('1.0');
    });

    it('renders Close and Remove IEDs buttons', () => {
      const buttons =
        oscdRemoveIedsPlugin.shadowRoot!.querySelectorAll('oscd-text-button');
      const buttonLabels = Array.from(buttons).map(
        btn => btn.textContent?.trim(),
      );
      expect(buttonLabels).to.include('Close');
      expect(buttonLabels).to.include('Remove IEDs');
    });

    it('dispatches oscd-edit-v2 events when removing IEDs', async () => {
      const editEvents: Event[] = [];
      oscdRemoveIedsPlugin.addEventListener('oscd-edit-v2', (e: Event) => {
        editEvents.push(e);
      });

      const selectionList = oscdRemoveIedsPlugin.shadowRoot!.querySelector(
        '#selection-list',
      ) as OscdSelectionList;
      const iedToRemove = doc.querySelector('IED[name="PUB_A"]')!;

      Object.defineProperty(selectionList, 'selectedElements', {
        get: () => [iedToRemove],
        configurable: true,
      });

      await oscdRemoveIedsPlugin.removeIEDs();

      expect(editEvents.length).to.equal(1);
    });
  });

  describe('with a single IED', () => {
    beforeEach(async () => {
      doc = parseDoc(testDocs.singleIED);
      oscdRemoveIedsPlugin = await fixture(
        html`<oscd-remove-ieds
          .doc=${doc}
          .docVersion=${docVersion}
        ></oscd-remove-ieds>`,
      );
      await oscdRemoveIedsPlugin.updateComplete;
    });

    it('lists the single IED', () => {
      const selectionList = oscdRemoveIedsPlugin.shadowRoot!.querySelector(
        '#selection-list',
      ) as OscdSelectionList;

      expect(selectionList.items).to.have.lengthOf(1);
      expect(selectionList.items[0].headline).to.contain('IED1');
      expect(selectionList.items[0].headline).to.contain('OpenSCD');
      expect(selectionList.items[0].headline).to.contain('Virtual');
      expect(selectionList.items[0].supportingText).to.contain('Test IED');
    });
  });

  describe('with no IEDs', () => {
    beforeEach(async () => {
      doc = parseDoc(testDocs.noIEDs);
      oscdRemoveIedsPlugin = await fixture(
        html`<oscd-remove-ieds
          .doc=${doc}
          .docVersion=${docVersion}
        ></oscd-remove-ieds>`,
      );
      await oscdRemoveIedsPlugin.updateComplete;
    });

    it('renders the dialog with an empty selection list', () => {
      const selectionList = oscdRemoveIedsPlugin.shadowRoot!.querySelector(
        '#selection-list',
      ) as OscdSelectionList;

      expect(selectionList).to.exist;
      expect(selectionList.items).to.have.lengthOf(0);
    });
  });

  describe('docVersion reactivity', () => {
    it('refreshes the IED list after an edit and undo on the same document', async () => {
      doc = parseDoc(testDocs.multipleIEDs);
      oscdRemoveIedsPlugin = await fixture(
        html`<oscd-remove-ieds .doc=${doc} .docVersion=${0}></oscd-remove-ieds>`,
      );
      await oscdRemoveIedsPlugin.updateComplete;

      const selectionList = oscdRemoveIedsPlugin.selectionList;
      const iedToRemove = doc.querySelector('IED[name="PUB_A"]')!;
      const sclEditor = new XMLEditor();

      expect(selectionList.items.map(item => item.attachedElement)).to.deep.equal(
        Array.from(doc.querySelectorAll('IED')),
      );

      sclEditor.commit({ node: iedToRemove });
      oscdRemoveIedsPlugin.docVersion = Symbol('edit');
      await oscdRemoveIedsPlugin.updateComplete;

      expect(oscdRemoveIedsPlugin.doc).to.equal(doc);
      expect(selectionList.items).to.have.lengthOf(1);
      expect(selectionList.items[0].attachedElement).to.equal(
        doc.querySelector('IED[name="SUB_A"]'),
      );

      sclEditor.undo();
      oscdRemoveIedsPlugin.docVersion = Symbol('undo');
      await oscdRemoveIedsPlugin.updateComplete;

      expect(oscdRemoveIedsPlugin.doc).to.equal(doc);
      expect(selectionList.items).to.have.lengthOf(2);
      expect(selectionList.items.map(item => item.attachedElement)).to.deep.equal(
        Array.from(doc.querySelectorAll('IED')),
      );
    });
  });

  describe('SCL validity: empty SubNetwork after removing all IEDs', () => {
    let sclDoc: XMLDocument;

    beforeEach(() => {
      sclDoc = parseDoc(testDocs.emptySubNetwork);
    });

    it('has two IEDs and a SubNetwork with ConnectedAPs before removal', () => {
      expect(sclDoc.querySelectorAll('IED').length).to.equal(2);
      expect(sclDoc.querySelectorAll('ConnectedAP').length).to.equal(2);
      expect(sclDoc.querySelectorAll('SubNetwork').length).to.equal(1);
    });

    it('removes all IEDs and their ConnectedAPs', async () => {
      await selectAndRemoveAllIEDs(sclDoc);
      expect(sclDoc.querySelectorAll('IED').length).to.equal(0);
      expect(sclDoc.querySelectorAll('ConnectedAP').length).to.equal(0);
    });

  });

  describe('SCL validity: duplicate LNodes after removing IEDs', () => {
    let sclDoc: XMLDocument;

    beforeEach(() => {
      sclDoc = parseDoc(testDocs.duplicateLNodes);
    });

    it('has two IEDs with LNodes referencing them before removal', () => {
      expect(sclDoc.querySelectorAll('IED').length).to.equal(2);
      const lnodes = sclDoc.querySelectorAll('ConductingEquipment > LNode');
      expect(lnodes.length).to.equal(6);

      const ied1Refs = sclDoc.querySelectorAll('LNode[iedName="IED1"]');
      const ied2Refs = sclDoc.querySelectorAll('LNode[iedName="IED2"]');
      expect(ied1Refs.length).to.equal(3);
      expect(ied2Refs.length).to.equal(3);
    });

    it('sets LNode iedName to None after removing IEDs', async () => {
      await selectAndRemoveAllIEDs(sclDoc);

      const lnodes = sclDoc.querySelectorAll('ConductingEquipment > LNode');
      for (const ln of Array.from(lnodes)) {
        expect(ln.getAttribute('iedName')).to.equal('None');
      }
    });

  });
});
