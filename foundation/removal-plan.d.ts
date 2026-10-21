import type { EditV2 } from '@openscd/oscd-api';
export interface RemovalSummary {
    iedNames: string[];
    hasBoundLNodes: boolean;
    preserveLNodes: boolean;
    deletedSubNetworks: string[];
    retainedSubNetworks: string[];
    deleteCommunication: boolean;
    retainCommunication: boolean;
}
export interface SummaryInput {
    ieds: Element[];
    hasBoundLNodes: boolean;
    preserveLNodes: boolean;
    communication: Element | null;
    affectedSubNetworks: Element[];
    deletedSubNetworks: Set<Element>;
    deleteCommunication: boolean;
}
/**
 * Builds the edits which remove one IED and everything that refers to it.
 * @param ied - the IED to remove.
 * @param preserveLNodes - keep bound LNodes with `iedName="None"`.
 * @returns the edits for this IED.
 */
export declare function iedRemovalEdits(ied: Element, preserveLNodes: boolean): EditV2[];
/**
 * Reports whether deleting the chosen SubNetworks also empties Communication.
 * @param communication - the Communication section, when every network is
 *   affected.
 * @param affectedSubNetworks - networks which lose their last connection.
 * @param deletedSubNetworks - networks the user chose to delete.
 * @returns whether Communication would have no SubNetwork.
 */
export declare function wouldEmptyCommunication(communication: Element | null, affectedSubNetworks: Element[], deletedSubNetworks: Set<Element>): boolean;
/**
 * Builds the edits which delete the chosen SubNetworks, or the whole
 * Communication section when that is the explicit choice.
 * @param communication - the Communication section, when it is deleted.
 * @param deletedSubNetworks - networks the user chose to delete.
 * @returns the section edits; empty when nothing is deleted.
 */
export declare function sectionRemovalEdits(communication: Element | null, deletedSubNetworks: Element[]): EditV2[];
/**
 * Builds the confirmation summary from the current choices.
 * @param input - the selected IEDs and removal choices.
 * @returns the names and deletion/retention decisions shown to the user.
 */
export declare function removalSummary(input: SummaryInput): RemovalSummary;
