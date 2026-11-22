import { Agent } from './agent.js';
import { publishPostOrReply } from './contentActions.js';
import { MESSAGE_KINDS } from '../simulation/messageCatalog.js';

const MEAN_SECONDS_BETWEEN_ACTIONS = 3;
const MEAN_SESSION_SECONDS = 25;
const MEAN_IDLE_SECONDS = 35;
const INITIAL_SESSION_PROBABILITY = 0.4;
export const POST_PROBABILITY = 0.15;
const REPLY_PROBABILITY = 0.5;
const MINIMUM_WAKE_UP_DELAY_SECONDS = 0.1;

// Humans alternate between browsing sessions and idle periods, which makes their traffic bursty
export class HumanAgent extends Agent {
  static getExpectedRequestsPerSecond() {
    const sessionFraction = MEAN_SESSION_SECONDS / (MEAN_SESSION_SECONDS + MEAN_IDLE_SECONDS);
    return sessionFraction / MEAN_SECONDS_BETWEEN_ACTIONS;
  }

  initialize(random) {
    this.isInSession = random.chance(INITIAL_SESSION_PROBABILITY);
    this.sessionStateEndsAt = random.exponential(this.isInSession ? MEAN_SESSION_SECONDS : MEAN_IDLE_SECONDS);
  }

  getNextActivationDelaySeconds(random, currentTime) {
    if (this.isInSession) {
      return random.exponential(MEAN_SECONDS_BETWEEN_ACTIONS);
    }
    return Math.max(MINIMUM_WAKE_UP_DELAY_SECONDS, this.sessionStateEndsAt - currentTime);
  }

  act(agentContext) {
    this.updateSessionState(agentContext.random, agentContext.getCurrentTime());
    if (!this.isInSession) {
      return;
    }
    if (agentContext.random.chance(POST_PROBABILITY)) {
      publishPostOrReply(this, agentContext, REPLY_PROBABILITY);
    } else if (agentContext.random.chance(agentContext.trafficProfile.videoRequestShareByGroup.human)) {
      agentContext.sendToService(this, 'video', MESSAGE_KINDS.CONTENT_REQUEST);
    } else {
      agentContext.sendToService(this, agentContext.random.pick(['web', 'social']), MESSAGE_KINDS.CONTENT_REQUEST);
    }
  }

  updateSessionState(random, currentTime) {
    while (currentTime >= this.sessionStateEndsAt) {
      this.isInSession = !this.isInSession;
      this.sessionStateEndsAt += random.exponential(this.isInSession ? MEAN_SESSION_SECONDS : MEAN_IDLE_SECONDS);
    }
  }
}
