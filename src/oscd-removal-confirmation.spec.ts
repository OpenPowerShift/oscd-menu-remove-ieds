import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import { OscdFilledButton } from '@omicronenergy/oscd-ui/button/OscdFilledButton.js';
import { OscdTextButton } from '@omicronenergy/oscd-ui/button/OscdTextButton.js';
import { OscdDialog } from '@omicronenergy/oscd-ui/dialog/OscdDialog.js';
import { OscdIcon } from '@omicronenergy/oscd-ui/icon/OscdIcon.js';

import OscdRemovalConfirmation from './oscd-removal-confirmation.js';

import type { RemovalSummary } from './oscd-removal-confirmation.js';

customElements.define('oscd-removal-confirmation', OscdRemovalConfirmation);

describe('oscd-removal-confirmation', () => {
  let confirmation: OscdRemovalConfirmation;
  let summary: RemovalSummary;

  beforeEach(async () => {
    summary = {
      iedNames: ['IED1', 'IED2'],
      hasBoundLNodes: true,
      preserveLNodes: true,
      deletedSubNetworks: ['StationBus'],
      retainedSubNetworks: ['ProcessBus'],
      deleteCommunication: false,
      retainCommunication: false,
    };
    confirmation = await fixture(html`
      <oscd-removal-confirmation .summary=${summary}></oscd-removal-confirmation>
    `);
  });

  it('summarizes IEDs, LNode handling, metadata loss and retained empty networks', () => {
    const content = confirmation.shadowRoot!.querySelector('[slot="content"]')!;
    expect(content.textContent).to.contain('The following will be removed:');
    expect(content.querySelector('p')?.querySelector('strong')).to.equal(null);
    expect(Array.from(content.querySelectorAll('strong')).map(item => item.textContent))
      .to.include.members(['IEDs:', 'SubNetworks:']);
    expect(Array.from(content.querySelectorAll('.ied-names li')).map(item => item.textContent))
      .to.deep.equal(['IED1', 'IED2']);
    expect(content.textContent).to.contain('Unique associated LNodes will be preserved');
    expect(content.querySelector('.ied-names')?.nextElementSibling?.textContent)
      .to.contain('Unique associated LNodes will be preserved');
    expect(content.textContent).not.to.contain('All LNodes bound');
    expect(Array.from(content.querySelectorAll('.subnetwork-names li')).map(item => item.textContent))
      .to.deep.equal(['StationBus']);
    expect(content.textContent).to.contain('metadata and Private data');
    expect(content.querySelector('.warning:not(.deletion-warning)')?.textContent).to.contain('ProcessBus');
    expect(content.querySelector('.warning:not(.deletion-warning)')?.textContent).to.contain('violates the SCL schema');
    expect(getComputedStyle(content.querySelector('.warning em')!).fontStyle).to.equal('italic');
    expect(content.textContent).not.to.contain('The entire section (including ALL SubNetworks)');
    expect(content.textContent).to.contain('review the ConnectedAPs first');
  });

  it('distinguishes retaining empty Communication from deleting it', async () => {
    confirmation.summary = { ...summary, preserveLNodes: false, retainedSubNetworks: [], retainCommunication: true };
    await confirmation.updateComplete;
    expect(confirmation.shadowRoot!.textContent).to.contain('All LNodes bound to the IEDs above.');
    expect(confirmation.shadowRoot!.querySelector('.ied-names')?.nextElementSibling?.textContent)
      .to.contain('All LNodes bound to the IEDs above.');
    expect(Array.from(confirmation.shadowRoot!.querySelectorAll('strong')).map(item => item.textContent))
      .to.include('LNodes:');
    expect(confirmation.shadowRoot!.textContent).not.to.contain('will be preserved');
    expect(confirmation.shadowRoot!.textContent).to.contain('Retain Communication without SubNetworks');
    expect(getComputedStyle(confirmation.shadowRoot!.querySelector('.warning em')!).fontStyle).to.equal('italic');
    confirmation.summary = { ...summary, retainedSubNetworks: [], deleteCommunication: true };
    await confirmation.updateComplete;
    expect(confirmation.shadowRoot!.textContent).to.contain('The entire section (including ALL SubNetworks)');
    expect(Array.from(confirmation.shadowRoot!.querySelectorAll('strong')).map(item => item.textContent))
      .to.include('Communication:');
    expect(confirmation.shadowRoot!.querySelector('.subnetwork-names')).to.equal(null);
    expect(confirmation.shadowRoot!.querySelector('.warning:not(.deletion-warning)')).to.equal(null);
  });

  it('omits both LNode messages when the checkbox was not available', async () => {
    for (const preserveLNodes of [true, false]) {
      confirmation.summary = { ...summary, hasBoundLNodes: false, preserveLNodes };
      await confirmation.updateComplete;
      expect(confirmation.shadowRoot!.textContent).not.to.contain('Unique associated LNodes');
      expect(confirmation.shadowRoot!.textContent).not.to.contain('All LNodes bound');
    }
  });

  it('styles deleted-section data loss with the warning bar and normal text color', async () => {
    confirmation.style.setProperty('--oscd-warning', 'rgb(180, 120, 0)');
    confirmation.style.setProperty('--md-sys-color-on-surface', 'rgb(20, 20, 20)');
    await confirmation.show();
    const warning = confirmation.shadowRoot!.querySelector('.deletion-warning')!;
    expect(warning.textContent).to.contain('metadata and Private data');
    expect(getComputedStyle(warning).borderInlineStartColor).to.equal('rgb(180, 120, 0)');
    expect(getComputedStyle(warning).borderInlineStartWidth).to.equal('4px');
    expect(getComputedStyle(warning).paddingInlineStart).to.equal('12px');
    expect(getComputedStyle(warning).color).to.equal('rgb(20, 20, 20)');
    confirmation.summary = { ...summary, deletedSubNetworks: [], deleteCommunication: true };
    await confirmation.updateComplete;
    expect(confirmation.shadowRoot!.querySelector('.deletion-warning')?.textContent)
      .to.contain('metadata and Private data');
    confirmation.summary = { ...summary, deletedSubNetworks: [] };
    await confirmation.updateComplete;
    expect(confirmation.shadowRoot!.querySelector('.deletion-warning')).to.equal(null);
    await confirmation.close();
  });

  it('lists each deleted SubNetwork separately in selection order', async () => {
    confirmation.summary = {
      ...summary,
      deletedSubNetworks: ['StationBus', 'ProcessBus'],
      retainedSubNetworks: [],
    };
    await confirmation.updateComplete;
    expect(Array.from(confirmation.shadowRoot!.querySelectorAll('.subnetwork-names li'))
      .map(item => item.textContent)).to.deep.equal(['StationBus', 'ProcessBus']);
  });

  it('uses a decorative warning icon and theme tokens for contrasting content', async () => {
    confirmation.style.setProperty('--md-sys-color-surface', 'rgb(245, 245, 245)');
    confirmation.style.setProperty('--md-sys-color-on-surface', 'rgb(20, 20, 20)');
    confirmation.style.setProperty('--oscd-theme-warning', 'rgb(180, 120, 0)');
    await confirmation.show();
    const root = confirmation.shadowRoot!;
    const icon = root.querySelector('[slot="headline"] oscd-icon');
    expect(icon).to.be.instanceOf(OscdIcon);
    expect(icon?.getAttribute('aria-hidden')).to.equal('true');
    expect(icon?.textContent).to.equal('warning');
    expect(getComputedStyle(icon!).color).to.equal('rgb(180, 120, 0)');
    expect(getComputedStyle(icon!).fontSize).to.equal('32px');
    expect(root.querySelector('[slot="headline"]')?.textContent).to.contain('Review removal impacts');
    expect(root.querySelector('[slot="icon"]')).to.equal(null);
    const content = root.querySelector('[slot="content"]')!;
    expect(getComputedStyle(content).backgroundColor).to.equal('rgb(245, 245, 245)');
    expect(getComputedStyle(content).color).to.equal('rgb(20, 20, 20)');
    confirmation.style.setProperty('--md-sys-color-surface', 'rgb(25, 25, 25)');
    confirmation.style.setProperty('--md-sys-color-on-surface', 'rgb(230, 230, 230)');
    expect(getComputedStyle(content).backgroundColor).to.equal('rgb(25, 25, 25)');
    expect(getComputedStyle(content).color).to.equal('rgb(230, 230, 230)');
    await confirmation.close();
  });

  it('balances headline padding and uses the resolved warning color without coloring warning text', async () => {
    confirmation.style.setProperty('--oscd-warning', 'rgb(180, 120, 0)');
    confirmation.style.setProperty('--md-sys-color-on-surface', 'rgb(20, 20, 20)');
    await confirmation.show();
    const root = confirmation.shadowRoot!;
    const headline = root.querySelector('.confirmation-headline')!;
    const headlineStyle = getComputedStyle(headline);
    expect(headlineStyle.paddingTop).to.equal('24px');
    expect(headlineStyle.paddingBottom).to.equal(headlineStyle.paddingTop);
    const icon = root.querySelector('.warning-icon')!;
    expect(getComputedStyle(icon).color).to.equal('rgb(180, 120, 0)');
    expect(getComputedStyle(icon).width).to.equal('32px');
    const warning = root.querySelector('.warning')!;
    expect(getComputedStyle(warning).borderInlineStartColor).to.equal('rgb(180, 120, 0)');
    expect(getComputedStyle(warning).color).to.equal('rgb(20, 20, 20)');
    confirmation.style.setProperty('--oscd-theme-warning', 'rgb(150, 100, 0)');
    expect(getComputedStyle(icon).color).to.equal('rgb(150, 100, 0)');
    expect(getComputedStyle(warning).borderInlineStartColor).to.equal('rgb(150, 100, 0)');
    await confirmation.close();
  });

  it('emits a bubbling, composed confirm event only on explicit confirmation', async () => {
    let confirmed: Event | undefined;
    confirmation.addEventListener('confirm', (event) => {
      confirmed = event;
    });
    await confirmation.show();
    const button = confirmation.shadowRoot!.querySelector('oscd-filled-button');
    if (!(button instanceof OscdFilledButton)) {
      throw new Error('Missing confirm button');
    }
    expect(button.textContent?.trim()).to.equal('Confirm');
    button.click();
    expect(confirmed?.bubbles).to.be.true;
    expect(confirmed?.composed).to.be.true;
    await confirmation.close();
  });

  it('returns on Back without confirming or changing the summary', async () => {
    let confirmed = false;
    confirmation.addEventListener('confirm', () => {
      confirmed = true;
    });
    await confirmation.show();
    const back = confirmation.shadowRoot!.querySelector('oscd-text-button');
    if (!(back instanceof OscdTextButton)) {
      throw new Error('Missing Back button');
    }
    expect(back.textContent?.trim()).to.equal('Back');
    back.click();
    await waitUntil(() => !confirmation.open);
    expect(confirmed).to.be.false;
    expect(confirmation.summary).to.equal(summary);
  });

  it('uses the dialog scroller alone for long summaries', async () => {
    confirmation.summary = { ...summary, iedNames: Array.from({ length: 150 }, (_, index) => `IED_${index}`) };
    await confirmation.show();
    const dialog = confirmation.shadowRoot!.querySelector('oscd-dialog');
    if (!(dialog instanceof OscdDialog)) {
      throw new Error('Missing dialog');
    }
    const scroller = dialog.shadowRoot!.querySelector('.scroller')!;
    expect(scroller.clientHeight).to.be.greaterThan(0);
    expect(scroller.scrollHeight).to.be.greaterThan(scroller.clientHeight);
    const content = confirmation.shadowRoot!.querySelector('[slot="content"]')!;
    expect(content.scrollHeight).to.be.at.most(content.clientHeight + 1);
    await confirmation.close();
  });
});
