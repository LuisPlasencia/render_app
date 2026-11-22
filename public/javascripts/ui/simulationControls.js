import { TRAFFIC_CLASSES } from '../shared/trafficClasses.js';
import { DEFAULT_TRAFFIC_PROFILE } from '../shared/trafficProfile.js';
import { MAXIMUM_AGENTS_PER_CLASS } from '../shared/simulationLimits.js';

const DEFAULT_SEED = 42;
const VIDEO_SHARE_STEP_PERCENT = 0.5;
const VIDEO_SHARE_CONTROLS = [
  { group: 'human', label: 'Vídeo en peticiones humanas', maximumPercent: 60, color: '#2F5BEA' },
  { group: 'bot', label: 'Vídeo en peticiones de bots', maximumPercent: 30, color: '#5F6B78' }
];

export class SimulationControls {
  constructor({
    elements,
    onPlayToggle,
    onReset,
    onSpeedChange,
    onPopulationChange,
    onTrafficProfileChange,
    onSeedChange,
    onUnitChange,
    onGroupingChange
  }) {
    this.elements = elements;
    this.populationInputsByClass = {};
    this.populationOutputsByClass = {};
    this.videoShareInputsByGroup = {};
    this.videoShareOutputsByGroup = {};
    this.buildPopulationControls(onPopulationChange);
    this.buildTrafficProfileControls(onTrafficProfileChange);

    elements.playPauseButton.addEventListener('click', onPlayToggle);
    elements.resetButton.addEventListener('click', onReset);
    elements.speedSelect.addEventListener('change', () => onSpeedChange(this.getSpeed()));
    elements.seedInput.addEventListener('change', onSeedChange);
    elements.unitSelect.addEventListener('change', () => onUnitChange(elements.unitSelect.value));
    elements.groupingSelect.addEventListener('change', () => onGroupingChange(elements.groupingSelect.value));
  }

  createSliderRow({ label, color, maximum, step = 1, value, formatValue, onCommit }) {
    const row = document.createElement('label');
    row.className = 'population-control';

    const swatch = document.createElement('span');
    swatch.className = 'legend-swatch';
    swatch.style.backgroundColor = color;

    const name = document.createElement('span');
    name.className = 'population-name';
    name.textContent = label;

    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = String(maximum);
    input.step = String(step);
    input.value = String(value);

    const output = document.createElement('output');
    output.textContent = formatValue(input.value);

    input.addEventListener('input', () => { output.textContent = formatValue(input.value); });
    input.addEventListener('change', onCommit);

    row.append(swatch, name, output, input);
    return { row, input, output };
  }

  buildTrafficProfileControls(onTrafficProfileChange) {
    const formatPercent = (value) => `${value} %`;
    for (const control of VIDEO_SHARE_CONTROLS) {
      const { row, input, output } = this.createSliderRow({
        label: control.label,
        color: control.color,
        maximum: control.maximumPercent,
        step: VIDEO_SHARE_STEP_PERCENT,
        value: DEFAULT_TRAFFIC_PROFILE.videoRequestShareByGroup[control.group] * 100,
        formatValue: formatPercent,
        onCommit: onTrafficProfileChange
      });
      this.elements.trafficProfileContainer.appendChild(row);
      this.videoShareInputsByGroup[control.group] = input;
      this.videoShareOutputsByGroup[control.group] = output;
    }
  }

  getTrafficProfile() {
    return {
      videoRequestShareByGroup: Object.fromEntries(
        Object.entries(this.videoShareInputsByGroup).map(([group, input]) => [group, Number(input.value) / 100])
      )
    };
  }

  setTrafficProfile(trafficProfile) {
    for (const [group, input] of Object.entries(this.videoShareInputsByGroup)) {
      const share = trafficProfile.videoRequestShareByGroup[group];
      if (Number.isFinite(share)) {
        const roundedPercent = Math.round((share * 100) / VIDEO_SHARE_STEP_PERCENT) * VIDEO_SHARE_STEP_PERCENT;
        input.value = String(Math.min(Number(input.max), roundedPercent));
        this.videoShareOutputsByGroup[group].textContent = `${input.value} %`;
      }
    }
  }

  buildPopulationControls(onPopulationChange) {
    for (const trafficClass of TRAFFIC_CLASSES) {
      const { row, input, output } = this.createSliderRow({
        label: trafficClass.label,
        color: trafficClass.color,
        maximum: MAXIMUM_AGENTS_PER_CLASS,
        value: trafficClass.defaultPopulation,
        formatValue: (value) => value,
        onCommit: onPopulationChange
      });
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

  getGrouping() {
    return this.elements.groupingSelect.value;
  }

  setRunning(isRunning) {
    this.elements.playPauseButton.textContent = isRunning ? 'Pausar' : 'Iniciar';
  }
}
