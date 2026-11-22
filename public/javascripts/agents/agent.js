export class Agent {
  constructor({ id, trafficClassId, nodeId, ipAddress }) {
    this.id = id;
    this.trafficClassId = trafficClassId;
    this.nodeId = nodeId;
    this.ipAddress = ipAddress;
  }

  initialize(random) {}

  getInitialActivationDelaySeconds(random) {
    return random.uniform(0, 3);
  }

  getNextActivationDelaySeconds(random, currentTime) {
    throw new Error('getNextActivationDelaySeconds must be implemented by each agent type');
  }

  act(agentContext) {
    throw new Error('act must be implemented by each agent type');
  }
}
