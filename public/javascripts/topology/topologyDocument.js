import { normalizeTopologyDefinition } from './topologySchema.js';
import { suggestRouterAddress, suggestServerAddress, suggestAccessSubnet } from './addressPlanner.js';
import {
  ACCESS_TECHNOLOGIES,
  DEFAULT_ACCESS_TECHNOLOGY,
  CORE_LINK_DEFAULTS,
  SERVER_SERVICES,
  DEFAULT_SERVER_SERVICE
} from './networkCatalog.js';

export const CHANGE_TYPES = {
  RELOADED: 'reloaded',
  STRUCTURE: 'structure',
  PROPERTIES: 'properties',
  POSITION: 'position'
};

// Editable copy of a topology definition; every mutation notifies the listeners with the kind of change
export class TopologyDocument {
  constructor(topologyDefinition) {
    this.changeListeners = new Set();
    this.load(topologyDefinition);
  }

  load(topologyDefinition) {
    this.definition = normalizeTopologyDefinition(structuredClone(topologyDefinition));
    this.notify(CHANGE_TYPES.RELOADED);
  }

  toDefinition() {
    return structuredClone(this.definition);
  }

  onChange(listener) {
    this.changeListeners.add(listener);
  }

  notify(changeType) {
    for (const listener of this.changeListeners) {
      listener(changeType);
    }
  }

  getNode(nodeId) {
    return this.definition.nodes.find((node) => node.id === nodeId) || null;
  }

  getLink(linkId) {
    return this.definition.links.find((link) => link.id === linkId) || null;
  }

  createUniqueId(prefix) {
    const usedIds = new Set([...this.definition.nodes, ...this.definition.links].map((element) => element.id));
    let sequenceNumber = 1;
    while (usedIds.has(`${prefix}${sequenceNumber}`)) {
      sequenceNumber += 1;
    }
    return `${prefix}${sequenceNumber}`;
  }

  addNode(nodeType, position) {
    const node = this.createNodeDefaults(nodeType);
    node.position = { x: position.x, y: position.y };
    this.definition.nodes.push(node);
    this.notify(CHANGE_TYPES.STRUCTURE);
    return node;
  }

  createNodeDefaults(nodeType) {
    switch (nodeType) {
      case 'router': {
        const id = this.createUniqueId('R');
        return { id, type: 'router', label: id, ip: suggestRouterAddress(this.definition) };
      }
      case 'access': {
        const technology = ACCESS_TECHNOLOGIES[DEFAULT_ACCESS_TECHNOLOGY];
        return {
          id: this.createUniqueId('acceso-'),
          type: 'access',
          label: `Acceso ${technology.label}`,
          accessTechnology: DEFAULT_ACCESS_TECHNOLOGY,
          subnet: suggestAccessSubnet(this.definition),
          hostedAgentClasses: [...technology.defaultHostedClasses]
        };
      }
      case 'server':
        return {
          id: this.createUniqueId('servidor-'),
          type: 'server',
          label: SERVER_SERVICES[DEFAULT_SERVER_SERVICE].label,
          service: DEFAULT_SERVER_SERVICE,
          ip: suggestServerAddress(this.definition)
        };
      default:
        throw new Error(`Unknown node type: ${nodeType}`);
    }
  }

  updateNode(nodeId, changes) {
    Object.assign(this.getNode(nodeId), changes);
    this.notify(CHANGE_TYPES.PROPERTIES);
  }

  moveNode(nodeId, position) {
    this.getNode(nodeId).position = { x: position.x, y: position.y };
    this.notify(CHANGE_TYPES.POSITION);
  }

  removeNode(nodeId) {
    this.definition.nodes = this.definition.nodes.filter((node) => node.id !== nodeId);
    this.definition.links = this.definition.links.filter((link) => link.source !== nodeId && link.target !== nodeId);
    this.notify(CHANGE_TYPES.STRUCTURE);
  }

  hasLinkBetween(firstNodeId, secondNodeId) {
    return this.definition.links.some(
      (link) =>
        (link.source === firstNodeId && link.target === secondNodeId) ||
        (link.source === secondNodeId && link.target === firstNodeId)
    );
  }

  // Returns null when the link would be a self-loop or a duplicate
  addLink(sourceNodeId, targetNodeId) {
    if (sourceNodeId === targetNodeId || this.hasLinkBetween(sourceNodeId, targetNodeId)) {
      return null;
    }
    const link = {
      id: this.createUniqueId(`${sourceNodeId}-${targetNodeId}-`),
      source: sourceNodeId,
      target: targetNodeId,
      ...this.getLinkDefaults(sourceNodeId, targetNodeId)
    };
    this.definition.links.push(link);
    this.notify(CHANGE_TYPES.STRUCTURE);
    return link;
  }

  // A link that touches an access network takes the typical parameters of its technology
  getLinkDefaults(sourceNodeId, targetNodeId) {
    const accessNode = [this.getNode(sourceNodeId), this.getNode(targetNodeId)].find((node) => node.type === 'access');
    const technology = accessNode ? ACCESS_TECHNOLOGIES[accessNode.accessTechnology] : null;
    return { ...(technology ? technology.linkDefaults : CORE_LINK_DEFAULTS) };
  }

  updateLink(linkId, changes) {
    Object.assign(this.getLink(linkId), changes);
    this.notify(CHANGE_TYPES.PROPERTIES);
  }

  removeLink(linkId) {
    this.definition.links = this.definition.links.filter((link) => link.id !== linkId);
    this.notify(CHANGE_TYPES.STRUCTURE);
  }
}
