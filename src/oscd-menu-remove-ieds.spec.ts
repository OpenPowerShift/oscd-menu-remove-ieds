import { expect, waitUntil } from '@open-wc/testing';
import { setViewport } from '@web/test-runner-commands';

import { PluginDriver } from './testing/driver.js';
import { mountPlugin } from './testing/plugin.js';
import type { MountedPlugin } from './testing/plugin.js';

const lNodeKey = (ln: Element): string =>
  JSON.stringify(
    ['lnInst', 'lnClass', 'ldInst', 'prefix'].map(
      attribute => ln.getAttribute(attribute) ?? '',
    ),
  );

const iedNames = (doc: XMLDocument): string[] =>
  Array.from(doc.querySelectorAll('IED')).map(
    ied => ied.getAttribute('name') ?? '',
  );

const serialized = (doc: XMLDocument): string =>
  new XMLSerializer().serializeToString(doc);

const lNodeNames = (doc: XMLDocument): string[] =>
  Array.from(doc.querySelectorAll('LNode')).map(
    ln => ln.getAttribute('iedName') ?? '',
  );

describe('oscd-menu-remove-ieds', () => {
  let mounted: MountedPlugin;
  let driver: PluginDriver;

  afterEach(() => {
    mounted?.unmount();
  });

  async function mount(fixture = 'multiple-ieds.scd'): Promise<void> {
    mounted = await mountPlugin({ fixture });
    driver = new PluginDriver(mounted);
  }

  async function waitForRemoval(name: string): Promise<void> {
    await waitUntil(
      () => mounted.doc.querySelector(`IED[name="${name}"]`) === null,
      `the IED ${name} was not removed`,
    );
  }

  describe('the selection dialog', () => {
    it('lists the IEDs with their description', async () => {
      await mount();
      await driver.open();

      const listed = driver.ieds();
      expect(listed.map(item => item.name)).to.deep.equal(['PUB_A', 'SUB_A']);
      expect(listed[0].headline).to.contain('ABB');
      expect(listed[0].headline).to.contain('REL670');
      expect(listed[0].supportingText).to.contain('Publisher A');
      expect(listed[0].supportingText).to.contain('1.0');
    });

    it('shows an empty state when the document has no IEDs', async () => {
      await mount('no-ieds.scd');
      await driver.open();

      expect(driver.ieds()).to.deep.equal([]);
      expect(driver.dialogText()).to.contain('This document has no IEDs.');
      expect(driver.removeDisabled()).to.be.true;
    });

    it('renders Cancel and Remove actions', async () => {
      await mount();
      await driver.open();

      expect(driver.actionLabels()).to.deep.equal(['Cancel', 'Remove']);
    });

    it('enables Remove only while IEDs are selected', async () => {
      await mount();
      await driver.open();
      expect(driver.removeDisabled()).to.be.true;

      await driver.select('PUB_A');
      expect(driver.removeDisabled()).to.be.false;

      await driver.deselect('PUB_A');
      expect(driver.removeDisabled()).to.be.true;
    });

    it('refreshes the list after an external edit and undo', async () => {
      await mount();
      await driver.open();
      const ied = mounted.doc.querySelector('IED[name="PUB_A"]')!;

      await mounted.applyEdit({ node: ied });
      expect(driver.ieds().map(item => item.name)).to.deep.equal(['SUB_A']);

      await mounted.undo();
      expect(driver.ieds().map(item => item.name)).to.deep.equal([
        'PUB_A',
        'SUB_A',
      ]);
    });

    it('keeps the selection when another plugin edits the document', async () => {
      await mount();
      await driver.open();
      await driver.select('PUB_A');
      const header = mounted.doc.querySelector(':root > Header')!;

      await mounted.applyEdit({
        element: header,
        attributes: { desc: 'edited elsewhere' },
      });

      const selected = driver.ieds().filter(item => item.selected);
      expect(selected.map(item => item.name)).to.deep.equal(['PUB_A']);
      expect(driver.removeDisabled()).to.be.false;
    });

    it('closes and clears the selection when cancelled', async () => {
      await mount();
      await driver.open();
      await driver.select('PUB_A');

      await driver.cancel();

      expect(driver.dialogOpen).to.be.false;
      await driver.open();
      expect(driver.ieds().filter(item => item.selected)).to.deep.equal([]);
      expect(driver.removeDisabled()).to.be.true;
    });

    it('selects every IED which the search shows and clears them again', async () => {
      await mount('communication-choices.scd');
      await driver.open();

      await driver.search('IED1');
      expect(driver.visibleIeds()).to.deep.equal(['IED1']);
      await driver.selectAllShown();
      expect(
        driver.ieds().filter(item => item.selected).map(item => item.name),
      ).to.deep.equal(['IED1']);

      await driver.search('');
      await driver.selectAllShown();
      expect(
        driver.ieds().filter(item => item.selected).map(item => item.name),
      ).to.deep.equal(['IED1', 'IED2', 'IED3']);

      await driver.clearSelection();
      expect(driver.ieds().filter(item => item.selected)).to.deep.equal([]);
      expect(driver.visibleIeds()).to.deep.equal(['IED1', 'IED2', 'IED3']);
    });

    it('removes only the IEDs which the search shows', async () => {
      await mount('communication-choices.scd');
      await driver.open();

      await driver.search('IED1');
      await driver.selectAllShown();
      await driver.remove();
      await waitForRemoval('IED1');

      expect(iedNames(mounted.doc)).to.deep.equal(['IED2', 'IED3']);
    });

    it('fills a 600 px host without overflowing it', async () => {
      mounted = await mountPlugin({ fixture: 'multiple-ieds.scd', height: 600 });
      driver = new PluginDriver(mounted);

      expect(mounted.plugin.getBoundingClientRect().height).to.equal(600);
      expect(mounted.host.scrollHeight).to.equal(mounted.host.clientHeight);
    });
  });

  describe('the LNode option', () => {
    it('appears only for a bound IED and is unchecked by default', async () => {
      await mount('duplicate-lnodes.scd');
      await driver.open();

      await driver.select('IED1');
      const options = driver.options();
      expect(options).to.have.lengthOf(1);
      expect(options[0].label).to.contain('Delete associated LNodes');
      expect(options[0].checked).to.be.false;

      await driver.clickOption('Delete associated LNodes');
      expect(driver.options()[0].checked).to.be.true;
      expect(driver.ieds().filter(item => item.selected)).to.have.lengthOf(1);
    });

    it('places the options to the right of the list on a wide screen', async () => {
      const original = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
      try {
        await setViewport({ width: 1280, height: 800 });
        await mount('duplicate-lnodes.scd');
        await driver.open();
        await driver.select('IED1');

        const layout = driver.layout();
        expect(layout.optionsWidth).to.be.greaterThan(0);
        expect(layout.optionsLeft).to.be.greaterThan(layout.listLeft);
        expect(layout.optionsTop).to.be.lessThan(layout.listTop);
        expect(layout.listTop - layout.optionsTop).to.be.lessThan(80);
        expect(layout.listWidth).to.be.greaterThan(layout.optionsWidth);
      } finally {
        await setViewport(original);
      }
    });

    it('keeps its size when options appear and disappear', async () => {
      const original = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
      try {
        await setViewport({ width: 1280, height: 800 });
        await mount('duplicate-lnodes.scd');
        await driver.open();
        const before = driver.layout();

        await driver.select('IED1');
        const withOptions = driver.layout();
        expect(withOptions.formWidth).to.equal(before.formWidth);
        expect(withOptions.formHeight).to.equal(before.formHeight);

        await driver.deselect('IED1');
        const after = driver.layout();
        expect(after.formWidth).to.equal(before.formWidth);
        expect(after.formHeight).to.equal(before.formHeight);
      } finally {
        await setViewport(original);
      }
    });

    it('stacks the options below the list on a narrow screen', async () => {
      const original = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
      try {
        await setViewport({ width: 600, height: 800 });
        await mount('duplicate-lnodes.scd');
        await driver.open();
        await driver.select('IED1');

        const layout = driver.layout();
        expect(layout.optionsTop).to.be.greaterThan(layout.listTop);
        expect(layout.optionsWidth).to.be.greaterThan(0);
        expect(layout.optionsWidth).to.be.at.least(layout.listWidth - 1);
      } finally {
        await setViewport(original);
      }
    });

    it('is absent for an IED without bound LNodes', async () => {
      await mount('communication-choices.scd');
      await driver.open();

      await driver.select('IED3');
      expect(driver.options()).to.deep.equal([]);
    });

    it('deletes only the selected IED bindings when checked, and undo restores them', async () => {
      await mount('duplicate-lnodes.scd');
      await driver.open();
      const before = lNodeNames(mounted.doc);
      const original = serialized(mounted.doc);

      await driver.select('IED1');
      await driver.clickOption('Delete associated LNodes');
      await driver.remove();
      await waitForRemoval('IED1');

      expect(lNodeNames(mounted.doc).length).to.be.lessThan(before.length);
      expect(mounted.doc.querySelectorAll('LNode[iedName="IED1"]')).to.have
        .lengthOf(0);
      expect(mounted.doc.querySelectorAll('LNode[iedName="IED2"]').length).to.be
        .greaterThan(0);

      await mounted.undo();
      expect(serialized(mounted.doc)).to.equal(original);
    });

    it('preserves unique LNodes by default and leaves other bindings unchanged', async () => {
      await mount('duplicate-lnodes.scd');
      await driver.open();
      const original = serialized(mounted.doc);
      const ied2 = Array.from(
        mounted.doc.querySelectorAll('LNode[iedName="IED2"]'),
      );

      await driver.select('IED1');
      await driver.remove();
      await waitForRemoval('IED1');

      expect(mounted.doc.querySelectorAll('LNode[iedName="IED1"]')).to.have
        .lengthOf(0);
      expect(Array.from(mounted.doc.querySelectorAll('LNode[iedName="IED2"]')))
        .to.deep.equal(ied2);
      expect(mounted.doc.querySelectorAll('LNode[iedName="None"]').length).to.be
        .greaterThan(0);

      await mounted.undo();
      expect(serialized(mounted.doc)).to.equal(original);
    });

    it('uses deletion mode for every selected IED and keeps existing unbound LNodes', async () => {
      await mount('duplicate-lnodes.scd');
      await driver.open();
      const unbound = Array.from(
        mounted.doc.querySelectorAll('LNode[iedName="None"]'),
      );

      await driver.select('IED1', 'IED2');
      await driver.clickOption('Delete associated LNodes');
      await driver.remove();
      await waitForRemoval('IED1');

      expect(iedNames(mounted.doc)).to.deep.equal([]);
      expect(Array.from(mounted.doc.querySelectorAll('LNode'))).to.deep.equal(
        unbound,
      );
    });

    it('keeps no duplicate LNode key inside a container after separate removals', async () => {
      await mount('duplicate-lnodes.scd');
      await driver.open();

      for (const name of ['IED1', 'IED2']) {
        await driver.open();
        await driver.select(name);
        await driver.remove();
        await waitForRemoval(name);
      }

      for (const container of mounted.doc.querySelectorAll(
        'ConductingEquipment, Function, SubFunction, EqFunction, EqSubFunction, GeneralEquipment',
      )) {
        const keys = Array.from(
          container.querySelectorAll(':scope > LNode'),
        ).map(lNodeKey);
        expect(new Set(keys).size).to.equal(keys.length);
        Array.from(container.querySelectorAll(':scope > LNode')).forEach((ln) => {
          expect(ln.getAttribute('iedName')).to.equal('None');
        });
      }
    });

    it('resets to unchecked whenever the dialog opens', async () => {
      await mount('duplicate-lnodes.scd');
      await driver.open();
      await driver.select('IED1');
      await driver.clickOption('Delete associated LNodes');
      expect(driver.options()[0].checked).to.be.true;

      await driver.close();
      await driver.open();
      await driver.select('IED1');

      expect(driver.options()[0].checked).to.be.false;
    });
  });

  describe('communication removal choices', () => {
    it('offers no network option until the selection empties one', async () => {
      await mount('communication-choices.scd');
      await driver.open();

      await driver.select('IED1');
      expect(driver.options()).to.deep.equal([]);

      await driver.select('IED2');
      const options = driver.options();
      expect(options).to.have.lengthOf(1);
      expect(options[0].label).to.contain('StationBus');
      expect(options[0].checked).to.be.false;
      expect(driver.dialogText()).not.to.contain(
        'Delete empty Communication section too',
      );
    });

    it('removes an affected network only by choice and groups one undo entry', async () => {
      await mount('communication-choices.scd');
      await driver.open();
      const original = serialized(mounted.doc);

      await driver.select('IED1', 'IED2');
      await driver.clickOption('Delete empty SubNetwork "StationBus"');
      await driver.remove();
      await driver.confirm();

      expect(mounted.doc.querySelector('SubNetwork[name="StationBus"]')).to.be
        .null;
      expect(mounted.doc.querySelector('SubNetwork[name="ProcessBus"]')).to.exist;
      expect(iedNames(mounted.doc)).to.deep.equal(['IED3']);
      expect(mounted.editor.past).to.have.lengthOf(1);

      await mounted.undo();
      expect(serialized(mounted.doc)).to.equal(original);
    });

    it('removes directly without confirmation when the selection has no impact', async () => {
      await mount('communication-choices.scd');
      await driver.open();

      await driver.select('IED1');
      await driver.remove();
      await waitForRemoval('IED1');

      expect(driver.confirmationOpen).to.be.false;
      await waitUntil(() => !driver.dialogOpen);
      expect(iedNames(mounted.doc)).to.deep.equal(['IED2', 'IED3']);
    });

    it('offers Communication deletion only when every affected network is checked', async () => {
      await mount('communication-choices.scd');
      await driver.open();

      await driver.select('IED1', 'IED2', 'IED3');
      expect(driver.options()).to.have.lengthOf(2);

      await driver.clickOption('StationBus');
      expect(driver.dialogText()).not.to.contain(
        'Delete empty Communication section too',
      );

      await driver.clickOption('ProcessBus');
      expect(
        driver
          .options()
          .some(option =>
            option.label.includes('Delete empty Communication section too'),
          ),
      ).to.be.true;

      await driver.clickOption('StationBus');
      expect(
        driver
          .options()
          .some(option =>
            option.label.includes('Delete empty Communication section too'),
          ),
      ).to.be.false;
    });

    it('deletes Communication only by choice, with one undo entry', async () => {
      await mount('communication-choices.scd');
      await driver.open();
      const original = serialized(mounted.doc);

      await driver.select('IED1', 'IED2', 'IED3');
      await driver.clickOption('StationBus');
      await driver.clickOption('ProcessBus');
      await driver.clickOption('Delete empty Communication');
      await driver.remove();

      expect(driver.summary?.deleteCommunication).to.be.true;
      await driver.confirm();

      expect(mounted.doc.querySelector('Communication')).to.be.null;
      expect(iedNames(mounted.doc)).to.deep.equal([]);
      expect(mounted.editor.past).to.have.lengthOf(1);

      await mounted.undo();
      expect(serialized(mounted.doc)).to.equal(original);
    });

    it('preserves empty Communication unless its deletion is chosen', async () => {
      await mount('communication-choices.scd');
      await driver.open();

      await driver.select('IED1', 'IED2', 'IED3');
      await driver.clickOption('StationBus');
      await driver.clickOption('ProcessBus');
      await driver.remove();

      expect(driver.summary?.retainCommunication).to.be.true;
      await driver.confirm();

      const communication = mounted.doc.querySelector('Communication')!;
      expect(communication).to.exist;
      expect(communication.querySelectorAll(':scope > SubNetwork')).to.have
        .lengthOf(0);
    });

    it('returns from the confirmation with the choices intact', async () => {
      await mount('communication-choices.scd');
      await driver.open();

      await driver.select('IED1', 'IED2', 'IED3');
      await driver.clickOption('StationBus');
      await driver.clickOption('ProcessBus');
      await driver.remove();
      await driver.back();

      expect(driver.dialogOpen).to.be.true;
      expect(driver.ieds().filter(item => item.selected)).to.have.lengthOf(3);
      expect(driver.options().filter(option => option.checked)).to.have.lengthOf(
        2,
      );
      expect(mounted.editor.past).to.have.lengthOf(0);
    });

    it('clears every choice on cancel without applying edits', async () => {
      await mount('communication-choices.scd');
      await driver.open();
      const original = serialized(mounted.doc);

      await driver.select('IED1', 'IED2', 'IED3');
      await driver.clickOption('StationBus');
      await driver.clickOption('ProcessBus');
      await driver.cancelSelection();

      expect(serialized(mounted.doc)).to.equal(original);
      expect(mounted.editor.past).to.have.lengthOf(0);
      expect(driver.dialogOpen).to.be.false;
    });

    it('previews the complete SubNetwork SCL read-only without changing it', async () => {
      await mount('communication-choices.scd');
      await driver.open();
      const original = serialized(mounted.doc);

      await driver.select('IED1', 'IED2');
      await driver.reviewNetwork('StationBus');

      expect(driver.reviewOpen).to.be.true;
      expect(driver.reviewText()).to.contain('StationBus');
      expect(driver.reviewText()).to.contain('BitRate');
      expect(driver.reviewText()).to.contain('ConnectedAP');
      expect(serialized(mounted.doc)).to.equal(original);

      await driver.closeReview();
      expect(driver.dialogOpen).to.be.true;
      expect(driver.ieds().filter(item => item.selected)).to.have.lengthOf(2);
    });

    it('previews Communication before deleting it', async () => {
      await mount('communication-choices.scd');
      await driver.open();
      const original = serialized(mounted.doc);

      await driver.select('IED1', 'IED2', 'IED3');
      await driver.clickOption('StationBus');
      await driver.clickOption('ProcessBus');
      await driver.reviewCommunication();

      expect(driver.reviewOpen).to.be.true;
      expect(driver.reviewText()).to.contain('Communication metadata');
      expect(driver.reviewText()).to.contain('ProcessBus');
      expect(serialized(mounted.doc)).to.equal(original);
      await driver.closeReview();
    });
  });

  describe('SCL validity', () => {
    it('keeps an emptied SubNetwork unless its deletion is chosen', async () => {
      await mount('empty-subnetwork.scd');
      await driver.open();
      const network = mounted.doc.querySelector('SubNetwork')!;

      await driver.select('IED1', 'IED2');
      await driver.remove();
      expect(driver.summary?.retainedSubNetworks).to.deep.equal([
        'StationBus',
      ]);
      await driver.confirm();

      expect(mounted.doc.querySelector('SubNetwork')).to.equal(network);
      expect(network.querySelectorAll('ConnectedAP')).to.have.lengthOf(0);
      expect(iedNames(mounted.doc)).to.deep.equal([]);
    });

    it('deletes an emptied SubNetwork when chosen', async () => {
      await mount('empty-subnetwork.scd');
      await driver.open();

      await driver.select('IED1', 'IED2');
      await driver.clickOption('Delete empty SubNetwork "StationBus"');
      await driver.remove();
      await driver.confirm();

      expect(mounted.doc.querySelector('SubNetwork')).to.be.null;
      expect(iedNames(mounted.doc)).to.deep.equal([]);
    });

    it('does not create duplicate LNode keys when all IEDs are removed', async () => {
      await mount('duplicate-lnodes.scd');
      await driver.open();

      await driver.select('IED1', 'IED2');
      await driver.remove();
      await waitForRemoval('IED1');

      Object.entries(
        Array.from(
          mounted.doc.querySelectorAll(
            'ConductingEquipment, Function, SubFunction, EqFunction, EqSubFunction, GeneralEquipment',
          ),
        ).reduce<Record<string, string[]>>((containers, container, index) => {
          containers[index] = Array.from(
            container.querySelectorAll(':scope > LNode'),
          ).map(lNodeKey);
          return containers;
        }, {}),
      ).forEach(([, keys]) => {
        expect(new Set(keys).size).to.equal(keys.length);
      });
    });

    it('preserves the original document when nothing is removed', async () => {
      await mount('duplicate-lnodes.scd');
      await driver.open();
      const original = serialized(mounted.doc);

      await driver.select('IED1');
      await driver.deselect('IED1');

      expect(serialized(mounted.doc)).to.equal(original);
      expect(mounted.editor.past).to.have.lengthOf(0);
    });
  });
});
