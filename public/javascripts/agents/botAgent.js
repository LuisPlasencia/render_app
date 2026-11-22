import { Agent } from './agent.js';
import { MESSAGE_KINDS } from '../simulation/messageCatalog.js';

const MINIMUM_SECONDS_BETWEEN_REQUESTS = 1;
const MAXIMUM_SECONDS_BETWEEN_REQUESTS = 2;
const WEB_SERVER_PROBABILITY = 0.7;

// Classic crawler/scraper: steady, high-volume requests that never publish content
export class BotAgent extends Agent {
  getNextActivationDelaySeconds(random) {
    return random.uniform(MINIMUM_SECONDS_BETWEEN_REQUESTS, MAXIMUM_SECONDS_BETWEEN_REQUESTS);
  }

  act(agentContext) {
    const serviceName = agentContext.random.chance(WEB_SERVER_PROBABILITY) ? 'web' : 'social';
    agentContext.sendToService(this, serviceName, MESSAGE_KINDS.PAGE_REQUEST);
  }
}
