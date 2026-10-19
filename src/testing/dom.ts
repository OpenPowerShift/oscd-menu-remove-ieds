/** Text with whitespace collapsed, as it is read on screen. */
export const normalize = (text: string | null | undefined): string =>
  (text ?? '').replace(/\s+/g, ' ').trim();

/**
 * Finds all elements below `root`, including elements in shadow roots.
 * @param root - where to look.
 * @param selector - the CSS selector.
 * @returns the elements found.
 */
export function deepQueryAll(
  root: ParentNode,
  selector: string,
): HTMLElement[] {
  const found: HTMLElement[] = [];
  const visit = (node: ParentNode): void => {
    node.querySelectorAll<HTMLElement>(selector).forEach((element) => {
      found.push(element);
    });
    node.querySelectorAll<HTMLElement>('*').forEach((element) => {
      if (element.shadowRoot !== null) {
        visit(element.shadowRoot);
      }
    });
  };
  visit(root);
  return found;
}

/**
 * Finds the first element below `root`, including elements in shadow roots.
 * @param root - where to look.
 * @param selector - the CSS selector.
 * @returns the element, or null.
 */
export function deepQuery(
  root: ParentNode,
  selector: string,
): HTMLElement | null {
  return deepQueryAll(root, selector)[0] ?? null;
}

/**
 * The text of the children of an element in the named slot.
 * @param element - the element with slotted children.
 * @param slot - the name of the slot.
 * @returns their text.
 */
export const slotText = (element: Element, slot: string): string =>
  normalize(
    Array.from(element.querySelectorAll(`:scope > [slot="${slot}"]`))
      .map(child => child.textContent)
      .join(' '),
  );
