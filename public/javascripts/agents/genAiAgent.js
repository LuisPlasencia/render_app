import { Agent } from './agent.js';
import { publishPostOrReply } from './contentActions.js';
import { MESSAGE_KINDS } from '../simulation/messageCatalog.js';

const MEAN_SECONDS_BETWEEN_ACTIONS = 2.5;
const FEED_SCRAPE_PROBABILITY = 0.3;
const REPLY_PROBABILITY = 0.7;

// Generative agent: publishes synthetic content and mostly replies to whatever is recent, human or not
export class GenAiAgent extends Agent {
  static getExpectedRequestsPerSecond() {
    return 1 / MEAN_SECONDS_BETWEEN_ACTIONS;
  }

  getNextActivationDelaySeconds(random) {
    return random.exponential(MEAN_SECONDS_BETWEEN_ACTIONS);
  }

  act(agentContext) {
    if (agentContext.random.chance(FEED_SCRAPE_PROBABILITY)) {
      agentContext.sendToService(this, 'social', MESSAGE_KINDS.CONTENT_REQUEST);
    } else {
      publishPostOrReply(this, agentContext, REPLY_PROBABILITY);
    }
  }
}
