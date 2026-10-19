export interface IedDescription {
  firstLine: string;
  secondLine: string;
}

/**
 * Builds the two lines which describe an IED in the selection list.
 * @param ied - the IED element.
 * @returns the manufacturer/type line and the description/config line.
 */
export function getIedDescription(ied: Element): IedDescription {
  const manufacturer = ied.getAttribute('manufacturer');
  const type = ied.getAttribute('type');
  const desc = ied.getAttribute('desc');
  const configVersion = ied.getAttribute('configVersion');
  const originalSclVersion = ied.getAttribute('originalSclVersion');
  const originalSclRevision = ied.getAttribute('originalSclRevision');
  const originalSclRelease = ied.getAttribute('originalSclRelease');

  const firstLine = [manufacturer, type]
    .filter(value => value !== null && value !== '')
    .join(' - ');

  const schemaInformation = [
    originalSclVersion,
    originalSclRevision,
    originalSclRelease,
  ]
    .filter(value => value !== null)
    .join('');

  const secondLine = [desc, configVersion, schemaInformation]
    .filter(value => value !== null && value !== '')
    .join(' - ');

  return { firstLine, secondLine };
}

/**
 * Builds the headline of an IED list item without leaving a dangling
 * separator when the IED has no manufacturer or type.
 * @param ied - the IED element.
 * @returns the name, followed by the description when there is one.
 */
export function getIedHeadline(ied: Element): string {
  const name = ied.getAttribute('name') ?? '';
  const { firstLine } = getIedDescription(ied);
  return firstLine === '' ? name : `${name} — ${firstLine}`;
}
