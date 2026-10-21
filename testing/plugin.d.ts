import { XMLEditor } from '@openscd/oscd-editor';
import type { EditV2 } from '@openscd/oscd-api';
import OscdMenuRemoveIeds from '../oscd-menu-remove-ieds.js';
import { loadFixture, loadScl } from './fixtures.js';
export { loadFixture, loadScl };
export declare const tagName = "oscd-menu-remove-ieds";
export interface MountOptions {
    /** File name within `test/fixtures`. */
    fixture?: string;
    /** An already parsed document, used instead of a fixture. */
    doc?: XMLDocument;
    /** The height of the host area in pixels. */
    height?: number;
    /** The width of the host area in pixels. */
    width?: number;
}
export interface MountedPlugin {
    plugin: OscdMenuRemoveIeds;
    doc: XMLDocument;
    /** Every `oscd-edit-v2` edit dispatched by the plugin, in order. */
    edits: EditV2[];
    /** The undo/redo history, as the host keeps it. */
    editor: XMLEditor;
    /** Dispatches an edit as another plugin would. */
    applyEdit: (edit: EditV2) => Promise<void>;
    /** Replaces the document, as the host does when another file is opened. */
    openDocument: (doc: XMLDocument) => Promise<void>;
    /** Undoes the last edit as the host does. */
    undo: () => Promise<void>;
    /** Redoes the last undone edit as the host does. */
    redo: () => Promise<void>;
    /** Waits for the plugin and its dialogs to finish rendering. */
    settle: () => Promise<void>;
    /** Removes the plugin and its host from the page. */
    unmount: () => void;
    /** The element which stands in for the host's editor area. */
    host: HTMLElement;
}
/**
 * Mounts the plugin in a host area and applies the edits it dispatches, as the
 * host does: the document changes and `docVersion` increases before the plugin
 * sees the result.
 * @param options - fixture or document and host size.
 * @returns the plugin with helpers.
 */
export declare function mountPlugin(options?: MountOptions): Promise<MountedPlugin>;
/**
 * Waits until the plugin has a dialog open.
 * @param mounted - the mounted plugin.
 * @param selector - the dialog selector within the plugin.
 */
export declare function waitForDialog(mounted: MountedPlugin, selector: string): Promise<void>;
