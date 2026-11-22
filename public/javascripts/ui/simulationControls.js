import { TRAFFIC_CLASSES } from '../shared/trafficClasses.js';

const MAXIMUM_AGENTS_PER_CLASS = 40;
const DEFAULT_SEED = 42;

export class SimulationControls {
  constructor({ elements, onPlayToggle, onReset, onSpeedChange, onPopulationChange, onSeedChange, onUnitChange }) {
    this.elements = elements;
    this.populationInputsByClass = {};
    this.populationOutputsByClass = {};
    this.buildPopulationControls(onPopulationChange);

    elements.playPauseButton.addEventListener('click', onPlayToggle);
    elements.resetButton.addEventListener('click', onReset);
    elements.speedSelect.addEventListener('change', () => onSpeedChange(this.getSpeed()));
    elements.seedInput.addEventListener('change', onSeedChange);
    elements.unitSelect.addEventListener('change', () => onUnitChange(elements.unitSelect.value));
  }

  buildPopulationControls(onPopulationChange) {
    for (const trafficClass of TRAFFIC_CLASSES) {
      const row = document.createElement('label');
      row.className = 'population-control';

      const swatch = document.createElement('span');
      swatch.className = 'legend-swatch';
      swatch.style.backgroundColor = trafficClass.color;

      const name = document.createElement('span');
      name.className = 'population-name';
      name.textContent = trafficClass.label;

      const input = document.createElement('input');
      input.type = 'range';
      input.min = '0';
      input.max = String(MAXIMUM_AGENTS_PER_CLASS);
      input.value = String(trafficClass.defaultPopulation);

      const output = document.createElement('output');
      output.textContent = input.value;

      input.addEventListener('input', () => { output.textContent = input.value; });
      input.addEventListener('change', onPopulationChange);

      row.append(swatch, name, output, input);
      this.elements.populationContainer.appendChild(row);
      this.populationInputsByClass[trafficClass.id] = input;
      this.populationOutputsByClass[trafficClass.id] = output;
    }
  }

  getPopulationByClass() {
    return Object.fromEntries(
      Object.entries(this.populationInputsByClass).map(([trafficClassId, input]) => [trafficClassId, Number(input.value)])
    );
  }

  setPopulationByClass(populationByClass) {
    for (const [trafficClassId, input] of Object.entries(this.populationInputsByClass)) {
      if (Number.isFinite(populationByClass[trafficClassId])) {
        const agentCount = Math.min(MAXIMUM_AGENTS_PER_CLASS, Math.max(0, Math.round(populationByClass[trafficClassId])));
        input.value = String(agentCount);
        this.populationOutputsByClass[trafficClassId].textContent = input.value;
      }
    }
  }

  setSeed(seed) {
    if (Number.isInteger(seed) && seed > 0) {
      this.elements.seedInput.value = String(seed);
    }
  }

  getSeed() {
    const seed = Number.parseInt(this.elements.seedInput.value, 10);
    return Number.isFinite(seed) && seed > 0 ? seed : DEFAULT_SEED;
  }

  getSpeed() {
    return Number(this.elements.speedSelect.value);
  }

  getUnit() {
    return this.elements.unitSelect.value;
  }

  setRunning(isRunning) {
    this.elements.playPauseButton.textContent = isRunning ? 'Pausar' : 'Iniciar';
  }
}
