import { isPublic } from '@openscd/scl-lib';

/** Reports containers that would lose their last connection through this selection. */
export function checkForEmptyCommunicationContainers(doc: XMLDocument, ieds: Element[]): {
  subNetworks: Element[];
  communication: Element | null;
} {
  const names = new Set(ieds.map(ied => ied.getAttribute('name')));
  const communication = doc.querySelector(':root > Communication');
  const networks = Array.from(
    communication?.querySelectorAll(':scope > SubNetwork') ?? [],
  ).filter(isPublic);
  const subNetworks = networks.filter((network) => {
    const connections = Array.from(network.querySelectorAll(':scope > ConnectedAP'));
    return connections.length > 0 && connections.every(
      connection => isPublic(connection) && names.has(connection.getAttribute('iedName')),
    );
  });
  return {
    subNetworks,
    communication: networks.length > 0 && subNetworks.length === networks.length
      ? communication
      : null,
  };
}
