import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import { LitElement } from 'lit';
import { setViewport } from '@web/test-runner-commands';

import { XMLEditor } from '@openscd/oscd-editor';

import type { EditDetailV2 } from '@openscd/oscd-api';
import type { OscdSelectionList } from '@omicronenergy/oscd-ui/selection-list/OscdSelectionList.js';
import { OscdFilledButton } from '@omicronenergy/oscd-ui/button/OscdFilledButton.js';
import { OscdCheckbox } from '@omicronenergy/oscd-ui/checkbox/OscdCheckbox.js';
import { OscdAceEditor } from '@omicronenergy/oscd-ui/ace-editor/OscdAceEditor.js';
import { OscdDialog } from '@omicronenergy/oscd-ui/dialog/OscdDialog.js';
import { OscdIcon } from '@omicronenergy/oscd-ui/icon/OscdIcon.js';
import { OscdTextButton } from '@omicronenergy/oscd-ui/button/OscdTextButton.js';
import { testDocs, parseDoc } from './oscd-menu-remove-ieds.testfiles.js';
import OscdMenuRemoveIeds from './oscd-menu-remove-ieds.js';
import OscdRemovalConfirmation from './oscd-removal-confirmation.js';

customElements.define('oscd-menu-remove-ieds', OscdMenuRemoveIeds);

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

describe('oscd-menu-remove-ieds', () => {
  let oscdRemoveIedsPlugin: OscdMenuRemoveIeds & LitElement;
  let doc: XMLDocument;
  let docVersion = 0;

  const editor = new XMLEditor();

  const selectAndRemoveAllIEDs = async (sclDoc: XMLDocument) => {
    let version = 0;
    const plugin: OscdMenuRemoveIeds & LitElement = await fixture(
      html`<oscd-menu-remove-ieds .doc=${sclDoc} .docVersion=${version}></oscd-menu-remove-ieds>`,
    );
    const sclEditor = new XMLEditor();

    plugin.addEventListener('oscd-edit-v2', (event: Event) => {
      const { edit, title, squash } = (event as CustomEvent<EditDetailV2>)
        .detail;
      sclEditor.commit(edit, { title, squash });
      plugin.docVersion = ++version;
    });
    await plugin.updateComplete;

    await plugin.selectionList.updateComplete;
    for (const item of plugin.selectionList.shadowRoot!.querySelectorAll('oscd-list-item')) {
      item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
    await plugin.updateComplete;
    await plugin.removeIEDs();
  };

  describe('with multiple IEDs', () => {
    beforeEach(async () => {
      doc = parseDoc(testDocs.multipleIEDs);
      oscdRemoveIedsPlugin = await fixture(
        html`<oscd-menu-remove-ieds
          .doc=${doc}
          .docVersion=${docVersion}
        ></oscd-menu-remove-ieds>`,
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

    it('renders a Cancel text button and a filled Remove button', () => {
      const buttons =
        oscdRemoveIedsPlugin.shadowRoot!.querySelectorAll('[slot="actions"] > *');
      expect(buttons[0].tagName).to.equal('OSCD-TEXT-BUTTON');
      expect(buttons[0].textContent?.trim()).to.equal('Cancel');
      expect(buttons[1]).to.be.instanceOf(OscdFilledButton);
      expect(buttons[1].textContent?.trim()).to.equal('Remove');
    });

    it('enables removal only while IEDs are selected without clearing the selection', async () => {
      const button = oscdRemoveIedsPlugin.shadowRoot!.querySelector(
        'oscd-filled-button',
      );
      expect(button).to.be.instanceOf(OscdFilledButton);
      if (!(button instanceof OscdFilledButton)) {
        throw new Error('Remove button did not upgrade');
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
        html`<oscd-menu-remove-ieds
          .doc=${doc}
          .docVersion=${docVersion}
        ></oscd-menu-remove-ieds>`,
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
        html`<oscd-menu-remove-ieds
          .doc=${doc}
          .docVersion=${docVersion}
        ></oscd-menu-remove-ieds>`,
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
        html`<oscd-menu-remove-ieds .doc=${doc} .docVersion=${0}></oscd-menu-remove-ieds>`,
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
        html`<oscd-menu-remove-ieds .doc=${doc} .docVersion=${docVersion}></oscd-menu-remove-ieds>`,
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
      expect(removeLNodesCheckbox.parentElement!.hidden).to.be.true;
      await selectIED('IED1');
      expect(removeLNodesCheckbox.disabled).to.be.false;
      expect(removeLNodesCheckbox.parentElement!.hidden).to.be.false;
      expect(oscdRemoveIedsPlugin.selectionList.parentElement!.querySelector('.removal-options')?.contains(removeLNodesCheckbox)).to.be.true;
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
      expect(removeLNodesCheckbox.parentElement!.hidden).to.be.true;
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

  describe('communication removal choices', () => {
    let sclEditor: XMLEditor;

    const selectIEDs = async (...names: string[]) => {
      const list = oscdRemoveIedsPlugin.selectionList;
      await list.updateComplete;
      for (const name of names) {
        const index = list.items.findIndex(
          item => item.attachedElement?.getAttribute('name') === name,
        );
        expect(index, `IED "${name}" must exist`).to.be.at.least(0);
        list.shadowRoot!.querySelectorAll('oscd-list-item')[index].dispatchEvent(
          new MouseEvent('click', { bubbles: true }),
        );
        await oscdRemoveIedsPlugin.updateComplete;
      }
    };

    const selectCheckbox = async (selector: string) => {
      const checkbox = oscdRemoveIedsPlugin.shadowRoot!.querySelector(selector);
      if (!(checkbox instanceof OscdCheckbox)) {
        throw new Error(`Missing checkbox: ${selector}`);
      }
      await checkbox.updateComplete;
      checkbox.click();
      await oscdRemoveIedsPlugin.updateComplete;
      return checkbox;
    };

    const requestRemoval = async () => {
      const button = oscdRemoveIedsPlugin.shadowRoot!.querySelector('#selection-dialog > [slot="actions"] oscd-filled-button');
      if (!(button instanceof OscdFilledButton)) {
        throw new Error('Missing removal button');
      }
      button.click();
      const confirmation = oscdRemoveIedsPlugin.shadowRoot!.querySelector('#confirmation-dialog');
      if (!(confirmation instanceof OscdRemovalConfirmation)) {
        throw new Error('Missing removal confirmation');
      }
      await waitUntil(() => confirmation.open);
      return confirmation;
    };

    beforeEach(async () => {
      doc = parseDoc(testDocs.communicationChoices);
      expect(getIedNames(doc)).to.have.members(['IED1', 'IED2', 'IED3']);
      expect(doc.querySelectorAll('Communication > SubNetwork')).to.have.lengthOf(2);
      expect(doc.querySelectorAll('SubNetwork[name="StationBus"] > ConnectedAP')).to.have.lengthOf(3);
      expect(doc.querySelectorAll('SubNetwork[name="ProcessBus"] > ConnectedAP')).to.have.lengthOf(2);
      expect(doc.querySelector('Communication > Private')).to.exist;
      expect(doc.querySelector('SubNetwork[name="StationBus"] > Private')).to.exist;
      docVersion = 0;
      sclEditor = new XMLEditor();
      oscdRemoveIedsPlugin = await fixture(
        html`<oscd-menu-remove-ieds .doc=${doc} .docVersion=${docVersion}></oscd-menu-remove-ieds>`,
      );
      oscdRemoveIedsPlugin.addEventListener('oscd-edit-v2', (event: Event) => {
        const { edit, title, squash } = (event as CustomEvent<EditDetailV2>).detail;
        sclEditor.commit(edit, { title, squash });
        oscdRemoveIedsPlugin.docVersion = ++docVersion;
      });
    });

    it('shows only networks emptied by the combined selection, without changing the document', async () => {
      const original = doc.cloneNode(true);
      await selectIEDs('IED1');
      expect(oscdRemoveIedsPlugin.shadowRoot!.querySelectorAll('.delete-network')).to.have.lengthOf(0);
      await selectIEDs('IED2');
      const options = oscdRemoveIedsPlugin.shadowRoot!.querySelectorAll('.delete-network');
      expect(options).to.have.lengthOf(1);
      expect(options[0].parentElement?.textContent).to.contain('StationBus');
      expect(oscdRemoveIedsPlugin.shadowRoot!.querySelector('#delete-communication')).to.equal(null);
      expect(oscdRemoveIedsPlugin.shadowRoot!.querySelector('.warning-icon')).to.exist;
      expect(oscdRemoveIedsPlugin.shadowRoot!.querySelector('.removal-options .warning')).to.equal(null);
      expect(doc.isEqualNode(original)).to.be.true;
      expect(sclEditor.past).to.have.lengthOf(0);
    });

    it('keeps the choice area bounded without adding an outer dialog scrollbar', async () => {
      await selectIEDs('IED1', 'IED2', 'IED3');
      await oscdRemoveIedsPlugin.run();
      const scroller = oscdRemoveIedsPlugin.dialogUI.shadowRoot!.querySelector('.scroller')!;
      expect(scroller.scrollHeight).to.be.at.most(scroller.clientHeight + 1);
      const optionArea = oscdRemoveIedsPlugin.shadowRoot!.querySelector('.removal-options')!;
      expect(optionArea.clientHeight).to.be.greaterThan(0);
      expect(optionArea.clientHeight).to.be.at.most(window.innerHeight * 0.3 + 1);
      await oscdRemoveIedsPlugin.dialogUI.close();
    });

    it('keeps the outer dialog unscrollable on a tall viewport with a long IED list', async () => {
      const originalSize = { width: window.innerWidth, height: window.innerHeight };
      try {
        await setViewport({ width: 1000, height: 1000 });
        const list = oscdRemoveIedsPlugin.selectionList;
        list.items = Array.from({ length: 30 }, (_, index) => ({
          headline: `Demo IED ${index}`,
          supportingText: 'An IED with supporting description text',
          selected: false,
        }));
        await list.updateComplete;
        await oscdRemoveIedsPlugin.run();
        const scroller = oscdRemoveIedsPlugin.dialogUI.shadowRoot!.querySelector('.scroller')!;
        expect(scroller.scrollHeight).to.be.at.most(scroller.clientHeight + 1);
        expect(list.scrollHeight).to.be.greaterThan(list.clientHeight);
        list.scrollTop = 100;
        expect(list.scrollTop).to.be.greaterThan(0);
        await oscdRemoveIedsPlugin.dialogUI.close();
      } finally {
        await setViewport(originalSize);
      }
    });

    it('expands options once, keeps both regions stable, and resets on reopening', async () => {
      const originalSize = { width: window.innerWidth, height: window.innerHeight };
      try {
        await setViewport({ width: 1000, height: 1000 });
        await oscdRemoveIedsPlugin.run();
        const root = oscdRemoveIedsPlugin.shadowRoot!;
        const form = root.querySelector('form')!;
        const panel = root.querySelector('.removal-options')!;
        const list = oscdRemoveIedsPlugin.selectionList;
        const settleLayout = async () => {
          form.getBoundingClientRect();
          await Promise.all(form.getAnimations().map(animation => animation.finished));
        };
        expect(panel.clientHeight).to.equal(0);
        const initialListHeight = list.clientHeight;
        expect(initialListHeight).to.be.greaterThan(400);
        await selectIEDs('IED1');
        expect(panel.clientHeight).to.equal(0);
        await selectIEDs('IED2');
        await settleLayout();
        const expandedPanelHeight = panel.clientHeight;
        const expandedListHeight = list.clientHeight;
        expect(expandedPanelHeight).to.be.greaterThan(150);
        expect(expandedListHeight).to.be.lessThan(initialListHeight);
        expect(panel.querySelector('h3')?.textContent).to.equal('Removal options');
        expect(root.querySelector('.selection-heading')?.textContent).to.equal('Select IEDs');
        await selectIEDs('IED3');
        await selectCheckbox('.delete-network');
        await selectCheckbox('.option-row:nth-of-type(2) .delete-network');
        await settleLayout();
        expect(root.querySelector('#delete-communication')).to.exist;
        expect(panel.clientHeight).to.equal(expandedPanelHeight);
        expect(list.clientHeight).to.equal(expandedListHeight);
        expect(panel.scrollHeight).to.be.at.least(panel.clientHeight);
        const scroller = oscdRemoveIedsPlugin.dialogUI.shadowRoot!.querySelector('.scroller')!;
        expect(scroller.scrollHeight).to.be.at.most(scroller.clientHeight + 1);

        await selectIEDs('IED1', 'IED2', 'IED3');
        await settleLayout();
        expect(panel.textContent).to.contain('No additional removal options for this selection.');
        expect(panel.querySelector('h3')?.textContent).to.equal('Removal options');
        expect(panel.clientHeight).to.equal(expandedPanelHeight);
        expect(list.clientHeight).to.equal(expandedListHeight);
        await oscdRemoveIedsPlugin.dialogUI.close();
        await oscdRemoveIedsPlugin.updateComplete;
        await settleLayout();
        await oscdRemoveIedsPlugin.run();
        expect(panel.clientHeight).to.equal(0);
        expect(list.clientHeight).to.equal(initialListHeight);
        await oscdRemoveIedsPlugin.dialogUI.close();
      } finally {
        await setViewport(originalSize);
      }
    });

    it('retains network metadata by default and groups the IED removals into one undo entry', async () => {
      const original = doc.cloneNode(true);
      const network = doc.querySelector('SubNetwork[name="StationBus"]')!;
      const metadata = network.querySelector('Private')!;
      const bitRate = network.querySelector('BitRate')!;
      await selectIEDs('IED1', 'IED2');
      await oscdRemoveIedsPlugin.removeIEDs();
      expect(network.parentElement).to.equal(doc.querySelector('Communication'));
      expect(network.querySelector('Private')).to.equal(metadata);
      expect(network.querySelector('BitRate')).to.equal(bitRate);
      expect(network.querySelectorAll('ConnectedAP')).to.have.lengthOf(0);
      expect(getIedNames(doc)).to.deep.equal(['IED3']);
      expect(sclEditor.past).to.have.lengthOf(1);
      const removed = doc.cloneNode(true);
      sclEditor.undo();
      expect(doc.isEqualNode(original)).to.be.true;
      sclEditor.redo();
      expect(doc.isEqualNode(removed)).to.be.true;
    });

    it('defers edits until confirmation and preserves choices when going back', async () => {
      const original = doc.cloneNode(true);
      await oscdRemoveIedsPlugin.run();
      await selectIEDs('IED1', 'IED2', 'IED3');
      await selectCheckbox('.delete-network');
      const confirmation = await requestRemoval();
      expect(doc.isEqualNode(original)).to.be.true;
      expect(sclEditor.past).to.have.lengthOf(0);
      expect(confirmation.summary?.iedNames).to.deep.equal(['IED1', 'IED2', 'IED3']);
      expect(confirmation.summary?.hasBoundLNodes).to.be.false;
      expect(confirmation.summary?.deletedSubNetworks).to.deep.equal(['StationBus']);
      expect(confirmation.summary?.retainedSubNetworks).to.deep.equal(['ProcessBus']);
      await confirmation.close();
      expect(oscdRemoveIedsPlugin.dialogUI.open).to.be.true;
      expect(oscdRemoveIedsPlugin.selectionList.selectedElements).to.have.lengthOf(3);
      const networkChoice = oscdRemoveIedsPlugin.shadowRoot!.querySelector('.delete-network');
      expect(networkChoice instanceof OscdCheckbox && networkChoice.checked).to.be.true;
      await requestRemoval();
      confirmation.dispatchEvent(new CustomEvent('confirm'));
      await waitUntil(() => doc.querySelectorAll('IED').length === 0);
      await waitUntil(() => !oscdRemoveIedsPlugin.dialogUI.open);
      expect(confirmation.open).to.be.false;
      expect(doc.querySelector('SubNetwork[name="StationBus"]')).to.equal(null);
      expect(doc.querySelector('SubNetwork[name="ProcessBus"]')).to.exist;
      expect(sclEditor.past).to.have.lengthOf(1);
      sclEditor.undo();
      expect(doc.isEqualNode(original)).to.be.true;
    });

    it('removes directly when the selection has no communication impacts', async () => {
      await oscdRemoveIedsPlugin.run();
      await selectIEDs('IED1');
      const button = oscdRemoveIedsPlugin.shadowRoot!.querySelector('#selection-dialog > [slot="actions"] oscd-filled-button');
      if (!(button instanceof OscdFilledButton)) {
        throw new Error('Missing removal button');
      }
      button.click();
      await waitUntil(() => doc.querySelector('IED[name="IED1"]') === null);
      await waitUntil(() => !oscdRemoveIedsPlugin.dialogUI.open);
      const confirmation = oscdRemoveIedsPlugin.shadowRoot!.querySelector('#confirmation-dialog');
      expect(confirmation instanceof OscdRemovalConfirmation && confirmation.open).to.be.false;
    });

    it('deletes only explicitly selected networks and leaves the surviving network intact', async () => {
      const original = doc.cloneNode(true);
      const processBus = doc.querySelector('SubNetwork[name="ProcessBus"]')!;
      await selectIEDs('IED1', 'IED2');
      await selectCheckbox('.delete-network');
      await oscdRemoveIedsPlugin.removeIEDs();
      expect(doc.querySelector('SubNetwork[name="StationBus"]')).to.equal(null);
      expect(doc.querySelector('SubNetwork[name="ProcessBus"]')).to.equal(processBus);
      expect(processBus.querySelectorAll('ConnectedAP')).to.have.lengthOf(1);
      sclEditor.undo();
      expect(doc.isEqualNode(original)).to.be.true;
    });

    it('supports mixed choices and preserves a deletion choice for a network that remains affected', async () => {
      await selectIEDs('IED1', 'IED2');
      await selectCheckbox('.delete-network');
      await selectIEDs('IED3');
      const options = oscdRemoveIedsPlugin.shadowRoot!.querySelectorAll('.delete-network');
      expect(options).to.have.lengthOf(2);
      expect(options[0] instanceof OscdCheckbox && options[0].checked).to.be.true;
      expect(options[1] instanceof OscdCheckbox && options[1].checked).to.be.false;
      const retained = doc.querySelector('SubNetwork[name="ProcessBus"]')!;
      await oscdRemoveIedsPlugin.removeIEDs();
      expect(doc.querySelector('SubNetwork[name="StationBus"]')).to.equal(null);
      expect(doc.querySelector('SubNetwork[name="ProcessBus"]')).to.equal(retained);
      expect(retained.querySelectorAll('ConnectedAP')).to.have.lengthOf(0);
    });

    it('clears all choices on cancellation without applying edits', async () => {
      const original = doc.cloneNode(true);
      await selectIEDs('IED1', 'IED2', 'IED3');
      await selectCheckbox('.delete-network');
      await selectCheckbox('.option-row:nth-of-type(2) .delete-network');
      await selectCheckbox('#delete-communication');
      oscdRemoveIedsPlugin.shadowRoot!.querySelector('#selection-dialog > [slot="actions"] oscd-text-button')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await oscdRemoveIedsPlugin.updateComplete;
      expect(doc.isEqualNode(original)).to.be.true;
      expect(sclEditor.past).to.have.lengthOf(0);
      expect(oscdRemoveIedsPlugin.shadowRoot!.querySelector('.delete-network')).to.equal(null);
      expect(oscdRemoveIedsPlugin.selectionList.selectedElements).to.have.lengthOf(0);
    });

    it('progressively offers Communication deletion and resets it when a network is retained', async () => {
      await selectIEDs('IED1', 'IED2', 'IED3');
      const networks = oscdRemoveIedsPlugin.shadowRoot!.querySelectorAll('.delete-network');
      expect(networks).to.have.lengthOf(2);
      await selectCheckbox('.delete-network');
      expect(oscdRemoveIedsPlugin.shadowRoot!.querySelector('#delete-communication')).to.equal(null);
      await selectCheckbox('.option-row:nth-of-type(2) .delete-network');
      const communication = oscdRemoveIedsPlugin.shadowRoot!.querySelector('#delete-communication');
      expect(communication).to.be.instanceOf(OscdCheckbox);
      expect(communication?.closest('.option-row')?.querySelector('.warning-icon')).to.exist;
      await selectCheckbox('#delete-communication');
      expect(oscdRemoveIedsPlugin.shadowRoot!.querySelector('.warning')).to.equal(null);
      await selectCheckbox('.delete-network');
      expect(oscdRemoveIedsPlugin.shadowRoot!.querySelector('#delete-communication')).to.equal(null);
      await selectCheckbox('.delete-network');
      const reset = oscdRemoveIedsPlugin.shadowRoot!.querySelector('#delete-communication');
      expect(reset instanceof OscdCheckbox && reset.checked).to.be.false;
    });

    it('uses the internal warning token for empty-container deletion icons', async () => {
      oscdRemoveIedsPlugin.style.setProperty('--oscd-warning', 'rgb(180, 120, 0)');
      await selectIEDs('IED1', 'IED2', 'IED3');
      await selectCheckbox('.delete-network');
      await selectCheckbox('.option-row:nth-of-type(2) .delete-network');
      const icons = oscdRemoveIedsPlugin.shadowRoot!.querySelectorAll('.warning-icon');
      expect(icons).to.have.lengthOf(3);
      icons.forEach((icon) => {
        expect(icon).to.be.instanceOf(OscdIcon);
        expect(icon.textContent).to.equal('warning');
        expect(getComputedStyle(icon).color).to.equal('rgb(180, 120, 0)');
      });
    });

    it('preserves empty Communication unless its deletion is explicitly chosen', async () => {
      const communication = doc.querySelector('Communication')!;
      const metadata = communication.querySelector(':scope > Private')!;
      await selectIEDs('IED1', 'IED2', 'IED3');
      await selectCheckbox('.delete-network');
      await selectCheckbox('.option-row:nth-of-type(2) .delete-network');
      await oscdRemoveIedsPlugin.removeIEDs();
      expect(doc.querySelector('Communication')).to.equal(communication);
      expect(communication.querySelector(':scope > Private')).to.equal(metadata);
      expect(communication.querySelectorAll(':scope > SubNetwork')).to.have.lengthOf(0);
    });

    it('deletes Communication only by choice, with one undo/redo and a separate prior edit', async () => {
      sclEditor.commit({ element: doc.documentElement, attributes: { desc: 'Earlier edit' } });
      const original = doc.cloneNode(true);
      await selectIEDs('IED1', 'IED2', 'IED3');
      await selectCheckbox('.delete-network');
      await selectCheckbox('.option-row:nth-of-type(2) .delete-network');
      await selectCheckbox('#delete-communication');
      await oscdRemoveIedsPlugin.removeIEDs();
      expect(doc.querySelector('Communication')).to.equal(null);
      expect(doc.querySelectorAll('IED')).to.have.lengthOf(0);
      expect(sclEditor.past).to.have.lengthOf(2);
      const removed = doc.cloneNode(true);
      sclEditor.undo();
      expect(doc.isEqualNode(original)).to.be.true;
      sclEditor.redo();
      expect(doc.isEqualNode(removed)).to.be.true;
    });

    it('drops deletion choices when a network stops being affected', async () => {
      await selectIEDs('IED1', 'IED2');
      await selectCheckbox('.delete-network');
      await selectIEDs('IED2');
      expect(oscdRemoveIedsPlugin.shadowRoot!.querySelector('.delete-network')).to.equal(null);
      await selectIEDs('IED2');
      const reset = oscdRemoveIedsPlugin.shadowRoot!.querySelector('.delete-network');
      expect(reset instanceof OscdCheckbox && reset.checked).to.be.false;
    });

    it('previews complete current SCL read-only while allowing text selection and copy extraction', async () => {
      const original = doc.cloneNode(true);
      await selectIEDs('IED1', 'IED2');
      await oscdRemoveIedsPlugin.run();
      const review = oscdRemoveIedsPlugin.shadowRoot!.querySelector('.review-network');
      if (!(review instanceof OscdTextButton)) {
        throw new Error('Missing review button');
      }
      const selected = [...oscdRemoveIedsPlugin.selectionList.selectedElements];
      const panelHeight = oscdRemoveIedsPlugin.shadowRoot!.querySelector('.removal-options')!.clientHeight;
      review.shadowRoot!.querySelector('button')!.click();
      await oscdRemoveIedsPlugin.updateComplete;
      const viewer = oscdRemoveIedsPlugin.shadowRoot!.querySelector('oscd-ace-editor');
      if (!(viewer instanceof OscdAceEditor)) {
        throw new Error('SCL viewer did not upgrade');
      }
      await waitUntil(() => viewer.editor?.getReadOnly() === true);
      const reviewDialog = oscdRemoveIedsPlugin.shadowRoot!.querySelector('#review-dialog')!;
      expect(reviewDialog).to.be.instanceOf(OscdDialog);
      expect(oscdRemoveIedsPlugin.dialogUI.open).to.be.true;
      expect(reviewDialog.querySelector('[slot="headline"]')?.textContent).to.equal(
        'Review SubNetwork "StationBus" removal',
      );
      await waitUntil(() => {
        const scroller = reviewDialog.shadowRoot!.querySelector('.scroller')!;
        return scroller.clientHeight > 0 &&
          scroller.scrollHeight <= scroller.clientHeight + 1;
      }, 'The review dialog should not have an outer scrolling area');
      expect(viewer.clientHeight).to.be.greaterThan(0);
      const ace = viewer.editor!;
      expect(ace.getValue()).to.contain('StationBus metadata');
      expect(ace.getValue()).to.contain('BitRate');
      expect(ace.getValue()).to.contain('ConnectedAP');
      const current = ace.getValue();
      ace.selectAll();
      expect(ace.getCopyText()).to.equal(current);
      ace.execCommand('insertstring', 'should not change');
      expect(ace.getValue()).to.equal(current);
      expect(doc.isEqualNode(original)).to.be.true;
      const close = oscdRemoveIedsPlugin.shadowRoot!.querySelector('#review-dialog [slot="actions"] oscd-text-button');
      if (!(close instanceof OscdTextButton)) {
        throw new Error('Missing review Close button');
      }
      close.click();
      await waitUntil(() => oscdRemoveIedsPlugin.shadowRoot!.querySelector('oscd-ace-editor') === null);
      expect(oscdRemoveIedsPlugin.dialogUI.open).to.be.true;
      expect(oscdRemoveIedsPlugin.selectionList.selectedElements).to.deep.equal(selected);
      expect(oscdRemoveIedsPlugin.shadowRoot!.querySelector('.removal-options')!.clientHeight).to.equal(panelHeight);
      await selectIEDs('IED3');
      await selectCheckbox('.delete-network');
      await selectCheckbox('.option-row:nth-of-type(2) .delete-network');
      oscdRemoveIedsPlugin.shadowRoot!.querySelector('#review-communication')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await oscdRemoveIedsPlugin.updateComplete;
      const communicationViewer = oscdRemoveIedsPlugin.shadowRoot!.querySelector('oscd-ace-editor');
      if (!(communicationViewer instanceof OscdAceEditor)) {
        throw new Error('Communication viewer did not upgrade');
      }
      await waitUntil(() => communicationViewer.editor?.getReadOnly() === true);
      expect(reviewDialog.querySelector('[slot="headline"]')?.textContent).to.equal(
        'Review Communication removal',
      );
      await waitUntil(() => {
        const scroller = reviewDialog.shadowRoot!.querySelector('.scroller')!;
        return scroller.clientHeight > 0 &&
          scroller.scrollHeight <= scroller.clientHeight + 1;
      }, 'The Communication review should not have an outer scrolling area');
      expect(communicationViewer.editor!.getValue()).to.contain('Communication metadata');
      expect(communicationViewer.editor!.getValue()).to.contain('StationBus metadata');
      expect(communicationViewer.editor!.getValue()).to.contain('ProcessBus');
      expect(doc.isEqualNode(original)).to.be.true;
      oscdRemoveIedsPlugin.shadowRoot!.querySelector('#review-dialog [slot="actions"] oscd-text-button')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
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

    it('retains the empty SubNetwork and its metadata unless deletion is chosen', async () => {
      const network = sclDoc.querySelector('SubNetwork')!;
      const bitRate = network.querySelector('BitRate')!;
      await selectAndRemoveAllIEDs(sclDoc);
      expect(sclDoc.querySelector('SubNetwork')).to.equal(network);
      expect(network.querySelector('BitRate')).to.equal(bitRate);
      expect(network.querySelectorAll('ConnectedAP')).to.have.lengthOf(0);
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
      const plugin: OscdMenuRemoveIeds = await fixture(
        html`<oscd-menu-remove-ieds .doc=${sclDoc} .docVersion=${version}></oscd-menu-remove-ieds>`,
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
