export class TopologyModel {
  constructor(topologyDefinition) {
    this.name = topologyDefinition.name;
    this.nodesById = new Map(topologyDefinition.nodes.map((node) => [node.id, node]));
    this.linksById = new Map(topologyDefinition.links.map((link) => [link.id, link]));
    this.neighborsByNodeId = new Map(topologyDefinition.nodes.map((node) => [node.id, []]));

    for (const link of topologyDefinition.links) {
      this.neighborsByNodeId.get(link.source).push({ neighborNodeId: link.target, link });
      this.neighborsByNodeId.get(link.target).push({ neighborNodeId: link.source, link });
    }
  }

  getNode(nodeId) {
    return this.nodesById.get(nodeId);
  }

  getLink(linkId) {
    return this.linksById.get(linkId);
  }

  getNodes() {
    return [...this.nodesById.values()];
  }

  getLinks() {
    return [...this.linksById.values()];
  }

  getNeighbors(nodeId) {
    return this.neighborsByNodeId.get(nodeId) || [];
  }

  getAccessNodesHostingClass(trafficClassId) {
    return this.getNodes().filter(
      (node) => node.type === 'access' && (node.hostedAgentClasses || []).includes(trafficClassId)
    );
  }

  getServersOfferingService(serviceName) {
    return this.getNodes().filter((node) => node.type === 'server' && node.service === serviceName);
  }
}
