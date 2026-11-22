export class SimulationClient {
  constructor({ onReady, onTick }) {
    this.worker = new Worker(new URL('./simulation.worker.js', import.meta.url), { type: 'module' });
    this.worker.onmessage = (event) => {
      if (event.data.type === 'ready') {
        onReady(event.data);
      } else if (event.data.type === 'tick') {
        onTick(event.data);
      }
    };
    this.worker.onerror = (error) => console.error('Simulation worker error', error);
  }

  configure({ topologyDefinition, populationByClass, seed }) {
    this.worker.postMessage({ type: 'configure', topologyDefinition, populationByClass, seed });
  }

  start() {
    this.worker.postMessage({ type: 'start' });
  }

  pause() {
    this.worker.postMessage({ type: 'pause' });
  }

  setSpeed(simulatedSecondsPerRealSecond) {
    this.worker.postMessage({ type: 'set-speed', simulatedSecondsPerRealSecond });
  }
}
