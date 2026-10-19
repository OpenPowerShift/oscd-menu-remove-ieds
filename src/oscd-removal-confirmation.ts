import { css, html, LitElement, nothing } from 'lit';
import { property, query } from 'lit/decorators.js';
import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';
import { OscdDialog } from '@omicronenergy/oscd-ui/dialog/OscdDialog.js';
import { OscdTextButton } from '@omicronenergy/oscd-ui/button/OscdTextButton.js';
import { OscdFilledButton } from '@omicronenergy/oscd-ui/button/OscdFilledButton.js';
import { OscdIcon } from '@omicronenergy/oscd-ui/icon/OscdIcon.js';

export interface RemovalSummary {
  iedNames: string[];
  hasBoundLNodes: boolean;
  preserveLNodes: boolean;
  deletedSubNetworks: string[];
  retainedSubNetworks: string[];
  deleteCommunication: boolean;
  retainCommunication: boolean;
}

export default class OscdRemovalConfirmation extends ScopedElementsMixin(LitElement) {
  static scopedElements = {
    'oscd-dialog': OscdDialog,
    'oscd-text-button': OscdTextButton,
    'oscd-filled-button': OscdFilledButton,
    'oscd-icon': OscdIcon,
  };

  @property({ attribute: false })
  summary: RemovalSummary | null = null;

  @query('oscd-dialog')
  private dialogUI!: OscdDialog;

  private handleConfirm(): void {
    if (this.summary === null) {
      return;
    }
    this.dispatchEvent(new CustomEvent('confirm', { bubbles: true, composed: true }));
  }

  get open(): boolean {
    return this.dialogUI?.open ?? false;
  }

  async show(): Promise<void> {
    await this.updateComplete;
    await this.dialogUI.show();
  }

  async close(): Promise<void> {
    await this.dialogUI.close();
  }

  render() {
    const summary = this.summary;
    return html`
      <oscd-dialog>
        <div slot="headline" class="confirmation-headline">
          <oscd-icon class="warning-icon" aria-hidden="true">warning</oscd-icon>
          Review removal impacts
        </div>
        <div slot="content" class="confirmation-content">
          ${summary !== null ? html`
            <p>The following will be removed:</p>
            <p><strong>IEDs:</strong></p>
            <ul class="ied-names">
              ${summary.iedNames.map(name => html`<li>${name}</li>`)}
            </ul>
            ${summary.hasBoundLNodes ? summary.preserveLNodes ? html`
              <p>Unique associated LNodes will be preserved with iedName="None",
                removing any duplicates.</p>
            ` : html`
              <p><strong>LNodes:</strong> All LNodes bound to the IEDs above.</p>
            ` : nothing}
            ${summary.deleteCommunication ? html`
              <p><strong>Communication:</strong> The entire section (including ALL SubNetworks).</p>
            ` : summary.deletedSubNetworks.length > 0 ? html`
              <p><strong>SubNetworks:</strong></p>
              <ul class="subnetwork-names">
                ${summary.deletedSubNetworks.map(name => html`<li>${name}</li>`)}
              </ul>
            ` : nothing}
            ${summary.deleteCommunication || summary.deletedSubNetworks.length > 0 ? html`
              <div class="warning deletion-warning">
                <p>Deleted sections lose all their contents, including metadata and Private data.</p>
              </div>
            ` : nothing}
            <div class=${summary.retainedSubNetworks.length > 0 || summary.retainCommunication ? 'warning' : 'notice'}>
              ${summary.retainedSubNetworks.length > 0 ? html`
                <p>Retained SubNetworks: ${summary.retainedSubNetworks.join(', ')}.
                  <br><em>This violates the SCL schema.</em></p>` : nothing}
              ${summary.retainCommunication ? html`
                <p>Retain Communication without SubNetworks. <br><em>This violates the SCL schema.</em></p>
              ` : nothing}
            </div>
            <p><strong>Tip:</strong> To avoid potential data loss and/or empty sections,
              cancel this operation and review the ConnectedAPs first.</p>
          ` : nothing}
        </div>
        <div slot="actions">
          <oscd-text-button type="button" @click=${this.close}>Back</oscd-text-button>
          <oscd-filled-button type="button" .disabled=${summary === null}
            @click=${this.handleConfirm}>Confirm</oscd-filled-button>
        </div>
      </oscd-dialog>
    `;
  }

  static styles = css`
    oscd-dialog > .confirmation-headline {
      padding-block: 24px;
    }

    .confirmation-headline > .warning-icon {
      --md-icon-size: 32px;
      color: var(--oscd-theme-warning, var(--oscd-warning, var(--md-sys-color-on-surface)));
    }

    oscd-dialog > .confirmation-content {
      background: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface);
    }

    .ied-names,
    .subnetwork-names {
      overflow-wrap: anywhere;
    }

    .confirmation-content > .warning {
      border-inline-start: 4px solid var(--oscd-theme-warning, var(--oscd-warning, var(--md-sys-color-on-surface)));
      padding-inline-start: 12px;
    }
  `;
}
