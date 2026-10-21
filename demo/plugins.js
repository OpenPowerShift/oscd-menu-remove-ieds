import OscdMenuOpen from "@omicronenergy/oscd-menu-open";
import OscdMenuSave from "@omicronenergy/oscd-menu-save";

// built from src/ by `tsc --watch` when serving from source and by `npm run
// bundle` before the demo is bundled
import OscdMenuRemoveIeds from "../dist/oscd-menu-remove-ieds.js";

/**
 * The shell shows plugins in its own scoped registry, so they are defined
 * there.
 * @param registry - the registry of the `oscd-shell`.
 */
export function definePlugins(registry) {
  registry.define("oscd-menu-open", OscdMenuOpen);
  registry.define("oscd-menu-save", OscdMenuSave);
  registry.define("oscd-menu-remove-ieds", OscdMenuRemoveIeds);
}

export const plugins = {
  menu: [
    {
      name: "Open File",
      translations: { de: "Datei öffnen" },
      icon: "folder_open",
      tagName: "oscd-menu-open",
    },
    {
      name: "Save File",
      translations: { de: "Datei speichern" },
      icon: "save",
      requireDoc: true,
      tagName: "oscd-menu-save",
    },
    {
      name: "Remove IEDs",
      icon: "delete",
      requireDoc: true,
      tagName: "oscd-menu-remove-ieds",
    },
  ],
  editor: [
    {
      name: "Source Editor",
      translations: { de: "Source Editor" },
      icon: "data_object",
      requireDoc: true,
      src: "https://omicronenergyoss.github.io/oscd-editor-source/oscd-editor-source.js",
    },
  ],
  background: [],
};
