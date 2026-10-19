import { waitUntil } from '@open-wc/testing';
import { XMLEditor } from '@openscd/oscd-editor';
import type { EditDetailV2, EditV2 } from '@openscd/oscd-api';
import { newEditEventV2 } from '@openscd/oscd-api/utils.js';

import OscdMenuRemoveIeds from '../oscd-menu-remove-ieds.js';
import { loadFixture, loadScl } from './fixtures.js';

export { loadFixture, loadScl };

export const tagName = 'oscd-menu-remove-ieds';

if (customElements.get(tagName) === undefined) {
  customElements.define(tagName, OscdMenuRemoveIeds);
}

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
 * Every element below `root`, including in shadow roots, which has an
 * `updateComplete` promise.
 * @param root - where to look.
 * @param found - elements found so far.
 * @returns the elements.
 */
function updatingElements(
  root: ParentNode,
  found: Element[] = [],
): Element[] {
  root.querySelectorAll('*').forEach((element) => {
    if ('updateComplete' in element) {
      found.push(element);
    }
    if (element.shadowRoot !== null) {
      updatingElements(element.shadowRoot, found);
    }
  });
  return found;
}

/**
 * Mounts the plugin in a host area and applies the edits it dispatches, as the
 * host does: the document changes and `docVersion` increases before the plugin
 * sees the result.
 * @param options - fixture or document and host size.
 * @returns the plugin with helpers.
 */
export async function mountPlugin(
  options: MountOptions = {},
): Promise<MountedPlugin> {
  const doc =
    options.doc ?? (await loadFixture(options.fixture ?? 'multiple-ieds.scd'));

  const host = document.createElement('div');
  host.style.width = `${options.width ?? 1280}px`;
  host.style.height = `${options.height ?? 800}px`;
  document.body.appendChild(host);

  const plugin = document.createElement(tagName) as OscdMenuRemoveIeds;
  const editor = new XMLEditor();
  const edits: EditV2[] = [];
  let version = 0;

  host.addEventListener('oscd-edit-v2', (event) => {
    const { edit, title, squash } = (event as CustomEvent<EditDetailV2>).detail;
    edits.push(edit);
    editor.commit(edit, { title, squash });
    version += 1;
    plugin.docVersion = version;
  });

  plugin.doc = doc;
  plugin.docVersion = version;
  host.appendChild(plugin);

  const settle = async (): Promise<void> => {
    for (let index = 0; index < 3; index += 1) {
      await plugin.updateComplete;
      await Promise.all(
        updatingElements(plugin.shadowRoot!).map(element =>
          (
            element as Element & { updateComplete: Promise<unknown> }
          ).updateComplete,
        ),
      );
    }
  };

  await settle();

  return {
    plugin,
    doc,
    edits,
    editor,
    host,
    settle,
    applyEdit: async (edit) => {
      host.dispatchEvent(newEditEventV2(edit));
      await settle();
    },
    openDocument: async (newDoc) => {
      plugin.doc = newDoc;
      version += 1;
      plugin.docVersion = version;
      await settle();
    },
    undo: async () => {
      editor.undo();
      version += 1;
      plugin.docVersion = version;
      await settle();
    },
    redo: async () => {
      editor.redo();
      version += 1;
      plugin.docVersion = version;
      await settle();
    },
    unmount: () => {
      host.remove();
    },
  };
}

/**
 * Waits until the plugin has a dialog open.
 * @param mounted - the mounted plugin.
 * @param selector - the dialog selector within the plugin.
 */
export async function waitForDialog(
  mounted: MountedPlugin,
  selector: string,
): Promise<void> {
  await waitUntil(
    () => {
      const dialog = mounted.plugin.shadowRoot?.querySelector(selector) as
        | { open?: boolean }
        | null
        | undefined;
      return dialog !== null && dialog !== undefined && dialog.open === true;
    },
    `the dialog ${selector} did not open`,
    { timeout: 5000 },
  );
}
