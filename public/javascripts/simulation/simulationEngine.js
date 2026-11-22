import { TopologyModel } from '../topology/topologyModel.js';
import { RoutingTable } from '../topology/routing.js';
import { SeededRandom } from '../shared/seededRandom.js';
import { createAgentPopulation } from '../agents/agentFactory.js';
import { EventQueue } from './eventQueue.js';
import { ContentPlatform } from './contentPlatform.js';
import { MetricsCollector } from './metricsCollector.js';
import { REQUEST_SIZES_BYTES } from './messageCatalog.js';
import { handleMessageAtServer } from './serverResponder.js';

const METRICS_WINDOW_SECONDS = 1;
const SERVER_PROCESSING_DELAY_SECONDS = 0.005;
const EVENT_TYPES = {
  AGENT_ACTIVATION: 'agent-activation',
  MESSAGE_SEND: 'message-send',
  MESSAGE_DELIVERY: 'message-delivery'
};

export class SimulationEngine {
  constructor({ topologyDefinition, populationByClass, seed }) {
    this.topology = new TopologyModel(topologyDefinition);
    this.routingTable = new RoutingTable(this.topology);
    this.random = new SeededRandom(seed);
    this.eventQueue = new EventQueue();
    this.contentPlatform = new ContentPlatform();
    this.metricsCollector = new MetricsCollector(METRICS_WINDOW_SECONDS);
    this.currentTime = 0;
    this.nextMessageId = 1;
    this.pendingTransmissions = [];
    this.agentContext = {
      random: this.random,
      contentPlatform: this.contentPlatform,
      getCurrentTime: () => this.currentTime,
      sendToService: (agent, serviceName, messageKind, payload) =>
        this.sendToService(agent, serviceName, messageKind, payload)
    };

    this.agents = createAgentPopulation({ topology: this.topology, populationByClass });
    for (const agent of this.agents) {
      agent.initialize(this.random);
      this.eventQueue.push(agent.getInitialActivationDelaySeconds(this.random), {
        type: EVENT_TYPES.AGENT_ACTIVATION,
        agent
      });
    }
  }

  advanceTo(targetTime) {
    while (!this.eventQueue.isEmpty() && this.eventQueue.peekTime() <= targetTime) {
      const event = this.eventQueue.pop();
      this.currentTime = event.time;
      this.metricsCollector.advanceTo(this.currentTime);
      this.handleEvent(event);
    }
    this.currentTime = targetTime;
    this.metricsCollector.advanceTo(targetTime);
  }

  handleEvent(event) {
    switch (event.type) {
      case EVENT_TYPES.AGENT_ACTIVATION:
        event.agent.act(this.agentContext);
        this.eventQueue.push(this.currentTime + event.agent.getNextActivationDelaySeconds(this.random, this.currentTime), {
          type: EVENT_TYPES.AGENT_ACTIVATION,
          agent: event.agent
        });
        break;
      case EVENT_TYPES.MESSAGE_SEND:
        this.transmit(event.message);
        break;
      case EVENT_TYPES.MESSAGE_DELIVERY:
        this.deliver(event.message);
        break;
    }
  }

  sendToService(agent, serviceName, messageKind, payload = {}) {
    const servers = this.topology.getServersOfferingService(serviceName);
    if (servers.length === 0) {
      return;
    }
    this.transmit({
      trafficClassId: agent.trafficClassId,
      kind: messageKind,
      sizeBytes: REQUEST_SIZES_BYTES[messageKind],
      sourceNodeId: agent.nodeId,
      destinationNodeId: this.random.pick(servers).id,
      payload
    });
  }

  // Routes are static, so per-hop delay and loss can be resolved when the message is sent
  transmit(message) {
    const route = this.routingTable.getRoute(message.sourceNodeId, message.destinationNodeId);
    if (!route) {
      return;
    }
    message.id = this.nextMessageId++;

    const hopDelaysMs = [];
    let totalDelaySeconds = 0;
    let droppedAtLinkIndex = -1;
    for (let linkIndex = 0; linkIndex < route.links.length; linkIndex++) {
      const link = route.links[linkIndex];
      const transmissionDelaySeconds = (message.sizeBytes * 8) / (link.bandwidthMbps * 1e6);
      const hopDelaySeconds = link.latencyMs / 1000 + transmissionDelaySeconds;
      hopDelaysMs.push(hopDelaySeconds * 1000);
      totalDelaySeconds += hopDelaySeconds;
      if (this.random.chance(link.lossRate)) {
        droppedAtLinkIndex = linkIndex;
        break;
      }
    }

    const dropped = droppedAtLinkIndex >= 0;
    const traversedLinks = dropped ? route.links.slice(0, droppedAtLinkIndex + 1) : route.links;
    this.metricsCollector.recordTransmission({
      trafficClassId: message.trafficClassId,
      sizeBytes: message.sizeBytes,
      traversedLinks,
      dropped
    });
    this.pendingTransmissions.push({
      messageId: message.id,
      trafficClassId: message.trafficClassId,
      kind: message.kind,
      nodePath: route.nodeIds.slice(0, traversedLinks.length + 1),
      hopDelaysMs,
      dropped
    });

    if (!dropped) {
      this.eventQueue.push(this.currentTime + totalDelaySeconds, { type: EVENT_TYPES.MESSAGE_DELIVERY, message });
    }
  }

  deliver(message) {
    const destinationNode = this.topology.getNode(message.destinationNodeId);
    if (destinationNode.type !== 'server') {
      return;
    }
    const response = handleMessageAtServer(message, destinationNode, this.contentPlatform, this.currentTime);
    if (response) {
      this.eventQueue.push(this.currentTime + SERVER_PROCESSING_DELAY_SECONDS, {
        type: EVENT_TYPES.MESSAGE_SEND,
        message: response
      });
    }
  }

  getAgentCountByNodeId() {
    const agentCountByNodeId = {};
    for (const agent of this.agents) {
      agentCountByNodeId[agent.nodeId] = (agentCountByNodeId[agent.nodeId] || 0) + 1;
    }
    return agentCountByNodeId;
  }

  drainTransmissions() {
    const transmissions = this.pendingTransmissions;
    this.pendingTransmissions = [];
    return transmissions;
  }

  drainCompletedWindows() {
    return this.metricsCollector.drainCompletedWindows();
  }

  getContentStatistics() {
    return this.contentPlatform.getStatistics();
  }
}
