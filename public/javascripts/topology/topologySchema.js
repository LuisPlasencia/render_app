import { NODE_TYPES } from './networkCatalog.js';

const DEFAULT_GRID_SPACING = 120;
const DEFAULT_GRID_COLUMNS = 5;

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Checks the structure of an imported topology and fills optional fields; semantic checks live in the validator
export function normalizeTopologyDefinition(rawDefinition) {
  assertCondition(rawDefinition && typeof rawDefinition === 'object', 'El archivo no contiene un objeto JSON.');
  assertCondition(Array.isArray(rawDefinition.nodes), 'Falta la lista "nodes".');
  assertCondition(Array.isArray(rawDefinition.links), 'Falta la lista "links".');

  const nodeIds = new Set();
  const nodes = rawDefinition.nodes.map((rawNode, nodeIndex) => {
    assertCondition(typeof rawNode.id === 'string' && rawNode.id.length > 0, `El nodo ${nodeIndex + 1} no tiene "id".`);
    assertCondition(!nodeIds.has(rawNode.id), `El id de nodo "${rawNode.id}" está repetido.`);
    assertCondition(rawNode.type in NODE_TYPES, `El nodo "${rawNode.id}" tiene un tipo desconocido: "${rawNode.type}".`);
    nodeIds.add(rawNode.id);

    const hasPosition = rawNode.position && Number.isFinite(rawNode.position.x) && Number.isFinite(rawNode.position.y);
    return {
      ...rawNode,
      label: typeof rawNode.label === 'string' ? rawNode.label : rawNode.id,
      hostedAgentClasses: rawNode.type === 'access' ? [...(rawNode.hostedAgentClasses || [])] : undefined,
      position: hasPosition
        ? { x: rawNode.position.x, y: rawNode.position.y }
        : {
            x: (nodeIndex % DEFAULT_GRID_COLUMNS) * DEFAULT_GRID_SPACING,
            y: Math.floor(nodeIndex / DEFAULT_GRID_COLUMNS) * DEFAULT_GRID_SPACING
          }
    };
  });

  const linkIds = new Set();
  const links = rawDefinition.links.map((rawLink, linkIndex) => {
    assertCondition(typeof rawLink.id === 'string' && rawLink.id.length > 0, `El enlace ${linkIndex + 1} no tiene "id".`);
    assertCondition(!linkIds.has(rawLink.id), `El id de enlace "${rawLink.id}" está repetido.`);
    assertCondition(nodeIds.has(rawLink.source) && nodeIds.has(rawLink.target), `El enlace "${rawLink.id}" apunta a un nodo inexistente.`);
    linkIds.add(rawLink.id);
    return {
      id: rawLink.id,
      source: rawLink.source,
      target: rawLink.target,
      latencyMs: Number(rawLink.latencyMs),
      bandwidthMbps: Number(rawLink.bandwidthMbps),
      lossRate: Number(rawLink.lossRate)
    };
  });

  return {
    name: typeof rawDefinition.name === 'string' ? rawDefinition.name : 'Topología importada',
    description: typeof rawDefinition.description === 'string' ? rawDefinition.description : '',
    nodes: nodes.map((node) => {
      if (node.hostedAgentClasses === undefined) {
        delete node.hostedAgentClasses;
      }
      return node;
    }),
    links
  };
}
