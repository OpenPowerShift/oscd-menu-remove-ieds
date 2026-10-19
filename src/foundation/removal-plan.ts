import type { EditV2 } from '@openscd/oscd-api';

import { removeIED } from '@openscd/scl-lib';

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
export function iedRemovalEdits(
  ied: Element,
  preserveLNodes: boolean,
): EditV2[] {
  return removeIED({ node: ied }, { preserveLNodes });
}

/**
 * Reports whether deleting the chosen SubNetworks also empties Communication.
 * @param communication - the Communication section, when every network is
 *   affected.
 * @param affectedSubNetworks - networks which lose their last connection.
 * @param deletedSubNetworks - networks the user chose to delete.
 * @returns whether Communication would have no SubNetwork.
 */
export function wouldEmptyCommunication(
  communication: Element | null,
  affectedSubNetworks: Element[],
  deletedSubNetworks: Set<Element>,
): boolean {
  return (
    communication !== null &&
    affectedSubNetworks.length > 0 &&
    affectedSubNetworks.every(network => deletedSubNetworks.has(network))
  );
}

/**
 * Builds the edits which delete the chosen SubNetworks, or the whole
 * Communication section when that is the explicit choice.
 * @param communication - the Communication section, when it is deleted.
 * @param deletedSubNetworks - networks the user chose to delete.
 * @returns the section edits; empty when nothing is deleted.
 */
export function sectionRemovalEdits(
  communication: Element | null,
  deletedSubNetworks: Element[],
): EditV2[] {
  if (communication !== null) {
    return [{ node: communication }];
  }
  return deletedSubNetworks.map(node => ({ node }));
}

/**
 * Builds the confirmation summary from the current choices.
 * @param input - the selected IEDs and removal choices.
 * @returns the names and deletion/retention decisions shown to the user.
 */
export function removalSummary(input: SummaryInput): RemovalSummary {
  const wouldEmpty = wouldEmptyCommunication(
    input.communication,
    input.affectedSubNetworks,
    input.deletedSubNetworks,
  );
  return {
    iedNames: input.ieds.map(ied => ied.getAttribute('name') ?? ''),
    hasBoundLNodes: input.hasBoundLNodes,
    preserveLNodes: input.preserveLNodes,
    deletedSubNetworks: input.affectedSubNetworks
      .filter(network => input.deletedSubNetworks.has(network))
      .map(network => network.getAttribute('name') ?? ''),
    retainedSubNetworks: input.affectedSubNetworks
      .filter(network => !input.deletedSubNetworks.has(network))
      .map(network => network.getAttribute('name') ?? ''),
    deleteCommunication: wouldEmpty && input.deleteCommunication,
    retainCommunication: wouldEmpty && !input.deleteCommunication,
  };
}
