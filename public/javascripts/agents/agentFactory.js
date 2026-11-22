import { HumanAgent } from './humanAgent.js';
import { BotAgent } from './botAgent.js';
import { GenAiAgent } from './genAiAgent.js';
import { SensorAgent } from './sensorAgent.js';
import { SubnetAddressAllocator } from '../topology/ipAddressing.js';

export const AGENT_TYPE_BY_TRAFFIC_CLASS = {
  'human-mobile': HumanAgent,
  'human-desktop': HumanAgent,
  bot: BotAgent,
  genai: GenAiAgent,
  sensor: SensorAgent
};

// Agents of each class are spread round-robin over the access networks that host that class
export function createAgentPopulation({ topology, populationByClass }) {
  const addressAllocatorByNodeId = new Map();
  const agents = [];

  for (const [trafficClassId, agentCount] of Object.entries(populationByClass)) {
    const AgentType = AGENT_TYPE_BY_TRAFFIC_CLASS[trafficClassId];
    const accessNodes = topology.getAccessNodesHostingClass(trafficClassId);
    if (!AgentType || accessNodes.length === 0) {
      continue;
    }

    for (let agentIndex = 0; agentIndex < agentCount; agentIndex++) {
      const accessNode = accessNodes[agentIndex % accessNodes.length];
      if (!addressAllocatorByNodeId.has(accessNode.id)) {
        addressAllocatorByNodeId.set(accessNode.id, new SubnetAddressAllocator(accessNode.subnet));
      }
      agents.push(new AgentType({
        id: `${trafficClassId}-${agentIndex + 1}`,
        trafficClassId,
        nodeId: accessNode.id,
        ipAddress: addressAllocatorByNodeId.get(accessNode.id).allocate()
      }));
    }
  }
  return agents;
}
