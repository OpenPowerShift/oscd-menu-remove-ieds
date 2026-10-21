/** Reports containers that would lose their last connection through this selection. */
export declare function checkForEmptyCommunicationContainers(doc: XMLDocument, ieds: Element[]): {
    subNetworks: Element[];
    communication: Element | null;
};
