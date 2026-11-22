import { TRAFFIC_CLASSES } from '../shared/trafficClasses.js';

export function renderTrafficLegend(listElement) {
  for (const trafficClass of TRAFFIC_CLASSES) {
    const item = document.createElement('li');
    const swatch = document.createElement('span');
    swatch.className = 'legend-swatch';
    swatch.style.backgroundColor = trafficClass.color;
    item.append(swatch, trafficClass.label);
    listElement.appendChild(item);
  }
}
