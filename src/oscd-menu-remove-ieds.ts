import { css, html, LitElement, nothing, type PropertyValues } from 'lit';
import { property, query, state } from 'lit/decorators.js';

import { msg, str } from '@lit/localize';
import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';
import { OscdAceEditor } from '@omicronenergy/oscd-ui/ace-editor/OscdAceEditor.js';
import { OscdCheckbox } from '@omicronenergy/oscd-ui/checkbox/OscdCheckbox.js';
import { OscdDialog } from '@omicronenergy/oscd-ui/dialog/OscdDialog.js';
import { OscdDivider } from '@omicronenergy/oscd-ui/divider/OscdDivider.js';
import { OscdFilledButton } from '@omicronenergy/oscd-ui/button/OscdFilledButton.js';
import { OscdIcon } from '@omicronenergy/oscd-ui/icon/OscdIcon.js';
import {
  OscdSelectionList,
  type SelectItem,
} from '@omicronenergy/oscd-ui/selection-list/OscdSelectionList.js';
import { OscdTextButton } from '@omicronenergy/oscd-ui/button/OscdTextButton.js';

import { isPublic } from '@openscd/scl-lib';
import { newEditEventV2 } from '@openscd/oscd-api/utils.js';

import { getIedDescription, getIedHeadline } from './foundation/ied-description.js';
import { checkForEmptyCommunicationContainers } from './foundation/removal-checks.js';
import {
  iedRemovalEdits,
  removalSummary,
  sectionRemovalEdits,
  wouldEmptyCommunication,
} from './foundation/removal-plan.js';
import OscdRemovalConfirmation from './oscd-removal-confirmation.js';
import { oscdPaletteMd3 } from './theme.js';

import type { RemovalSummary } from './foundation/removal-plan.js';

/** A menu plugin to remove IEDs from SCL files. */
export default class OscdMenuRemoveIeds extends ScopedElementsMixin(LitElement) {
  static scopedElements = {
    'oscd-ace-editor': OscdAceEditor,
    'oscd-checkbox': OscdCheckbox,
    'oscd-dialog': OscdDialog,
    'oscd-divider': OscdDivider,
    'oscd-filled-button': OscdFilledButton,
    'oscd-icon': OscdIcon,
    'oscd-removal-confirmation': OscdRemovalConfirmation,
    'oscd-selection-list': OscdSelectionList,
    'oscd-text-button': OscdTextButton,
  };

  /** The document being edited as provided to plugins by the host. */
  @property({ attribute: false })
  doc!: XMLDocument;

  /** SCL change indicator. */
  @property({ attribute: false })
  docVersion?: unknown;

  @state()
  items: SelectItem[] = [];

  @state()
  private hasSelection = false;

  @state()
  private hasBoundLNodes = false;

  @state()
  private preserveLNodes = true;

  @state()
  private affectedSubNetworks: Element[] = [];

  @state()
  private deletedSubNetworks = new Set<Element>();

  @state()
  private affectedCommunication: Element | null = null;

  @state()
  private deleteCommunication = false;

  @state()
  private reviewElement: Element | null = null;

  @state()
  private optionsExpanded = false;

  @state()
  private confirmationSummary: RemovalSummary | null = null;

  @query('#selection-dialog')
  dialogUI!: OscdDialog;

  @query('#selection-list')
  selectionList!: OscdSelectionList | null;

  @query('#remove-lnodes')
  private lNodeCheckbox!: OscdCheckbox;

  @query('#review-dialog')
  private reviewDialog!: OscdDialog;

  @query('#confirmation-dialog')
  private confirmationDialog!: OscdRemovalConfirmation;

  private boundIedNames = new Set<string>();

  willUpdate(changedProperties: PropertyValues): void {
    if (
      !changedProperties.has('doc') &&
      !changedProperties.has('docVersion')
    ) {
      return;
    }
    const docChanged = changedProperties.has('doc');
    const selectedNames = docChanged ? new Set<string>() : this.selectedIedNames();
    this.refreshItems(selectedNames);
    if (docChanged) {
      this.resetSelectionState();
      return;
    }
    this.applySelection(
      this.items
        .filter(item => item.selected)
        .map(item => item.attachedElement)
        .filter((element): element is Element => element !== undefined),
    );
  }

  private handleSelectionChange(): void {
    this.applySelection(this.selectionList?.selectedElements ?? []);
  }

  private handleRemoveLNodesChange(): void {
    this.preserveLNodes = !this.lNodeCheckbox.checked;
  }

  private handleDeleteSubNetworkChange(network: Element, event: Event): void {
    const checkbox = event.target;
    if (!(checkbox instanceof OscdCheckbox)) {
      return;
    }
    const deleted = new Set(this.deletedSubNetworks);
    if (checkbox.checked) {
      deleted.add(network);
    } else {
      deleted.delete(network);
    }
    this.deletedSubNetworks = deleted;
    if (!this.emptiesCommunication) {
      this.deleteCommunication = false;
    }
  }

  private handleDeleteCommunicationChange(event: Event): void {
    if (event.target instanceof OscdCheckbox) {
      this.deleteCommunication = event.target.checked;
    }
  }

  private handleDialogClosed(): void {
    this.optionsExpanded = false;
    this.clearSelection();
  }

  private configureAceEditor(): void {
    const viewer = this.reviewDialog.querySelector('oscd-ace-editor');
    if (viewer instanceof OscdAceEditor && viewer.editor !== undefined) {
      viewer.editor.setReadOnly(true);
      viewer.aceEditorBase.readonly = true;
      viewer.editor.resize();
    }
  }

  private async handleReviewSCL(element: Element): Promise<void> {
    this.reviewElement = element;
    await this.updateComplete;
    await this.reviewDialog.show();
    this.configureAceEditor();
  }

  private async handleRemove(): Promise<void> {
    if (!this.hasSelection) {
      return;
    }
    if (this.affectedSubNetworks.length === 0) {
      await this.removeIEDs();
      return;
    }
    this.confirmationSummary = removalSummary({
      ieds: this.selectionList?.selectedElements ?? [],
      hasBoundLNodes: this.hasBoundLNodes,
      preserveLNodes: this.preserveLNodes,
      communication: this.affectedCommunication,
      affectedSubNetworks: this.affectedSubNetworks,
      deletedSubNetworks: this.deletedSubNetworks,
      deleteCommunication: this.deleteCommunication,
    });
    await this.updateComplete;
    await this.confirmationDialog.show();
  }

  private async handleConfirmRemoval(): Promise<void> {
    await this.confirmationDialog.close();
    await this.removeIEDs();
  }

  private get emptiesCommunication(): boolean {
    return wouldEmptyCommunication(
      this.affectedCommunication,
      this.affectedSubNetworks,
      this.deletedSubNetworks,
    );
  }

  private selectedIedNames(): Set<string> {
    return new Set(
      (this.selectionList?.selectedElements ?? [])
        .map(ied => ied.getAttribute('name'))
        .filter((name): name is string => name !== null),
    );
  }

  private refreshItems(selectedNames: Set<string>): void {
    this.boundIedNames = new Set(
      Array.from(this.doc?.querySelectorAll('Substation LNode') ?? [])
        .filter(isPublic)
        .map(ln => ln.getAttribute('iedName'))
        .filter((name): name is string => name !== null && name !== 'None'),
    );
    this.items = Array.from(this.doc?.querySelectorAll('IED') ?? []).map(
      (ied) => {
        const { secondLine } = getIedDescription(ied);
        const name = ied.getAttribute('name') ?? '';
        return {
          headline: getIedHeadline(ied),
          supportingText: secondLine,
          attachedElement: ied,
          selected: selectedNames.has(name),
        };
      },
    );
  }

  private applySelection(selected: Element[]): void {
    this.hasSelection = selected.length > 0;
    this.hasBoundLNodes = selected.some(ied =>
      this.boundIedNames.has(ied.getAttribute('name') ?? ''),
    );
    if (!this.hasBoundLNodes) {
      this.preserveLNodes = true;
    }
    const impact = checkForEmptyCommunicationContainers(this.doc, selected);
    this.affectedSubNetworks = impact.subNetworks;
    this.affectedCommunication = impact.communication;
    this.optionsExpanded =
      this.hasBoundLNodes || this.affectedSubNetworks.length > 0;
    this.deletedSubNetworks = new Set(
      Array.from(this.deletedSubNetworks).filter(network =>
        this.affectedSubNetworks.includes(network),
      ),
    );
    if (!this.emptiesCommunication) {
      this.deleteCommunication = false;
    }
  }

  private resetSelectionState(): void {
    this.hasSelection = false;
    this.hasBoundLNodes = false;
    this.preserveLNodes = true;
    this.optionsExpanded = false;
    this.resetRemovalChecks();
  }

  private resetRemovalChecks(): void {
    this.affectedSubNetworks = [];
    this.deletedSubNetworks = new Set();
    this.affectedCommunication = null;
    this.deleteCommunication = false;
  }

  private clearSelection(): void {
    this.items = this.items.map(item => ({ ...item, selected: false }));
    if (this.selectionList !== null) {
      this.selectionList.items = this.items;
      this.selectionList.searchValue = '';
    }
    this.resetSelectionState();
  }

  async run(): Promise<void> {
    this.clearSelection();
    await this.updateComplete;
    await this.dialogUI.show();
  }

  async removeIEDs(): Promise<void> {
    const ieds = this.selectionList?.selectedElements ?? [];
    if (ieds.length === 0) {
      return;
    }
    const preserveLNodes = this.preserveLNodes;
    const deleted = Array.from(this.deletedSubNetworks);
    const communication =
      this.emptiesCommunication && this.deleteCommunication
        ? this.affectedCommunication
        : null;
    let squash = false;

    for (const ied of ieds) {
      this.dispatchEvent(
        newEditEventV2(iedRemovalEdits(ied, preserveLNodes), {
          title: msg('Remove IEDs'),
          squash,
        }),
      );
      squash = true;
    }
    if (deleted.length > 0) {
      this.dispatchEvent(
        newEditEventV2(sectionRemovalEdits(communication, deleted), {
          title: msg('Remove IEDs'),
          squash,
        }),
      );
    }

    this.clearSelection();
    await this.dialogUI.close();
  }

  private renderRemovalOptions() {
    if (!this.hasBoundLNodes && this.affectedSubNetworks.length === 0) {
      return nothing;
    }
    return html`
      <h3>${msg('Removal options')}</h3>
      ${this.hasBoundLNodes
        ? html`
            <label class="option">
              <oscd-checkbox
                id="remove-lnodes"
                .checked=${!this.preserveLNodes}
                @change=${this.handleRemoveLNodesChange}
              ></oscd-checkbox>
              ${msg('Delete associated LNodes')}
            </label>
          `
        : nothing}
      ${this.affectedSubNetworks.length > 0
        ? html`
            <section aria-label=${msg('Affected communication sections')}>
              ${this.affectedSubNetworks.map(
                network => html`
                  <div class="option-row">
                    <label class="option">
                      <oscd-checkbox
                        class="delete-network"
                        .checked=${this.deletedSubNetworks.has(network)}
                        @change=${(event: Event) =>
                          this.handleDeleteSubNetworkChange(network, event)}
                      ></oscd-checkbox>
                      <oscd-icon class="warning-icon" aria-hidden="true"
                        >warning</oscd-icon
                      >
                      ${msg(
                        str`Delete empty SubNetwork "${network.getAttribute(
                          'name',
                        )}"`,
                      )}
                    </label>
                    <oscd-text-button
                      type="button"
                      class="review-network"
                      @click=${() => this.handleReviewSCL(network)}
                      aria-label=${msg(
                        str`Review SCL for SubNetwork ${network.getAttribute(
                          'name',
                        )}`,
                      )}
                      >${msg('Review SCL...')}</oscd-text-button
                    >
                  </div>
                `,
              )}
              ${this.emptiesCommunication
                ? html`
                    <div class="option-row">
                      <label class="option">
                        <oscd-checkbox
                          id="delete-communication"
                          .checked=${this.deleteCommunication}
                          @change=${this.handleDeleteCommunicationChange}
                        ></oscd-checkbox>
                        <oscd-icon class="warning-icon" aria-hidden="true"
                          >warning</oscd-icon
                        >
                        ${msg('Delete empty Communication section too')}
                      </label>
                      <oscd-text-button
                        type="button"
                        id="review-communication"
                        @click=${() => {
                          if (this.affectedCommunication !== null) {
                            this.handleReviewSCL(this.affectedCommunication);
                          }
                        }}
                        aria-label=${msg('Review SCL for Communication')}
                        >${msg('Review SCL...')}</oscd-text-button
                      >
                    </div>
                  `
                : nothing}
            </section>
          `
        : nothing}
    `;
  }

  private renderConfirmation() {
    return html`
      <oscd-removal-confirmation
        id="confirmation-dialog"
        .summary=${this.confirmationSummary}
        @confirm=${this.handleConfirmRemoval}
      ></oscd-removal-confirmation>
    `;
  }

  private renderReview() {
    const element = this.reviewElement;
    const isNetwork = element?.tagName === 'SubNetwork';
    const section = isNetwork
      ? msg(str`SubNetwork "${element.getAttribute('name')}"`)
      : msg('Communication');
    return html`
      <oscd-dialog
        id="review-dialog"
        @closed=${() => {
          this.reviewElement = null;
        }}
      >
        <div slot="headline">${msg(str`Review ${section} removal`)}</div>
        <div slot="content" class="review-content">
          <p>
            ${isNetwork
              ? msg(
                'Removing the selected IEDs will remove the last ConnectedAP in this network. Keeping it leaves a schema violation.',
              )
              : msg(
                'Deleting the selected SubNetworks will remove the last SubNetwork in Communication. Keeping Communication then leaves a schema violation.',
              )}
            ${msg(
              'Deleting this section also removes all remaining contents, including metadata and Private data. Review the current SCL below before deciding.',
            )}
          </p>
          ${element !== null
            ? html`
                <oscd-ace-editor
                  .value=${new XMLSerializer().serializeToString(element)}
                  @ready=${this.configureAceEditor}
                ></oscd-ace-editor>
              `
            : nothing}
        </div>
        <div slot="actions">
          <oscd-text-button type="button" @click=${() => this.reviewDialog.close()}
            >${msg('Close')}</oscd-text-button
          >
        </div>
      </oscd-dialog>
    `;
  }

  render() {
    return html`<oscd-dialog
        id="selection-dialog"
        @closed=${this.handleDialogClosed}
      >
        <div slot="headline">${msg('Remove IEDs')}</div>
        <form
          slot="content"
          id="selection"
          method="dialog"
          class=${this.optionsExpanded ? 'options-expanded' : ''}
        >
          <p>
            ${msg(
              'Select the IEDs to remove from this SCL document. By default, associated LNodes are preserved with iedName="None", merging duplicates.',
            )}
          </p>
          <h3 class="selection-heading">${msg('Select IEDs')}</h3>
          <oscd-divider></oscd-divider>
          ${this.items.length === 0
            ? html`<p class="empty-selection">
                ${msg('This document has no IEDs.')}
              </p>`
            : html`
                <oscd-selection-list
                  id="selection-list"
                  multiselect
                  .items=${this.items}
                  .searchhelper=${msg('Search IEDs')}
                  aria-label=${msg('IEDs in the document')}
                  @selection-list-change=${this.handleSelectionChange}
                  filterable
                ></oscd-selection-list>
              `}
          <oscd-divider></oscd-divider>
          <div
            class="removal-options"
            ?inert=${!this.optionsExpanded}
            aria-label=${msg('Additional removal options')}
          >
            ${this.renderRemovalOptions()}
          </div>
        </form>
        <div slot="actions">
          <oscd-text-button
            type="button"
            @click=${() => {
              this.dialogUI.close();
            }}
            >${msg('Cancel')}</oscd-text-button
          >
          <oscd-filled-button
            .disabled=${!this.hasSelection}
            @click=${() => {
              this.handleRemove();
            }}
            type="button"
            >${msg('Remove')}</oscd-filled-button
          >
        </div>
      </oscd-dialog>
      ${this.renderReview()}${this.renderConfirmation()}`;
  }

  static styles = [
    oscdPaletteMd3,
    css`
      /*
       * The internal palette comes from the distro's --oscd-theme-* variables
       * with defaults, and the oscd-ui components are pointed at it.
       */
      :host {
        --oscd-primary: var(--oscd-theme-primary, #2aa198);
        --oscd-secondary: var(--oscd-theme-secondary, #6c71c4);
        --oscd-error: var(--oscd-theme-error, #dc322f);
        --oscd-warning: var(--oscd-theme-warning, #b58900);

        --oscd-base03: var(--oscd-theme-base03, #002b36);
        --oscd-base02: var(--oscd-theme-base02, #073642);
        --oscd-base01: var(--oscd-theme-base01, #586e75);
        --oscd-base00: var(--oscd-theme-base00, #657b83);
        --oscd-base0: var(--oscd-theme-base0, #839496);
        --oscd-base1: var(--oscd-theme-base1, #93a1a1);
        --oscd-base2: var(--oscd-theme-base2, #eee8d5);
        --oscd-base3: var(--oscd-theme-base3, #fdf6e3);

        --oscd-text-font: var(--oscd-theme-text-font, 'Roboto');
        --oscd-icon-font: var(
          --oscd-theme-icon-font,
          'Material Symbols Outlined'
        );
      }

      :host {
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        height: 100%;
        font-family: var(--oscd-text-font), sans-serif;
        color: var(--md-sys-color-on-surface);
      }

      #selection-dialog {
        max-height: 90dvh;
      }

      form {
        display: grid;
        grid-template-rows: auto auto auto minmax(0, 1fr) auto minmax(0, 0fr);
        height: min(600px, 70dvh);
        padding: 0;
        margin-block-end: 0;
        transition: grid-template-rows 180ms ease-out;
      }

      form.options-expanded {
        grid-template-rows: auto auto auto minmax(0, 1fr) auto minmax(0, 0.8fr);
      }

      form p {
        margin: 16px 24px;
      }

      .empty-selection {
        margin: 24px;
      }

      .option {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        padding: 12px 16px;
        min-height: 56px;
        box-sizing: border-box;
        flex: 1;
      }

      .removal-options {
        min-height: 0;
        overflow-y: auto;
      }

      h3 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 16px;
        font: inherit;
        font-weight: 600;
      }

      .warning-icon {
        color: var(--oscd-warning);
      }

      .option-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding-inline-end: 16px;
      }

      #review-dialog {
        width: min(900px, 90vw);
        max-width: 90vw;
      }

      .review-content {
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
        height: min(400px, 60dvh);
      }

      .review-content oscd-ace-editor {
        min-height: 0;
        height: 100%;
      }

      #selection-list {
        display: block;
        min-height: 0;
        overflow-y: auto;
        background: var(--md-sys-color-surface);
      }

      @media (prefers-reduced-motion: reduce) {
        form {
          transition: none;
        }
      }
    `,
  ];
}
