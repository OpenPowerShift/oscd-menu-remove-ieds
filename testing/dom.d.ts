/** Text with whitespace collapsed, as it is read on screen. */
export declare const normalize: (text: string | null | undefined) => string;
/**
 * Finds all elements below `root`, including elements in shadow roots.
 * @param root - where to look.
 * @param selector - the CSS selector.
 * @returns the elements found.
 */
export declare function deepQueryAll(root: ParentNode, selector: string): HTMLElement[];
/**
 * Finds the first element below `root`, including elements in shadow roots.
 * @param root - where to look.
 * @param selector - the CSS selector.
 * @returns the element, or null.
 */
export declare function deepQuery(root: ParentNode, selector: string): HTMLElement | null;
/**
 * The text of the children of an element in the named slot.
 * @param element - the element with slotted children.
 * @param slot - the name of the slot.
 * @returns their text.
 */
export declare const slotText: (element: Element, slot: string) => string;
