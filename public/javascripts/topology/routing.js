// Static shortest-path routing (Dijkstra) weighted by link latency
export class RoutingTable {
  constructor(topology) {
    this.topology = topology;
    this.previousHopsBySource = new Map();
  }

  getRoute(sourceNodeId, destinationNodeId) {
    if (!this.previousHopsBySource.has(sourceNodeId)) {
      this.previousHopsBySource.set(sourceNodeId, this.computeShortestPaths(sourceNodeId));
    }
    const previousHops = this.previousHopsBySource.get(sourceNodeId);
    const nodeIds = [destinationNodeId];
    const links = [];
    let currentNodeId = destinationNodeId;

    while (currentNodeId !== sourceNodeId) {
      const previousHop = previousHops.get(currentNodeId);
      if (!previousHop) {
        return null;
      }
      nodeIds.unshift(previousHop.nodeId);
      links.unshift(previousHop.link);
      currentNodeId = previousHop.nodeId;
    }
    return { nodeIds, links };
  }

  computeShortestPaths(sourceNodeId) {
    const distanceByNodeId = new Map([[sourceNodeId, 0]]);
    const previousHops = new Map();
    const unvisitedNodeIds = new Set(this.topology.getNodes().map((node) => node.id));

    while (unvisitedNodeIds.size > 0) {
      let closestNodeId = null;
      for (const nodeId of unvisitedNodeIds) {
        const distance = distanceByNodeId.get(nodeId);
        if (distance !== undefined && (closestNodeId === null || distance < distanceByNodeId.get(closestNodeId))) {
          closestNodeId = nodeId;
        }
      }
      if (closestNodeId === null) {
        break;
      }
      unvisitedNodeIds.delete(closestNodeId);

      for (const { neighborNodeId, link } of this.topology.getNeighbors(closestNodeId)) {
        const candidateDistance = distanceByNodeId.get(closestNodeId) + link.latencyMs;
        const knownDistance = distanceByNodeId.get(neighborNodeId);
        if (knownDistance === undefined || candidateDistance < knownDistance) {
          distanceByNodeId.set(neighborNodeId, candidateDistance);
          previousHops.set(neighborNodeId, { nodeId: closestNodeId, link });
        }
      }
    }
    return previousHops;
  }
}
