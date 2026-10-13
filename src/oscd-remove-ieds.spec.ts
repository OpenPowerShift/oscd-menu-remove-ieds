import { expect, fixture, html } from '@open-wc/testing';
import { LitElement } from 'lit';

import { XMLEditor } from '@openscd/oscd-editor';

import type { EditDetailV2 } from '@openscd/oscd-api';
import type { OscdSelectionList } from '@omicronenergy/oscd-ui/selection-list/OscdSelectionList.js';
import { OscdFilledButton } from '@omicronenergy/oscd-ui/button/OscdFilledButton.js';
import { OscdCheckbox } from '@omicronenergy/oscd-ui/checkbox/OscdCheckbox.js';
import { testDocs, parseDoc } from './oscd-remove-ieds.testfiles.js';
import OscdRemoveIEDs from './oscd-remove-ieds.js';

customElements.define('oscd-remove-ieds', OscdRemoveIEDs);

function getIedNames(doc: XMLDocument): string[] {
  return Array.from(doc.querySelectorAll('IED')).map(
    ied => ied.getAttribute('name')!,
  );
}

const lNodeKey = (ln: Element): string =>
  JSON.stringify(
    ['lnInst', 'lnClass', 'ldInst', 'prefix'].map(
      attribute => ln.getAttribute(attribute) ?? '',
    ),
  );

function expectLNodesReferencedByBothIEDs(doc: XMLDocument): void {
  expect(getIedNames(doc)).to.have.members(['IED1', 'IED2']);
  const lnodes = Array.from(
    doc.querySelectorAll('ConductingEquipment[name="QA1"] > LNode'),
  );
  const ied1Refs = lnodes.filter(ln => ln.getAttribute('iedName') === 'IED1');
  const ied2Refs = lnodes.filter(ln => ln.getAttribute('iedName') === 'IED2');
  expect(ied1Refs.length).to.be.greaterThan(0);
  expect(ied2Refs.map(lNodeKey)).to.have.members(ied1Refs.map(lNodeKey));

  const boundKeys = new Set(ied1Refs.map(lNodeKey));
  const unbound = lnodes.filter(ln => ln.getAttribute('iedName') === 'None');
  expect(unbound).to.have.lengthOf(2);
  expect(unbound.filter(ln => boundKeys.has(lNodeKey(ln)))).to.have.lengthOf(1);
  expect(unbound.filter(ln => !boundKeys.has(lNodeKey(ln)))).to.have.lengthOf(1);
  expect(lnodes).to.have.lengthOf(ied1Refs.length + ied2Refs.length + unbound.length);
}

describe('oscd-remove-ieds', () => {
  let oscdRemoveIedsPlugin: OscdRemoveIEDs & LitElement;
  let doc: XMLDocument;
  let docVersion = 0;

  const editor = new XMLEditor();

  const selectAndRemoveAllIEDs = async (sclDoc: XMLDocument) => {
    let version = 0;
    const plugin: OscdRemoveIEDs & LitElement = await fixture(
      html`<oscd-remove-ieds .doc=${sclDoc} .docVersion=${version}></oscd-remove-ieds>`,
    );
    const sclEditor = new XMLEditor();

    plugin.addEventListener('oscd-edit-v2', (event: Event) => {
      const { edit, title, squash } = (event as CustomEvent<EditDetailV2>)
        .detail;
      sclEditor.commit(edit, { title, squash });
      plugin.docVersion = ++version;
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
      expect(dialog!.querySelector('[slot="headline"]')?.textContent).to.equal(
        'Remove IEDs',
      );
      expect(dialog!.querySelector('[slot="content"] p')?.textContent).to.contain(
        'Select the IEDs to remove from this SCL document.',
      );
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

    it('renders a Cancel text button and a filled Remove IEDs button', () => {
      const buttons =
        oscdRemoveIedsPlugin.shadowRoot!.querySelectorAll('[slot="actions"] > *');
      expect(buttons[0].tagName).to.equal('OSCD-TEXT-BUTTON');
      expect(buttons[0].textContent?.trim()).to.equal('Cancel');
      expect(buttons[1]).to.be.instanceOf(OscdFilledButton);
      expect(buttons[1].textContent?.trim()).to.equal('Remove IEDs');
    });

    it('enables removal only while IEDs are selected without clearing the selection', async () => {
      const button = oscdRemoveIedsPlugin.shadowRoot!.querySelector(
        'oscd-filled-button',
      );
      expect(button).to.be.instanceOf(OscdFilledButton);
      if (!(button instanceof OscdFilledButton)) {
        throw new Error('Remove IEDs button did not upgrade');
      }
      const list = oscdRemoveIedsPlugin.selectionList;
      await list.updateComplete;
      expect(button.disabled).to.be.true;

      const item = list.shadowRoot!.querySelector('oscd-list-item')!;
      item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await oscdRemoveIedsPlugin.updateComplete;
      expect(button.disabled).to.be.false;
      expect(list.selectedElements).to.have.lengthOf(1);

      item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await oscdRemoveIedsPlugin.updateComplete;
      expect(button.disabled).to.be.true;

      item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await oscdRemoveIedsPlugin.updateComplete;
      oscdRemoveIedsPlugin.clearSelection();
      await oscdRemoveIedsPlugin.updateComplete;
      expect(button.disabled).to.be.true;
      expect(list.selectedElements).to.have.lengthOf(0);
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
      docVersion = 0;
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
      oscdRemoveIedsPlugin.docVersion = ++docVersion;
      await oscdRemoveIedsPlugin.updateComplete;

      expect(oscdRemoveIedsPlugin.doc).to.equal(doc);
      expect(selectionList.items).to.have.lengthOf(1);
      expect(selectionList.items[0].attachedElement).to.equal(
        doc.querySelector('IED[name="SUB_A"]'),
      );

      sclEditor.undo();
      oscdRemoveIedsPlugin.docVersion = ++docVersion;
      await oscdRemoveIedsPlugin.updateComplete;

      expect(oscdRemoveIedsPlugin.doc).to.equal(doc);
      expect(selectionList.items).to.have.lengthOf(2);
      expect(selectionList.items.map(item => item.attachedElement)).to.deep.equal(
        Array.from(doc.querySelectorAll('IED')),
      );
    });
  });

  describe('LNode removal option', () => {
    let removeLNodesCheckbox: OscdCheckbox;
    let sclEditor: XMLEditor;

    const setIEDSelected = async (name: string, selected: boolean) => {
      const list = oscdRemoveIedsPlugin.selectionList;
      await list.updateComplete;
      const index = list.items.findIndex(
        item => item.attachedElement?.getAttribute('name') === name,
      );
      expect(index, `IED "${name}" must be present in the selection list`).to.be.at.least(0);
      if (list.items[index].selected !== selected) {
        list.shadowRoot!.querySelectorAll('oscd-list-item')[index].dispatchEvent(
          new MouseEvent('click', { bubbles: true }),
        );
      }
      await oscdRemoveIedsPlugin.updateComplete;
      expect(list.items[index].selected).to.equal(selected);
    };

    const selectIED = (name: string) => setIEDSelected(name, true);
    const deselectIED = (name: string) => setIEDSelected(name, false);

    const setRemoveLNodesCheckboxSelected = async (selected: boolean) => {
      await removeLNodesCheckbox.updateComplete;
      expect(removeLNodesCheckbox.disabled).to.be.false;
      if (removeLNodesCheckbox.checked !== selected) {
        removeLNodesCheckbox.click();
      }
      await oscdRemoveIedsPlugin.updateComplete;
      expect(removeLNodesCheckbox.checked).to.equal(selected);
    };

    const selectRemoveLNodesCheckbox = () => setRemoveLNodesCheckboxSelected(true);
    const deselectRemoveLNodesCheckbox = () => setRemoveLNodesCheckboxSelected(false);

    beforeEach(async () => {
      doc = parseDoc(testDocs.duplicateLNodes);
      docVersion = 0;
      expectLNodesReferencedByBothIEDs(doc);
      sclEditor = new XMLEditor();
      oscdRemoveIedsPlugin = await fixture(
        html`<oscd-remove-ieds .doc=${doc} .docVersion=${docVersion}></oscd-remove-ieds>`,
      );
      oscdRemoveIedsPlugin.addEventListener('oscd-edit-v2', (event: Event) => {
        const { edit, title, squash } = (event as CustomEvent<EditDetailV2>).detail;
        sclEditor.commit(edit, { title, squash });
        oscdRemoveIedsPlugin.docVersion = ++docVersion;
      });
      const element = oscdRemoveIedsPlugin.shadowRoot!.querySelector('#remove-lnodes');
      expect(element).to.be.instanceOf(OscdCheckbox);
      if (!(element instanceof OscdCheckbox)) {
        throw new Error('LNode checkbox did not upgrade');
      }
      removeLNodesCheckbox = element;
      await removeLNodesCheckbox.updateComplete;
    });

    it('starts unchecked and disabled, and preserves selection when toggled', async () => {
      expect(removeLNodesCheckbox.checked).to.be.false;
      expect(removeLNodesCheckbox.disabled).to.be.true;
      await selectIED('IED1');
      expect(removeLNodesCheckbox.disabled).to.be.false;
      const selected = oscdRemoveIedsPlugin.selectionList.selectedElements;
      await selectRemoveLNodesCheckbox();
      expect(removeLNodesCheckbox.checked).to.be.true;
      expect(oscdRemoveIedsPlugin.selectionList.selectedElements).to.deep.equal(selected);
      await deselectRemoveLNodesCheckbox();
      expect(removeLNodesCheckbox.checked).to.be.false;
      expect(oscdRemoveIedsPlugin.selectionList.selectedElements).to.deep.equal(selected);
    });

    it('deletes only selected IED bindings when checked, and undo restores them', async () => {
      const before = Array.from(doc.querySelectorAll('LNode'));
      const affected = before.filter(ln => ln.getAttribute('iedName') === 'IED1');
      const unaffected = before.filter(ln => ln.getAttribute('iedName') !== 'IED1');
      const original = new XMLSerializer().serializeToString(doc);
      expect(affected.length).to.be.greaterThan(0);
      expect(unaffected.length).to.be.greaterThan(0);
      await selectIED('IED1');
      await selectRemoveLNodesCheckbox();
      await oscdRemoveIedsPlugin.removeIEDs();
      expect(doc.querySelectorAll('IED[name="IED1"]')).to.have.lengthOf(0);
      expect(doc.querySelectorAll('LNode[iedName="IED1"]')).to.have.lengthOf(0);
      expect(doc.querySelectorAll('LNode')).to.have.lengthOf(before.length - affected.length);
      expect(Array.from(doc.querySelectorAll('LNode'))).to.deep.equal(unaffected);
      sclEditor.undo();
      expect(new XMLSerializer().serializeToString(doc)).to.equal(original);
    });

    it('preserves affected bindings by default and leaves unrelated bindings unchanged', async () => {
      const affected = Array.from(doc.querySelectorAll('LNode[iedName="IED1"]'));
      const unaffected = Array.from(doc.querySelectorAll('LNode[iedName="IED2"]'));
      const unbound = Array.from(doc.querySelectorAll('LNode[iedName="None"]'));
      const unboundKeys = new Set(unbound.map(lNodeKey));
      const preserved = affected.filter(ln => !unboundKeys.has(lNodeKey(ln)));
      const original = new XMLSerializer().serializeToString(doc);
      await selectIED('IED1');
      await oscdRemoveIedsPlugin.removeIEDs();
      expect(doc.querySelectorAll('LNode')).to.have.lengthOf(preserved.length + unaffected.length + unbound.length);
      expect(Array.from(doc.querySelectorAll('LNode[iedName="None"]'))).to.have.members([...preserved, ...unbound]);
      expect(Array.from(doc.querySelectorAll('LNode[iedName="IED2"]'))).to.deep.equal(unaffected);
      expect(doc.querySelectorAll('LNode[iedName="IED1"]')).to.have.lengthOf(0);
      sclEditor.undo();
      expect(new XMLSerializer().serializeToString(doc)).to.equal(original);
    });

    it('uses deletion mode for every selected IED despite docVersion updates', async () => {
      const unbound = Array.from(doc.querySelectorAll('LNode[iedName="None"]'));
      await selectIED('IED1');
      await selectIED('IED2');
      await selectRemoveLNodesCheckbox();
      await oscdRemoveIedsPlugin.removeIEDs();
      expect(doc.querySelectorAll('IED')).to.have.lengthOf(0);
      expect(Array.from(doc.querySelectorAll('LNode'))).to.deep.equal(unbound);
    });

    it('preserves existing unbound LNodes when removing matching bound IEDs', async () => {
      const unbound = Array.from(doc.querySelectorAll('LNode[iedName="None"]'));
      const snapshots = unbound.map(ln => ln.outerHTML);
      await selectIED('IED1');
      await selectIED('IED2');
      await oscdRemoveIedsPlugin.removeIEDs();
      expect(Array.from(doc.querySelectorAll('LNode'))).to.include.members(unbound);
      expect(unbound.map(ln => ln.outerHTML)).to.deep.equal(snapshots);
    });

    it('refreshes binding availability after edits and undo on the same document', async () => {
      sclEditor.commit(
        Array.from(doc.querySelectorAll('LNode[iedName="IED1"]')).map(node => ({ node })),
      );
      oscdRemoveIedsPlugin.docVersion = ++docVersion;
      await oscdRemoveIedsPlugin.updateComplete;
      await selectIED('IED1');
      expect(removeLNodesCheckbox.disabled).to.be.true;
      sclEditor.undo();
      oscdRemoveIedsPlugin.docVersion = ++docVersion;
      await oscdRemoveIedsPlugin.updateComplete;
      await selectIED('IED1');
      expect(removeLNodesCheckbox.disabled).to.be.false;
    });

    it('disables and resets for unbound selections but enables for mixed selections', async () => {
      sclEditor.commit(
        Array.from(doc.querySelectorAll('LNode[iedName="IED2"]')).map(node => ({ node })),
      );
      oscdRemoveIedsPlugin.docVersion = ++docVersion;
      await oscdRemoveIedsPlugin.updateComplete;
      await selectIED('IED2');
      expect(removeLNodesCheckbox.disabled).to.be.true;
      await selectIED('IED1');
      expect(removeLNodesCheckbox.disabled).to.be.false;
      await selectRemoveLNodesCheckbox();
      expect(removeLNodesCheckbox.checked).to.be.true;
      await deselectIED('IED1');
      expect(removeLNodesCheckbox.disabled).to.be.true;
      expect(removeLNodesCheckbox.checked).to.be.false;
      await deselectIED('IED2');
      expect(removeLNodesCheckbox.disabled).to.be.true;
      expect(removeLNodesCheckbox.checked).to.be.false;
    });

    it('resets to unchecked whenever the dialog opens', async () => {
      await selectIED('IED1');
      await selectRemoveLNodesCheckbox();
      expect(removeLNodesCheckbox.checked).to.be.true;
      await oscdRemoveIedsPlugin.run();
      expect(removeLNodesCheckbox.checked).to.be.false;
      await oscdRemoveIedsPlugin.dialogUI.close();
      await selectRemoveLNodesCheckbox();
      expect(removeLNodesCheckbox.checked).to.be.true;
      await oscdRemoveIedsPlugin.run();
      expect(removeLNodesCheckbox.checked).to.be.false;
      await oscdRemoveIedsPlugin.dialogUI.close();
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
    let expectedKeysByContainer: Map<Element, Set<string>>;

    beforeEach(() => {
      sclDoc = parseDoc(testDocs.duplicateLNodes);
      expectLNodesReferencedByBothIEDs(sclDoc);
      const containers = Array.from(
        sclDoc.querySelectorAll(
          'ConductingEquipment, Function, SubFunction, ' +
            'EqFunction, EqSubFunction, GeneralEquipment',
        ),
      );
      expectedKeysByContainer = new Map(
        containers.map(container => [
          container,
          new Set(
            Array.from(container.querySelectorAll(':scope > LNode')).map(
              lNodeKey,
            ),
          ),
        ]),
      );
    });

    it('sets LNode iedName to None after removing IEDs', async () => {
      const unbound = Array.from(sclDoc.querySelectorAll('LNode[iedName="None"]'));
      const snapshots = unbound.map(ln => ln.outerHTML);
      await selectAndRemoveAllIEDs(sclDoc);

      expect(sclDoc.querySelectorAll('IED')).to.have.lengthOf(0);
      expect(Array.from(sclDoc.querySelectorAll('LNode'))).to.include.members(unbound);
      expect(unbound.map(ln => ln.outerHTML)).to.deep.equal(snapshots);
      for (const [container, expectedKeys] of expectedKeysByContainer) {
        const lnodes = Array.from(
          container.querySelectorAll(':scope > LNode'),
        );
        expect(lnodes).to.have.lengthOf(expectedKeys.size);
        expect(lnodes.map(lNodeKey)).to.have.members([...expectedKeys]);
        for (const ln of lnodes) {
          expect(ln.getAttribute('iedName')).to.equal('None');
        }
      }
    });

    it('preserves unique LNodes across separate removals with a refresh between them', async () => {
      const unbound = Array.from(sclDoc.querySelectorAll('LNode[iedName="None"]'));
      const snapshots = unbound.map(ln => ln.outerHTML);
      const original = new XMLSerializer().serializeToString(sclDoc);
      let version = 0;
      const plugin: OscdRemoveIEDs = await fixture(
        html`<oscd-remove-ieds .doc=${sclDoc} .docVersion=${version}></oscd-remove-ieds>`,
      );
      const sclEditor = new XMLEditor();
      plugin.addEventListener('oscd-edit-v2', (event: Event) => {
        const { edit, title, squash } = (event as CustomEvent<EditDetailV2>).detail;
        sclEditor.commit(edit, { title, squash });
        plugin.docVersion = ++version;
      });

      for (const name of ['IED1', 'IED2']) {
        const list = plugin.selectionList;
        await list.updateComplete;
        const index = list.items.findIndex(
          item => item.attachedElement?.getAttribute('name') === name,
        );
        expect(index).to.be.at.least(0);
        list.shadowRoot!.querySelectorAll('oscd-list-item')[index].dispatchEvent(
          new MouseEvent('click', { bubbles: true }),
        );
        await plugin.updateComplete;
        expect(list.selectedElements.map(ied => ied.getAttribute('name'))).to.deep.equal([name]);
        await plugin.removeIEDs();
        await plugin.updateComplete;
        expect(list.items.map(item => item.attachedElement)).to.deep.equal(
          Array.from(sclDoc.querySelectorAll('IED')),
        );
        if (name === 'IED1') {
          expect(sclDoc.querySelectorAll('LNode[iedName="IED1"]')).to.have.lengthOf(0);
          expect(sclDoc.querySelectorAll('LNode[iedName="IED2"]').length).to.be.greaterThan(0);
        }
      }

      for (const [container, expectedKeys] of expectedKeysByContainer) {
        const lnodes = Array.from(container.querySelectorAll(':scope > LNode'));
        expect(lnodes).to.have.lengthOf(expectedKeys.size);
        expect(lnodes.map(lNodeKey)).to.have.members([...expectedKeys]);
        for (const ln of lnodes) {
          expect(ln.getAttribute('iedName')).to.equal('None');
        }
      }
      expect(Array.from(sclDoc.querySelectorAll('LNode'))).to.include.members(unbound);
      expect(unbound.map(ln => ln.outerHTML)).to.deep.equal(snapshots);
      expect(sclEditor.past).to.have.lengthOf(2);
      sclEditor.undo();
      expect(getIedNames(sclDoc)).to.deep.equal(['IED2']);
      sclEditor.undo();
      expect(new XMLSerializer().serializeToString(sclDoc)).to.equal(original);
    });

    it('should not create duplicate LNode key sequences within ConductingEquipment', async () => {
      await selectAndRemoveAllIEDs(sclDoc);

      for (const [container, expectedKeys] of expectedKeysByContainer) {
        const lnodes = container.querySelectorAll(':scope > LNode');
        expect(lnodes).to.have.lengthOf(expectedKeys.size);
        const keys = new Set<string>();

        for (const ln of Array.from(lnodes)) {
          const key = lNodeKey(ln);

          expect(
            keys.has(key),
            `Duplicate LNode key [${key}] in ` +
              `<${container.tagName} name="${container.getAttribute(
                'name',
              )}"> — ` +
              'violates uniqueLNodeInFuncForCE constraint',
          ).to.be.false;

          keys.add(key);
        }
        expect([...keys]).to.have.members([...expectedKeys]);
      }
    });
  });
});
