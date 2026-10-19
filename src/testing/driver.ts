import { waitUntil } from '@open-wc/testing';

import type { OscdAceEditor } from '@omicronenergy/oscd-ui/ace-editor/OscdAceEditor.js';
import type { OscdCheckbox } from '@omicronenergy/oscd-ui/checkbox/OscdCheckbox.js';
import type { OscdDialog } from '@omicronenergy/oscd-ui/dialog/OscdDialog.js';
import type { OscdSelectionList } from '@omicronenergy/oscd-ui/selection-list/OscdSelectionList.js';

import type { RemovalSummary } from '../foundation/removal-plan.js';
import type { MountedPlugin } from './plugin.js';
import { deepQuery, deepQueryAll, normalize } from './dom.js';

export interface ListedIed {
  name: string;
  headline: string;
  supportingText: string;
  selected: boolean;
  visible: boolean;
}

export interface RemovalOption {
  label: string;
  checked: boolean;
  disabled: boolean;
  hidden: boolean;
}

/**
 * The only test file which knows the plugin's DOM. Specs interact through this
 * driver so that changing the UI components does not require changing the
 * behaviour tests.
 */
export class PluginDriver {
  constructor(private readonly mounted: MountedPlugin) {}

  private get root(): ShadowRoot {
    return this.mounted.plugin.shadowRoot!;
  }

  private get selectionDialog(): OscdDialog {
    return this.root.querySelector('#selection-dialog') as OscdDialog;
  }

  private get selectionList(): OscdSelectionList {
    return this.root.querySelector('#selection-list') as OscdSelectionList;
  }

  private get confirmation(): HTMLElement & {
    open: boolean;
    summary: RemovalSummary | null;
  } {
    return this.root.querySelector('#confirmation-dialog') as HTMLElement & {
      open: boolean;
      summary: RemovalSummary | null;
    };
  }

  private get reviewDialog(): OscdDialog {
    return this.root.querySelector('#review-dialog') as OscdDialog;
  }

  get dialogOpen(): boolean {
    return this.selectionDialog?.open ?? false;
  }

  get reviewOpen(): boolean {
    return this.reviewDialog?.open ?? false;
  }

  get confirmationOpen(): boolean {
    return this.confirmation?.open ?? false;
  }

  get summary(): RemovalSummary | null {
    return this.confirmation?.summary ?? null;
  }

  async settle(): Promise<void> {
    await this.mounted.settle();
  }

  async open(): Promise<void> {
    await this.mounted.plugin.run();
    await this.waitForOpen(this.selectionDialog);
    await this.settle();
  }

  async close(): Promise<void> {
    await this.selectionDialog.close();
    await waitUntil(() => !this.dialogOpen, 'the selection dialog stayed open');
  }

  /**
   * Cancels the dialog as Escape or a scrim click does.
   */
  async cancel(): Promise<void> {
    const native = this.selectionDialog.shadowRoot?.querySelector('dialog');
    if (native === null || native === undefined) {
      throw new Error('The selection dialog has no native dialog');
    }
    native.dispatchEvent(new Event('cancel', { cancelable: true }));
    await waitUntil(
      () => !this.dialogOpen,
      'the selection dialog stayed open after cancel',
    );
  }

  /** The IEDs in the list, in document order. */
  ieds(): ListedIed[] {
    const list = this.selectionList;
    if (list === null || list === undefined) {
      return [];
    }
    const items = Array.from(
      list.shadowRoot?.querySelectorAll('oscd-list-item') ?? [],
    );
    return list.items.map((item, index) => ({
      name: item.attachedElement?.getAttribute('name') ?? '',
      headline: normalize(item.headline),
      supportingText: normalize(item.supportingText),
      selected: item.selected,
      visible: !items[index]?.classList.contains('hidden'),
    }));
  }

  /** The IEDs which the current search shows. */
  visibleIeds(): string[] {
    return this.ieds()
      .filter(item => item.visible)
      .map(item => item.name);
  }

  private async setSelected(name: string, selected: boolean): Promise<void> {
    if (this.selectionList === null || this.selectionList === undefined) {
      throw new Error(`The IED "${name}" is not in the list`);
    }
    const index = this.selectionList.items.findIndex(
      item => item.attachedElement?.getAttribute('name') === name,
    );
    if (index < 0) {
      throw new Error(`The IED "${name}" is not in the list`);
    }
    if (this.selectionList.items[index].selected !== selected) {
      const item = this.selectionList.shadowRoot?.querySelectorAll(
        'oscd-list-item',
      )[index];
      if (item === undefined) {
        throw new Error(`The list item for "${name}" is not rendered`);
      }
      item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
    await this.settle();
  }

  async select(...names: string[]): Promise<void> {
    for (const name of names) {
      await this.setSelected(name, true);
    }
  }

  async deselect(...names: string[]): Promise<void> {
    for (const name of names) {
      await this.setSelected(name, false);
    }
  }

  async search(text: string): Promise<void> {
    if (this.selectionList === null || this.selectionList === undefined) {
      return;
    }
    this.selectionList.searchValue = text;
    this.selectionList.requestUpdate();
    await this.settle();
  }

  /** The visible text of the selection dialog. */
  dialogText(): string {
    return normalize(this.selectionDialog?.textContent);
  }

  /** The labels of the dialog actions, in screen order. */
  actionLabels(): string[] {
    return Array.from(
      this.root.querySelectorAll(
        '#selection-dialog > [slot="actions"] > *',
      ),
    ).map(element => normalize(element.textContent));
  }

  /** Whether the Remove button is disabled. */
  removeDisabled(): boolean {
    const button = this.root.querySelector(
      '#selection-dialog > [slot="actions"] oscd-filled-button',
    ) as HTMLButtonElement | null;
    return button?.disabled ?? true;
  }

  /** The visible removal options, in screen order. */
  options(): RemovalOption[] {
    return deepQueryAll(this.root, '.removal-options .option').map(
      (option) => {
        const checkbox = option.querySelector('oscd-checkbox') as
          | OscdCheckbox
          | null;
        return {
          label: normalize(option.textContent),
          checked: checkbox?.checked ?? false,
          disabled: checkbox?.disabled ?? false,
          hidden: option.hidden === true,
        };
      },
    );
  }

  /** The heights of the form, the options panel and the list. */
  layout(): { form: number; options: number; list: number } {
    const form = this.root.querySelector('form');
    const options = this.root.querySelector('.removal-options');
    const list = this.root.querySelector('#selection-list');
    return {
      form: form?.clientHeight ?? 0,
      options: options?.clientHeight ?? 0,
      list: list?.clientHeight ?? 0,
    };
  }

  /** The options panel heading, or an empty string when it is collapsed. */
  optionsHeading(): string {
    return normalize(
      this.root.querySelector('.removal-options h3')?.textContent,
    );
  }

  /** The text of the options panel, including an empty message. */
  optionsText(): string {
    return normalize(
      this.root.querySelector('.removal-options')?.textContent,
    );
  }

  async clickOption(text: string): Promise<void> {
    const option = deepQueryAll(this.root, '.removal-options .option').find(
      element => normalize(element.textContent).includes(text),
    );
    const checkbox = option?.querySelector('oscd-checkbox') as
      | OscdCheckbox
      | null;
    if (checkbox === null || checkbox === undefined) {
      throw new Error(`The option "${text}" is not shown`);
    }
    checkbox.click();
    await this.settle();
  }

  /** Clicks the Cancel button. */
  async cancelSelection(): Promise<void> {
    const button = deepQueryAll(
      this.root,
      '#selection-dialog > [slot="actions"] oscd-text-button',
    ).find(element => normalize(element.textContent) === 'Cancel');
    if (button === undefined) {
      throw new Error('The Cancel button is not rendered');
    }
    button.click();
    await waitUntil(() => !this.dialogOpen, 'the selection dialog stayed open');
    await this.settle();
  }

  async remove(): Promise<void> {
    const button = this.root.querySelector(
      '#selection-dialog > [slot="actions"] oscd-filled-button',
    ) as HTMLElement | null;
    if (button === null) {
      throw new Error('The Remove button is not rendered');
    }
    button.click();
    await this.settle();
  }

  /** Waits until the confirmation dialog is open. */
  async waitForConfirmation(): Promise<void> {
    await this.waitForOpen(this.confirmation);
    await this.settle();
  }

  /** Scrolls the options panel to its last row. */
  scrollOptionsToEnd(): void {
    const panel = this.root.querySelector('.removal-options');
    if (panel !== null) {
      panel.scrollTop = panel.scrollHeight;
    }
  }

  async confirm(): Promise<void> {
    await this.waitForOpen(this.confirmation);
    const button = deepQueryAll(
      this.confirmation.shadowRoot!,
      'oscd-filled-button',
    )[0];
    if (button === undefined) {
      throw new Error('The Confirm button is not rendered');
    }
    button.click();
    await waitUntil(
      () => !this.confirmationOpen && !this.dialogOpen,
      'the confirmation or selection dialog stayed open',
    );
    await this.settle();
  }

  async back(): Promise<void> {
    await this.waitForOpen(this.confirmation);
    const button = deepQueryAll(
      this.confirmation.shadowRoot!,
      'oscd-text-button',
    ).find(element => normalize(element.textContent) === 'Back');
    if (button === undefined) {
      throw new Error('The Back button is not rendered');
    }
    button.click();
    await waitUntil(() => !this.confirmationOpen, 'the confirmation stayed open');
    await this.settle();
  }

  async reviewNetwork(name?: string): Promise<void> {
    const buttons = deepQueryAll(this.root, '.review-network');
    const button =
      name === undefined
        ? buttons[0]
        : buttons.find(element =>
          normalize(element.getAttribute('aria-label')).includes(name),
        );
    if (button === undefined) {
      throw new Error(`The review button for "${name ?? 'a network'}" is missing`);
    }
    button.click();
    await this.waitForOpen(this.reviewDialog);
    await this.waitForEditor();
  }

  async reviewCommunication(): Promise<void> {
    const button = deepQuery(this.root, '#review-communication');
    if (button === null) {
      throw new Error('The Communication review button is missing');
    }
    button.click();
    await this.waitForOpen(this.reviewDialog);
    await this.waitForEditor();
  }

  reviewText(): string {
    const editor = deepQuery(this.root, 'oscd-ace-editor') as
      | OscdAceEditor
      | null;
    return editor?.editor?.getValue() ?? '';
  }

  async closeReview(): Promise<void> {
    const button = Array.from(
      this.reviewDialog.querySelectorAll('oscd-text-button'),
    ).find(element => normalize(element.textContent) === 'Close');
    if (button === undefined) {
      throw new Error('The review Close button is missing');
    }
    button.click();
    await waitUntil(() => !this.reviewOpen, 'the review dialog stayed open');
    await this.settle();
  }

  private async waitForOpen(dialog: { open: boolean } | null): Promise<void> {
    await waitUntil(
      () => dialog?.open === true,
      'the dialog did not open',
      { timeout: 5000 },
    );
  }

  private async waitForEditor(): Promise<void> {
    await waitUntil(
      () => {
        const editor = deepQuery(this.root, 'oscd-ace-editor') as
          | OscdAceEditor
          | null;
        return editor?.editor !== undefined && editor.editor.getReadOnly();
      },
      'the read-only SCL preview did not load',
      { timeout: 5000 },
    );
  }
}
