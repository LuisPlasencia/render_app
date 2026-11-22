import { SimulationEngine } from './simulationEngine.js';

const TICK_INTERVAL_MS = 50;
// Only limits what is animated; metrics always include every message
const MAXIMUM_TRANSMISSIONS_PER_TICK = 120;

let simulationEngine = null;
let simulationConfiguration = null;
let isRunning = false;
let simulatedSecondsPerRealSecond = 1;

function createEngine() {
  simulationEngine = new SimulationEngine(simulationConfiguration);
  self.postMessage({ type: 'ready', agentCountByNodeId: simulationEngine.getAgentCountByNodeId() });
}

function advanceSimulation() {
  if (!isRunning || !simulationEngine) {
    return;
  }
  const simulatedStepSeconds = (TICK_INTERVAL_MS / 1000) * simulatedSecondsPerRealSecond;
  simulationEngine.advanceTo(simulationEngine.currentTime + simulatedStepSeconds);
  self.postMessage({
    type: 'tick',
    currentTime: simulationEngine.currentTime,
    transmissions: simulationEngine.drainTransmissions().slice(-MAXIMUM_TRANSMISSIONS_PER_TICK),
    completedWindows: simulationEngine.drainCompletedWindows(),
    contentStatistics: simulationEngine.getContentStatistics()
  });
}

self.onmessage = (event) => {
  const command = event.data;
  switch (command.type) {
    case 'configure':
      simulationConfiguration = {
        topologyDefinition: command.topologyDefinition,
        populationByClass: command.populationByClass,
        seed: command.seed
      };
      createEngine();
      break;
    case 'start':
      isRunning = true;
      break;
    case 'pause':
      isRunning = false;
      break;
    case 'set-speed':
      simulatedSecondsPerRealSecond = command.simulatedSecondsPerRealSecond;
      break;
  }
};

setInterval(advanceSimulation, TICK_INTERVAL_MS);
