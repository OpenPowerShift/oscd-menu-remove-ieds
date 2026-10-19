import { expect } from '@open-wc/testing';
import { setViewport } from '@web/test-runner-commands';
import { visualDiff } from '@web/test-runner-visual-regression';

import { PluginDriver } from './testing/driver.js';
import { loadScl, mountPlugin } from './testing/plugin.js';
import type { MountedPlugin } from './testing/plugin.js';

/**
 * Screenshot tests for the states which the documentation shows. What the
 * plugin does is covered by the `*.spec.ts` files. Baselines are owned by CI;
 * do not create or update them locally.
 */

const SAMPLE = '/demo/sample.scd';
const BOUND_A = 'DEMO_BOUND_A';
const BOUND_B = 'DEMO_BOUND_B';
const UNBOUND = 'DEMO_UNBOUND';
const ALL_IEDS = [
  'DEMO_BOUND_A',
  'DEMO_BOUND_B',
  'DEMO_UNBOUND',
  'PUB_A',
  'PUB_B',
  'SMV_PUB',
  'SUB_A',
  'SUB_B',
];

describe('oscd-menu-remove-ieds screenshots', () => {
  let mounted: MountedPlugin;
  let driver: PluginDriver;

  before(async () => {
    await setViewport({ width: 1280, height: 800 });
  });

  afterEach(() => {
    mounted?.unmount();
  });

  async function mountSample(): Promise<void> {
    await Promise.all([
      document.fonts.load('400 16px Roboto'),
      document.fonts.load('24px "Material Symbols Outlined"'),
    ]);
    mounted = await mountPlugin({
      doc: await loadScl(SAMPLE),
      height: 800,
      width: 1280,
    });
    driver = new PluginDriver(mounted);
    await document.fonts.ready;
  }

  const shot = (name: string) => visualDiff(mounted.plugin, name);

  it('initial', async () => {
    await mountSample();
    await driver.open();
    await shot('initial');
  });

  it('with an IED selected', async () => {
    await mountSample();
    await driver.open();
    await driver.select(BOUND_A);
    await shot('with an IED selected');
  });

  it('with SubNetwork options', async () => {
    await mountSample();
    await driver.open();
    await driver.select(BOUND_A, BOUND_B);
    await shot('with SubNetwork options');
  });

  it('with Communication options', async () => {
    await mountSample();
    await driver.open();
    await driver.select(...ALL_IEDS);
    await driver.clickOption('Delete empty SubNetwork "StationBus"');
    await driver.clickOption('Delete empty SubNetwork "DemoStationBus"');
    await driver.clickOption('Delete empty SubNetwork "DemoProcessBus"');
    driver.scrollOptionsToEnd();
    await driver.settle();
    expect(driver.options().some(option => option.label.includes('Communication')))
      .to.be.true;
    await shot('with Communication options');
  });

  it('with the confirmation open', async () => {
    await mountSample();
    await driver.open();
    await driver.select(BOUND_A, BOUND_B);
    await driver.clickOption('Delete empty SubNetwork "DemoStationBus"');
    await driver.remove();
    await driver.waitForConfirmation();
    await shot('with the confirmation open');
  });

  it('with the SubNetwork review open', async () => {
    await mountSample();
    await driver.open();
    await driver.select(BOUND_A, BOUND_B);
    await driver.reviewNetwork('DemoStationBus');
    await shot('with the SubNetwork review open');
  });

  it('with the Communication review open', async () => {
    await mountSample();
    await driver.open();
    await driver.select(...ALL_IEDS);
    await driver.clickOption('Delete empty SubNetwork "StationBus"');
    await driver.clickOption('Delete empty SubNetwork "DemoStationBus"');
    await driver.clickOption('Delete empty SubNetwork "DemoProcessBus"');
    await driver.reviewCommunication();
    await shot('with the Communication review open');
  });

  it('with no IEDs', async () => {
    mounted = await mountPlugin({
      fixture: 'no-ieds.scd',
      height: 800,
      width: 1280,
    });
    driver = new PluginDriver(mounted);
    await driver.open();
    await shot('with no IEDs');
  });

  it('with a search', async () => {
    await mountSample();
    await driver.open();
    await driver.search('DEMO_BOUND');
    expect(driver.visibleIeds()).to.deep.equal([BOUND_A, BOUND_B]);
    await shot('with a search');
  });

  it('in a dark theme', async () => {
    await mountSample();
    const { plugin } = mounted;
    plugin.style.setProperty('--oscd-theme-base03', '#002b36');
    plugin.style.setProperty('--oscd-theme-base02', '#073642');
    plugin.style.setProperty('--oscd-theme-base01', '#586e75');
    plugin.style.setProperty('--oscd-theme-base00', '#93a1a1');
    plugin.style.setProperty('--oscd-theme-base0', '#839496');
    plugin.style.setProperty('--oscd-theme-base1', '#93a1a1');
    plugin.style.setProperty('--oscd-theme-base2', '#073642');
    plugin.style.setProperty('--oscd-theme-base3', '#002b36');
    plugin.style.setProperty('--oscd-theme-primary', '#2aa198');
    plugin.style.setProperty('--oscd-theme-secondary', '#6c71c4');
    plugin.style.setProperty('--oscd-theme-warning', '#b58900');
    await driver.open();
    await shot('in a dark theme');
  });

  it('with no additional options', async () => {
    await mountSample();
    await driver.open();
    await driver.select(UNBOUND);
    expect(driver.options()).to.deep.equal([]);
    await shot('with no additional options');
  });
});
