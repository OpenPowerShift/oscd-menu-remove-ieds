export interface IedDescription {
    firstLine: string;
    secondLine: string;
}
/**
 * Builds the two lines which describe an IED in the selection list.
 * @param ied - the IED element.
 * @returns the manufacturer/type line and the description/config line.
 */
export declare function getIedDescription(ied: Element): IedDescription;
/**
 * Builds the headline of an IED list item without leaving a dangling
 * separator when the IED has no manufacturer or type.
 * @param ied - the IED element.
 * @returns the name, followed by the description when there is one.
 */
export declare function getIedHeadline(ied: Element): string;
