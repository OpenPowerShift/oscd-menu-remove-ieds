import { css, html, LitElement } from 'lit';
import { property, query, state } from 'lit/decorators.js';

import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';
import { OscdDialog } from '@omicronenergy/oscd-ui/dialog/OscdDialog.js';
import { OscdTextButton } from '@omicronenergy/oscd-ui/button/OscdTextButton.js';
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
    'oscd-text-button': OscdTextButton,
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

  @query('#selection-dialog') dialogUI!: OscdDialog;

  @query('#selection-list') selectionList!: OscdSelectionList;

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
    if (this.selectionList) {
      this.selectionList.items = this.selectionList.items.map(item => ({
        ...item,
        selected: false,
      }));
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
      <form slot="content" id="selection" method="dialog">
        <oscd-selection-list
          id="selection-list"
          multiselect
          .items=${Array.from(this.doc?.querySelectorAll('IED') ?? []).map(
            (ied) => {
              const { firstLine, secondLine } = getIedDescription(ied);

              return {
                headline: `${ied.getAttribute('name')!} — ${firstLine}`,
                supportingText: secondLine,
                attachedElement: ied,
                selected: false,
              };
            },
          )}
          filterable
        ></oscd-selection-list>
      </form>
      <div slot="actions">
        <oscd-text-button
          @click=${() => {
            this.dialogUI.close();
            this.clearSelection();
          }}
          >Close</oscd-text-button
        >
        <oscd-text-button
          @click="${() => {
            this.removeIEDs();
          }}"
          form="selection"
          >Remove IEDs</oscd-text-button
        >
      </div></oscd-dialog
    >`;
  }

  static styles = css`
    form {
      padding: 10px;
    }
  `;
}
