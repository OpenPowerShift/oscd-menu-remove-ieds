import { css, html, LitElement, type PropertyValues } from 'lit';
import { property, query, state } from 'lit/decorators.js';

import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';
import { OscdDialog } from '@omicronenergy/oscd-ui/dialog/OscdDialog.js';
import { OscdDivider } from '@omicronenergy/oscd-ui/divider/OscdDivider.js';
import { OscdTextButton } from '@omicronenergy/oscd-ui/button/OscdTextButton.js';
import { OscdFilledButton } from '@omicronenergy/oscd-ui/button/OscdFilledButton.js';
import { OscdCheckbox } from '@omicronenergy/oscd-ui/checkbox/OscdCheckbox.js';
import {
  OscdSelectionList,
  type SelectItem,
} from '@omicronenergy/oscd-ui/selection-list/OscdSelectionList.js';

import { isPublic, removeIED } from '@openscd/scl-lib';
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
    'oscd-checkbox': OscdCheckbox,
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

  @state()
  private hasBoundLNodes = false;

  @state()
  private preserveLNodes = true;

  @query('#selection-dialog') dialogUI!: OscdDialog;

  @query('#selection-list') selectionList!: OscdSelectionList;

  @query('#remove-lnodes') private lNodeCheckbox!: OscdCheckbox;

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
  }

  private handleLNodeChange(): void {
    this.preserveLNodes = !this.lNodeCheckbox.checked;
  }

  async run() {
    this.preserveLNodes = true;
    await this.updateComplete;
    await this.dialogUI.show();
  }

  async removeIEDs(): Promise<void> {
    const ieds = this.selectionList.selectedElements;
    const preserveLNodes = this.preserveLNodes;

    for await (const ied of ieds) {
      this.dispatchEvent(
        newEditEventV2(removeIED({ node: ied }, { preserveLNodes })),
      );
    }

    this.clearSelection();
  }

  clearSelection(): void {
    this.hasSelection = false;
    this.hasBoundLNodes = false;
    this.preserveLNodes = true;
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
          Select the IEDs to remove from this SCL document. By default,
          associated LNodes are preserved with iedName="None", merging duplicates.
        </p>
        <label class="lnode-option">
          <oscd-checkbox
            id="remove-lnodes"
            .checked=${!this.preserveLNodes}
            .disabled=${!this.hasBoundLNodes}
            @change=${this.handleLNodeChange}
          ></oscd-checkbox>
          Remove associated LNodes
        </label>
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
      grid-template-rows: auto auto auto minmax(0, 1fr) auto;
      height: min(400px, calc(100dvh - 240px));
      padding: 0;
      margin-block-end: 0px;
    }

    form p {
      margin: 16px 24px;
    }

    .lnode-option {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 24px 16px;
    }

    #selection-list {
      display: block;
      min-height: 0;
      overflow-y: auto;
      background: var(--md-list-container-color, var(--md-sys-color-surface));
    }
  `;
}
