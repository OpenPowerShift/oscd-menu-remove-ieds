import { css, html, LitElement, nothing, type PropertyValues } from 'lit';
import { property, query, state } from 'lit/decorators.js';

import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';
import { OscdDialog } from '@omicronenergy/oscd-ui/dialog/OscdDialog.js';
import { OscdDivider } from '@omicronenergy/oscd-ui/divider/OscdDivider.js';
import { OscdTextButton } from '@omicronenergy/oscd-ui/button/OscdTextButton.js';
import { OscdFilledButton } from '@omicronenergy/oscd-ui/button/OscdFilledButton.js';
import { OscdCheckbox } from '@omicronenergy/oscd-ui/checkbox/OscdCheckbox.js';
import { OscdAceEditor } from '@omicronenergy/oscd-ui/ace-editor/OscdAceEditor.js';
import { OscdIcon } from '@omicronenergy/oscd-ui/icon/OscdIcon.js';
import {
  OscdSelectionList,
  type SelectItem,
} from '@omicronenergy/oscd-ui/selection-list/OscdSelectionList.js';

import { isPublic, removeIED } from '@openscd/scl-lib';
import { newEditEventV2 } from '@openscd/oscd-api/utils.js';

import { checkForEmptyCommunicationContainers } from './foundation/removal-checks.js';
import OscdRemovalConfirmation from './oscd-removal-confirmation.js';

import type { RemovalSummary } from './oscd-removal-confirmation.js';

function getIedDescription(ied: Element): {
  firstLine: string;
  secondLine: string;
} {
  const [
    manufacturer,
    type,
    desc,
    configVersion,
    originalSclVersion,
    originalSclRevision,
    originalSclRelease,
  ] = [
    'manufacturer',
    'type',
    'desc',
    'configVersion',
    'originalSclVersion',
    'originalSclRevision',
    'originalSclRelease',
  ].map(attr => ied?.getAttribute(attr));

  const firstLine = [manufacturer, type]
    .filter(val => val !== null)
    .join(' - ');

  const schemaInformation = [
    originalSclVersion,
    originalSclRevision,
    originalSclRelease,
  ]
    .filter(val => val !== null)
    .join('');

  const secondLine = [desc, configVersion, schemaInformation]
    .filter(val => val !== null)
    .join(' - ');

  return { firstLine, secondLine };
}

/** A menu plugin to remove IEDs from SCL files */
export default class OscdMenuRemoveIeds extends ScopedElementsMixin(LitElement) {
  static scopedElements = {
    'oscd-dialog': OscdDialog,
    'oscd-divider': OscdDivider,
    'oscd-text-button': OscdTextButton,
    'oscd-filled-button': OscdFilledButton,
    'oscd-checkbox': OscdCheckbox,
    'oscd-selection-list': OscdSelectionList,
    'oscd-ace-editor': OscdAceEditor,
    'oscd-icon': OscdIcon,
    'oscd-removal-confirmation': OscdRemovalConfirmation,
  };

  /** The document being edited as provided to plugins by [[`OpenSCD`]]. */
  @property({ attribute: false })
  doc!: XMLDocument;

  /** SCL change indicator */
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

  @query('#selection-dialog') dialogUI!: OscdDialog;

  @query('#selection-list') selectionList!: OscdSelectionList;

  @query('#remove-lnodes') private lNodeCheckbox!: OscdCheckbox;

  @query('#review-dialog') private reviewDialog!: OscdDialog;

  @query('#confirmation-dialog') private confirmationDialog!: OscdRemovalConfirmation;

  private boundIedNames = new Set<string>();

  willUpdate(changedProperties: PropertyValues): void {
    if (changedProperties.has('doc') || changedProperties.has('docVersion')) {
      this.boundIedNames = new Set(
        Array.from(this.doc?.querySelectorAll('Substation LNode') ?? [])
          .filter(isPublic)
          .map(ln => ln.getAttribute('iedName'))
          .filter((name): name is string => name !== null && name !== 'None'),
      );
      this.items = Array.from(this.doc?.querySelectorAll('IED') ?? []).map(
        (ied) => {
          const { firstLine, secondLine } = getIedDescription(ied);
          return {
            headline: `${ied.getAttribute('name')!} — ${firstLine}`,
            supportingText: secondLine,
            attachedElement: ied,
            selected: false,
          };
        },
      );
      this.hasSelection = false;
      this.hasBoundLNodes = false;
      this.preserveLNodes = true;
      this.resetRemovalChecks();
    }
  }

  private handleSelectionChange(): void {
    const selected = this.selectionList.selectedElements;
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
    if (this.hasBoundLNodes || impact.subNetworks.length > 0) {
      this.optionsExpanded = true;
    }
    this.deletedSubNetworks = new Set(
      impact.subNetworks.filter(network => this.deletedSubNetworks.has(network)),
    );
    if (!this.wouldEmptyCommunication) {
      this.deleteCommunication = false;
    }
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
    if (!this.wouldEmptyCommunication) {
      this.deleteCommunication = false;
    }
  }

  private handleDeleteCommunicationChange(event: Event): void {
    if (event.target instanceof OscdCheckbox) {
      this.deleteCommunication = event.target.checked;
    }
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
    if (this.affectedSubNetworks.length === 0) {
      await this.removeIEDs();
      return;
    }
    this.confirmationSummary = {
      iedNames: this.selectionList.selectedElements.map(ied => ied.getAttribute('name') ?? ''),
      hasBoundLNodes: this.hasBoundLNodes,
      preserveLNodes: this.preserveLNodes,
      deletedSubNetworks: [...this.deletedSubNetworks].map(network => network.getAttribute('name') ?? ''),
      retainedSubNetworks: this.affectedSubNetworks
        .filter(network => !this.deletedSubNetworks.has(network))
        .map(network => network.getAttribute('name') ?? ''),
      deleteCommunication: this.wouldEmptyCommunication && this.deleteCommunication,
      retainCommunication: this.wouldEmptyCommunication && !this.deleteCommunication,
    };
    await this.updateComplete;
    await this.confirmationDialog.show();
  }

  private async handleConfirmRemoval(): Promise<void> {
    await this.confirmationDialog.close();
    await this.removeIEDs();
  }

  private get wouldEmptyCommunication(): boolean {
    return this.affectedCommunication !== null &&
      this.affectedSubNetworks.length > 0 &&
      this.affectedSubNetworks.every(network => this.deletedSubNetworks.has(network));
  }

  private resetRemovalChecks(): void {
    this.affectedSubNetworks = [];
    this.deletedSubNetworks = new Set();
    this.affectedCommunication = null;
    this.deleteCommunication = false;
  }

  async run() {
    this.preserveLNodes = true;
    await this.updateComplete;
    await this.dialogUI.show();
  }

  async removeIEDs(): Promise<void> {
    const ieds = this.selectionList.selectedElements;
    const preserveLNodes = this.preserveLNodes;
    const deleted = [...this.deletedSubNetworks];
    const communication = this.wouldEmptyCommunication && this.deleteCommunication
      ? this.affectedCommunication
      : null;
    let squash = false;

    for (const ied of ieds) {
      this.dispatchEvent(
        newEditEventV2(removeIED({ node: ied }, { preserveLNodes }), {
          title: 'Remove IEDs',
          squash,
        }),
      );
      squash = true;
    }
    if (deleted.length > 0) {
      this.dispatchEvent(newEditEventV2(
        communication !== null
          ? { node: communication }
          : deleted.map(node => ({ node })),
        { title: 'Remove IEDs', squash },
      ));
    }

    this.clearSelection();
    await this.dialogUI.close();
  }

  clearSelection(): void {
    this.hasSelection = false;
    this.hasBoundLNodes = false;
    this.preserveLNodes = true;
    this.resetRemovalChecks();
    if (this.selectionList) {
      this.items = this.selectionList.items.map(item => ({
        ...item,
        selected: false,
      }));
      this.selectionList.items = this.items;
      this.selectionList.searchValue = '';
    }
  }

  private renderRemovalOptions() {
    return html`
      <h3>Removal options</h3>
        <label class="option" ?hidden=${!this.hasBoundLNodes}>
          <oscd-checkbox
            id="remove-lnodes"
            .checked=${!this.preserveLNodes}
            .disabled=${!this.hasBoundLNodes}
            @change=${this.handleRemoveLNodesChange}
          ></oscd-checkbox>
          Remove associated LNodes
        </label>
      ${this.affectedSubNetworks.length > 0 ? html`
        <section aria-label="Affected communication sections">
          ${this.affectedSubNetworks.map(network => html`
            <div class="option-row">
              <label class="option">
                <oscd-checkbox
                  class="delete-network"
                  .checked=${this.deletedSubNetworks.has(network)}
                  @change=${(event: Event) => this.handleDeleteSubNetworkChange(network, event)}
                ></oscd-checkbox>
                <oscd-icon class="warning-icon" aria-hidden="true">warning</oscd-icon>
                Delete empty SubNetwork "${network.getAttribute('name')}"
              </label>
              <oscd-text-button type="button" class="review-network" @click=${() => this.handleReviewSCL(network)}
                aria-label=${`Review SCL for SubNetwork ${network.getAttribute('name')}`}
              >Review SCL...</oscd-text-button>
            </div>
          `)}
          ${this.wouldEmptyCommunication ? html`
            <div class="option-row">
              <label class="option">
                <oscd-checkbox
                  id="delete-communication"
                  .checked=${this.deleteCommunication}
                  @change=${this.handleDeleteCommunicationChange}
                ></oscd-checkbox>
                <oscd-icon class="warning-icon" aria-hidden="true">warning</oscd-icon>
                Delete empty Communication section too
              </label>
              <oscd-text-button
                type="button"
                id="review-communication"
                @click=${() => {
                  if (this.affectedCommunication !== null) {
                    this.handleReviewSCL(this.affectedCommunication);
                  }
                }}
                aria-label="Review SCL for Communication"
              >Review SCL...</oscd-text-button>
            </div>
          ` : nothing}
        </section>
      ` : nothing}
      ${!this.hasBoundLNodes && this.affectedSubNetworks.length === 0 && this.optionsExpanded
        ? html`<p class="empty-options">No additional removal options for this selection.</p>`
        : nothing}
    `;
  }

  private renderConfirmation() {
    return html`
      <oscd-removal-confirmation id="confirmation-dialog"
        .summary=${this.confirmationSummary}
        @confirm=${this.handleConfirmRemoval}
      ></oscd-removal-confirmation>
    `;
  }

  private renderReview() {
    const element = this.reviewElement;
    const isNetwork = element?.tagName === 'SubNetwork';
    const name = isNetwork ? `SubNetwork "${element.getAttribute('name')}"` : 'Communication';
    return html`
      <oscd-dialog id="review-dialog" @closed=${() => {
        this.reviewElement = null;
      }}>
        <div slot="headline">Review ${name} removal</div>
        <div slot="content" class="review-content">
          <p>${isNetwork
            ? 'Removing the selected IEDs will remove the last ConnectedAP in this network. Keeping it leaves a schema violation.'
            : 'Deleting the selected SubNetworks will remove the last SubNetwork in Communication. Keeping Communication then leaves a schema violation.'}
            Deleting this section also removes all remaining contents, including
            metadata and Private data. Review the current SCL below before deciding.</p>
          ${element !== null ? html`
            <oscd-ace-editor
              .value=${new XMLSerializer().serializeToString(element)}
              @ready=${this.configureAceEditor}
            ></oscd-ace-editor>
          ` : nothing}
        </div>
        <div slot="actions">
          <oscd-text-button type="button" @click=${() => this.reviewDialog.close()}>Close</oscd-text-button>
        </div>
      </oscd-dialog>
    `;
  }

  render() {
    return html`<oscd-dialog
      id="selection-dialog"
      @closed=${() => {
        this.optionsExpanded = false;
      }}
      @cancel=${(event: Event) => {
        event.preventDefault();
        this.clearSelection();
      }}
    >
      <div slot="headline">Remove IEDs</div>
      <form slot="content" id="selection" method="dialog"
        class=${this.optionsExpanded ? 'options-expanded' : ''}>
        <p>
          Select the IEDs to remove from this SCL document. By default,
          associated LNodes are preserved with iedName="None", merging duplicates.
        </p>
        <h3 class="selection-heading">Select IEDs</h3>
        <oscd-divider></oscd-divider>
        <oscd-selection-list
          id="selection-list"
          multiselect
          .items=${this.items}
          @selection-list-change=${this.handleSelectionChange}
          filterable
        ></oscd-selection-list>
        <oscd-divider></oscd-divider>
        <div class="removal-options" ?inert=${!this.optionsExpanded}
          aria-label="Additional removal options">${this.renderRemovalOptions()}</div>
      </form>
      <div slot="actions">
        <oscd-text-button
          type="button"
          @click=${() => {
            this.dialogUI.close();
            this.clearSelection();
          }}
          >Cancel</oscd-text-button
        >
        <oscd-filled-button
          .disabled=${!this.hasSelection}
          @click="${() => {
            this.handleRemove();
          }}"
          type="button"
          >Remove</oscd-filled-button
        >
      </div></oscd-dialog
    >${this.renderReview()}${this.renderConfirmation()}`;
  }

  static styles = css`
    #selection-dialog {
      max-height: min(820px, calc(100dvh - 48px));
    }

    form {
      display: grid;
      grid-template-rows: auto auto auto minmax(0, 1fr) auto minmax(0, 0fr);
      height: min(600px, calc(100dvh - 240px));
      padding: 0;
      margin-block-end: 0px;
      transition: grid-template-rows 180ms ease-out;
    }

    form.options-expanded {
      grid-template-rows: auto auto auto minmax(0, 1fr) auto minmax(0, 0.8fr);
    }

    form p {
      margin: 16px 24px;
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

    .option[hidden] {
      display: none;
    }

    .removal-options {
      min-height: 0;
      overflow-y: auto;
    }

    .removal-options p {
      margin: 12px 16px;
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
      color: var(--oscd-warning, var(--md-sys-color-on-surface));
    }

    .option-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding-inline-end: 16px;
    }

    #review-dialog {
      width: min(900px, calc(100vw - 48px));
      max-width: calc(100vw - 48px);
    }

    .review-content {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      height: min(400px, calc(100dvh - 240px));
    }

    .review-content oscd-ace-editor {
      min-height: 0;
      height: 100%;
    }

    #selection-list {
      display: block;
      min-height: 0;
      overflow-y: auto;
      background: var(--md-list-container-color, var(--md-sys-color-surface));
    }

    @media (prefers-reduced-motion: reduce) {
      form {
        transition: none;
      }
    }
  `;
}
