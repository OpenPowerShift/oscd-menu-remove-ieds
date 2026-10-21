import type { RemovalSummary } from '../foundation/removal-plan.js';
import type { MountedPlugin } from './plugin.js';
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
export declare class PluginDriver {
    private readonly mounted;
    constructor(mounted: MountedPlugin);
    private get root();
    private get selectionDialog();
    private get selectionList();
    private get confirmation();
    private get reviewDialog();
    get dialogOpen(): boolean;
    get reviewOpen(): boolean;
    get confirmationOpen(): boolean;
    get summary(): RemovalSummary | null;
    settle(): Promise<void>;
    open(): Promise<void>;
    close(): Promise<void>;
    /**
     * Cancels the dialog as Escape or a scrim click does.
     */
    cancel(): Promise<void>;
    /** The IEDs in the list, in document order. */
    ieds(): ListedIed[];
    /** The IEDs which the current search shows. */
    visibleIeds(): string[];
    private setSelected;
    select(...names: string[]): Promise<void>;
    deselect(...names: string[]): Promise<void>;
    /** Selects every IED which the current search shows. */
    selectAllShown(): Promise<void>;
    /** Clears every selected IED without changing the search. */
    clearSelection(): Promise<void>;
    search(text: string): Promise<void>;
    /** The visible text of the selection dialog. */
    dialogText(): string;
    /** The labels of the dialog actions, in screen order. */
    actionLabels(): string[];
    /** Whether the Remove button is disabled. */
    removeDisabled(): boolean;
    /** The visible removal options, in screen order. */
    options(): RemovalOption[];
    /** The size and position of the form, the options panel and the list. */
    layout(): {
        formWidth: number;
        formHeight: number;
        optionsWidth: number;
        optionsHeight: number;
        optionsLeft: number;
        optionsTop: number;
        listWidth: number;
        listHeight: number;
        listLeft: number;
        listTop: number;
    };
    /** The options panel heading, or an empty string when it is collapsed. */
    optionsHeading(): string;
    /** The text of the options panel, including an empty message. */
    optionsText(): string;
    clickOption(text: string): Promise<void>;
    /** Clicks the Cancel button. */
    cancelSelection(): Promise<void>;
    remove(): Promise<void>;
    /** Waits until the confirmation dialog is open. */
    waitForConfirmation(): Promise<void>;
    /** Scrolls the options panel to its last row. */
    scrollOptionsToEnd(): void;
    confirm(): Promise<void>;
    back(): Promise<void>;
    reviewNetwork(name?: string): Promise<void>;
    reviewCommunication(): Promise<void>;
    reviewText(): string;
    closeReview(): Promise<void>;
    private waitForOpen;
    private waitForEditor;
}
