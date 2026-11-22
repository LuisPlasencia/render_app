import { normalizeTopologyDefinition } from './topologySchema.js';

const EXPERIMENT_FORMAT_VERSION = 1;

function toFileName(topologyName) {
  const slug = (topologyName || 'topologia')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug || 'topologia'}.json`;
}

// An experiment file bundles the topology with the seed and population so that a run can be reproduced
export function downloadExperiment({ topologyDefinition, seed, populationByClass, trafficProfile }) {
  const experiment = {
    formatVersion: EXPERIMENT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    topology: topologyDefinition,
    simulation: { seed, populationByClass, trafficProfile }
  };
  const fileUrl = URL.createObjectURL(new Blob([JSON.stringify(experiment, null, 2)], { type: 'application/json' }));
  const downloadLink = document.createElement('a');
  downloadLink.href = fileUrl;
  downloadLink.download = toFileName(topologyDefinition.name);
  downloadLink.click();
  URL.revokeObjectURL(fileUrl);
}

// Accepts both experiment files and bare topology files such as those in data/topologies
export function parseExperiment(fileText) {
  let parsedContent;
  try {
    parsedContent = JSON.parse(fileText);
  } catch (error) {
    throw new Error('El archivo no es un JSON válido.');
  }
  const isExperiment = parsedContent && typeof parsedContent === 'object' && 'topology' in parsedContent;
  const rawTopology = isExperiment ? parsedContent.topology : parsedContent;
  const simulation = isExperiment && parsedContent.simulation ? parsedContent.simulation : null;
  return { topologyDefinition: normalizeTopologyDefinition(rawTopology), simulation };
}
