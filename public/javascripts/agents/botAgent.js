import { Agent } from './agent.js';
import { MESSAGE_KINDS } from '../simulation/messageCatalog.js';

const MINIMUM_SECONDS_BETWEEN_REQUESTS = 1;
const MAXIMUM_SECONDS_BETWEEN_REQUESTS = 2;
const WEB_SERVER_PROBABILITY = 0.7;

// Classic crawler/scraper: steady, high-volume requests that never publish content
export class BotAgent extends Agent {
  static getExpectedRequestsPerSecond() {
    return 2 / (MINIMUM_SECONDS_BETWEEN_REQUESTS + MAXIMUM_SECONDS_BETWEEN_REQUESTS);
  }

  getNextActivationDelaySeconds(random) {
    return random.uniform(MINIMUM_SECONDS_BETWEEN_REQUESTS, MAXIMUM_SECONDS_BETWEEN_REQUESTS);
  }

  act(agentContext) {
    if (agentContext.random.chance(agentContext.trafficProfile.videoRequestShareByGroup.bot)) {
      agentContext.sendToService(this, 'video', MESSAGE_KINDS.CONTENT_REQUEST);
      return;
    }
    const serviceName = agentContext.random.chance(WEB_SERVER_PROBABILITY) ? 'web' : 'social';
    agentContext.sendToService(this, serviceName, MESSAGE_KINDS.CONTENT_REQUEST);
  }
}
