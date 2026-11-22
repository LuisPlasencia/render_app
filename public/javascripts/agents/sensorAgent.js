import { Agent } from './agent.js';
import { MESSAGE_KINDS } from '../simulation/messageCatalog.js';

const REPORTING_PERIOD_SECONDS = 5;
const REPORTING_JITTER_SECONDS = 0.2;

// Deterministic telemetry: periodic small reports, automated by design rather than deceptive
export class SensorAgent extends Agent {
  getInitialActivationDelaySeconds(random) {
    return random.uniform(0, REPORTING_PERIOD_SECONDS);
  }

  getNextActivationDelaySeconds(random) {
    return REPORTING_PERIOD_SECONDS + random.uniform(-REPORTING_JITTER_SECONDS, REPORTING_JITTER_SECONDS);
  }

  act(agentContext) {
    agentContext.sendToService(this, 'iot', MESSAGE_KINDS.TELEMETRY);
  }
}
