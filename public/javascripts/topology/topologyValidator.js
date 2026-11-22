import { isValidIpv4, isValidCidr, subnetsOverlap, isAddressInSubnet, getAgentCapacity } from './ipAddressing.js';
import { SERVER_SERVICES } from './networkCatalog.js';
import { TRAFFIC_CLASSES } from '../shared/trafficClasses.js';

const SERVICE_REQUIRED_BY_CLASS = {
  'human-mobile': ['web', 'social'],
  'human-desktop': ['web', 'social'],
  bot: ['web', 'social'],
  genai: ['social'],
  sensor: ['iot']
};

class ValidationReport {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  addError(message, elementId = null) {
    this.errors.push({ message, elementId });
  }

  addWarning(message, elementId = null) {
    this.warnings.push({ message, elementId });
  }

  isValid() {
    return this.errors.length === 0;
  }
}

function describeNode(node) {
  return node.label && node.label !== node.id ? `"${node.label}" (${node.id})` : `"${node.id}"`;
}

function formatAgentCount(agentCount) {
  return `${agentCount} ${agentCount === 1 ? 'agente' : 'agentes'}`;
}

function validateAddresses(definition, report) {
  const nodeByAddress = new Map();
  const accessNodes = definition.nodes.filter((node) => node.type === 'access');

  for (const node of definition.nodes.filter((candidate) => candidate.type !== 'access')) {
    if (!isValidIpv4(node.ip)) {
      report.addError(`${describeNode(node)} tiene una IP no válida: "${node.ip || ''}".`, node.id);
      continue;
    }
    if (nodeByAddress.has(node.ip)) {
      report.addError(`${describeNode(node)} repite la IP ${node.ip} de ${describeNode(nodeByAddress.get(node.ip))}.`, node.id);
    }
    nodeByAddress.set(node.ip, node);
  }

  const validAccessNodes = [];
  for (const accessNode of accessNodes) {
    if (!isValidCidr(accessNode.subnet)) {
      report.addError(`${describeNode(accessNode)} tiene una subred no válida: "${accessNode.subnet || ''}" (formato a.b.c.d/n, n entre 8 y 30).`, accessNode.id);
      continue;
    }
    for (const otherAccessNode of validAccessNodes) {
      if (subnetsOverlap(accessNode.subnet, otherAccessNode.subnet)) {
        report.addError(`La subred de ${describeNode(accessNode)} se solapa con la de ${describeNode(otherAccessNode)}.`, accessNode.id);
      }
    }
    for (const [address, node] of nodeByAddress) {
      if (isAddressInSubnet(address, accessNode.subnet)) {
        report.addError(`La IP de ${describeNode(node)} cae dentro de la subred de ${describeNode(accessNode)}.`, node.id);
      }
    }
    validAccessNodes.push(accessNode);
  }
}

function validateLinks(definition, report) {
  for (const link of definition.links) {
    const linkName = `El enlace ${link.source} ↔ ${link.target}`;
    if (!(link.latencyMs > 0)) {
      report.addError(`${linkName} necesita una latencia mayor que 0 ms.`, link.id);
    }
    if (!(link.bandwidthMbps > 0)) {
      report.addError(`${linkName} necesita un ancho de banda mayor que 0 Mbps.`, link.id);
    }
    if (!(link.lossRate >= 0 && link.lossRate < 1)) {
      report.addError(`${linkName} necesita una tasa de pérdida entre 0 y 1 (sin llegar a 1).`, link.id);
    }
  }
}

function validateConnectivity(definition, report) {
  if (definition.nodes.length === 0) {
    report.addError('La red está vacía.');
    return;
  }
  const neighborsByNodeId = new Map(definition.nodes.map((node) => [node.id, []]));
  for (const link of definition.links) {
    neighborsByNodeId.get(link.source).push(link.target);
    neighborsByNodeId.get(link.target).push(link.source);
  }
  const reachedNodeIds = new Set([definition.nodes[0].id]);
  const pendingNodeIds = [definition.nodes[0].id];
  while (pendingNodeIds.length > 0) {
    for (const neighborNodeId of neighborsByNodeId.get(pendingNodeIds.pop())) {
      if (!reachedNodeIds.has(neighborNodeId)) {
        reachedNodeIds.add(neighborNodeId);
        pendingNodeIds.push(neighborNodeId);
      }
    }
  }
  for (const node of definition.nodes) {
    if (!reachedNodeIds.has(node.id)) {
      report.addError(`${describeNode(node)} no está conectado con el resto de la red.`, node.id);
    }
  }
}

// Mirrors the round-robin placement of the agent factory to detect subnets that cannot hold their agents
function validatePopulation(definition, populationByClass, report) {
  const accessNodes = definition.nodes.filter((node) => node.type === 'access');
  const assignedAgentsByNodeId = new Map(accessNodes.map((node) => [node.id, 0]));
  const offeredServices = new Set(definition.nodes.filter((node) => node.type === 'server').map((node) => node.service));

  for (const accessNode of accessNodes) {
    if ((accessNode.hostedAgentClasses || []).length === 0) {
      report.addWarning(`${describeNode(accessNode)} no aloja ningún tipo de agente.`, accessNode.id);
    }
  }

  for (const trafficClass of TRAFFIC_CLASSES) {
    const agentCount = populationByClass[trafficClass.id] || 0;
    if (agentCount === 0) {
      continue;
    }
    const hostingNodes = accessNodes.filter((node) => (node.hostedAgentClasses || []).includes(trafficClass.id));
    if (hostingNodes.length === 0) {
      report.addWarning(`Ninguna red de acceso aloja "${trafficClass.label}": ${formatAgentCount(agentCount)} no participarán.`);
      continue;
    }
    for (let agentIndex = 0; agentIndex < agentCount; agentIndex++) {
      const hostingNode = hostingNodes[agentIndex % hostingNodes.length];
      assignedAgentsByNodeId.set(hostingNode.id, assignedAgentsByNodeId.get(hostingNode.id) + 1);
    }
    const missingServices = SERVICE_REQUIRED_BY_CLASS[trafficClass.id].filter((service) => !offeredServices.has(service));
    if (missingServices.length === SERVICE_REQUIRED_BY_CLASS[trafficClass.id].length) {
      const serviceNames = missingServices.map((service) => SERVER_SERVICES[service].label).join(' o ');
      report.addWarning(`No hay ${serviceNames}: "${trafficClass.label}" no generará tráfico.`);
    }
  }

  for (const accessNode of accessNodes) {
    if (!isValidCidr(accessNode.subnet)) {
      continue;
    }
    const assignedAgents = assignedAgentsByNodeId.get(accessNode.id);
    const capacity = getAgentCapacity(accessNode.subnet);
    if (assignedAgents > capacity) {
      report.addError(`La subred de ${describeNode(accessNode)} admite ${formatAgentCount(capacity)} y se le asignan ${assignedAgents}.`, accessNode.id);
    }
  }
}

export function validateTopology(definition, populationByClass = {}) {
  const report = new ValidationReport();
  validateAddresses(definition, report);
  validateLinks(definition, report);
  validateConnectivity(definition, report);
  validatePopulation(definition, populationByClass, report);
  return report;
}
