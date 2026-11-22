export class Agent {
  constructor({ id, trafficClassId, nodeId, ipAddress }) {
    this.id = id;
    this.trafficClassId = trafficClassId;
    this.nodeId = nodeId;
    this.ipAddress = ipAddress;
  }

  initialize(random) {}

  // Mean rate of HTTP requests sent by one agent, used to calibrate populations against measured traffic shares
  static getExpectedRequestsPerSecond() {
    throw new Error('getExpectedRequestsPerSecond must be implemented by each agent type');
  }

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
