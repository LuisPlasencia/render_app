import { TRAFFIC_CLASSES } from '../shared/trafficClasses.js';

function formatPercent(fraction) {
  return `${(fraction * 100).toFixed(1)} %`;
}

export function renderCalibrationPreview(listElement, calibrationProfile) {
  listElement.replaceChildren();
  const { inputs, simulation } = calibrationProfile;
  const population = simulation.populationByClass;
  const videoShares = simulation.trafficProfile.videoRequestShareByGroup;
  const populationDescription = TRAFFIC_CLASSES
    .map((trafficClass) => `${trafficClass.label}: ${population[trafficClass.id]}`)
    .join(', ');

  const lines = [
    `Peticiones automatizadas medidas: ${formatPercent(inputs.automatedRequestShare)}.`,
    `Tráfico humano desde móvil: ${formatPercent(inputs.humanMobileShare)}.`,
    `Población resultante (${populationDescription}). Los sensores no se calibran porque no hay datos públicos.`,
    `Vídeo en las peticiones humanas: ${formatPercent(videoShares.human)}; en las de bots: ${formatPercent(videoShares.bot)}.`
  ];
  for (const line of lines) {
    const item = document.createElement('li');
    item.textContent = line;
    listElement.appendChild(item);
  }
}
