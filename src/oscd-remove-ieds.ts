import { css, html, LitElement, type PropertyValues } from 'lit';
import { property, query, state } from 'lit/decorators.js';

import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';
import { OscdDialog } from '@omicronenergy/oscd-ui/dialog/OscdDialog.js';
import { OscdDivider } from '@omicronenergy/oscd-ui/divider/OscdDivider.js';
import { OscdTextButton } from '@omicronenergy/oscd-ui/button/OscdTextButton.js';
import { OscdFilledButton } from '@omicronenergy/oscd-ui/button/OscdFilledButton.js';
import {
  OscdSelectionList,
  type SelectItem,
} from '@omicronenergy/oscd-ui/selection-list/OscdSelectionList.js';

import { removeIED } from '@openscd/scl-lib';
import { newEditEventV2 } from '@openscd/oscd-api/utils.js';

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
export default class OscdRemoveIEDs extends ScopedElementsMixin(LitElement) {
  static scopedElements = {
    'oscd-dialog': OscdDialog,
    'oscd-divider': OscdDivider,
    'oscd-text-button': OscdTextButton,
    'oscd-filled-button': OscdFilledButton,
    'oscd-selection-list': OscdSelectionList,
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

  @query('#selection-dialog') dialogUI!: OscdDialog;

  @query('#selection-list') selectionList!: OscdSelectionList;

  willUpdate(changedProperties: PropertyValues): void {
    if (changedProperties.has('doc') || changedProperties.has('docVersion')) {
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
    }
  }

  private handleSelectionChange(): void {
    this.hasSelection = this.selectionList.selectedElements.length > 0;
  }

  async run() {
    this.dialogUI.show();
  }

  async removeIEDs(): Promise<void> {
    const ieds = this.selectionList.selectedElements;

    for await (const ied of ieds) {
      this.dispatchEvent(newEditEventV2(removeIED({ node: ied })));
    }

    this.clearSelection();
  }

  clearSelection(): void {
    this.hasSelection = false;
    if (this.selectionList) {
      this.items = this.selectionList.items.map(item => ({
        ...item,
        selected: false,
      }));
      this.selectionList.items = this.items;
      this.selectionList.searchValue = '';
    }
  }

  render() {
    return html`<oscd-dialog
      id="selection-dialog"
      @cancel=${(event: Event) => {
        event.preventDefault();
        this.clearSelection();
      }}
    >
      <div slot="headline">Remove IEDs</div>
      <form slot="content" id="selection" method="dialog">
        <p>
          Select the IEDs to remove from this SCL document. Use the search field
          to find IEDs, then choose Remove IEDs to apply the changes.
        </p>
        <oscd-divider></oscd-divider>
        <oscd-selection-list
          id="selection-list"
          multiselect
          .items=${this.items}
          @selection-list-change=${this.handleSelectionChange}
          filterable
        ></oscd-selection-list>
        <oscd-divider></oscd-divider>
      </form>
      <div slot="actions">
        <oscd-text-button
          @click=${() => {
            this.dialogUI.close();
            this.clearSelection();
          }}
          >Cancel</oscd-text-button
        >
        <oscd-filled-button
          .disabled=${!this.hasSelection}
          @click="${() => {
            this.removeIEDs();
          }}"
          form="selection"
          >Remove IEDs</oscd-filled-button
        >
      </div></oscd-dialog
    >`;
  }

  static styles = css`
    form {
      display: grid;
      grid-template-rows: auto auto minmax(0, 1fr) auto;
      height: min(400px, calc(100dvh - 240px));
      padding: 0;
      margin-block-end: 0px;
    }

    form p {
      margin: 16px 24px;
    }

    #selection-list {
      display: block;
      min-height: 0;
      overflow-y: auto;
      background: var(--md-list-container-color, var(--md-sys-color-surface));
    }
  `;
}
