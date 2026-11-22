import { fetchTopology } from '../topology/topologyRepository.js';
import { TopologyView } from '../topology/topologyView.js';
import { TopologyDocument, CHANGE_TYPES } from '../topology/topologyDocument.js';
import { validateTopology } from '../topology/topologyValidator.js';
import { SimulationClient } from '../simulation/simulationClient.js';
import { PacketRenderer } from '../visualization/packetRenderer.js';
import { TrafficShareChart } from '../visualization/trafficShareChart.js';
import { StatsPanel } from '../visualization/statsPanel.js';
import { renderTrafficLegend } from '../visualization/trafficLegend.js';
import { SimulationControls } from '../ui/simulationControls.js';
import { ModeTabs, PAGE_MODES } from '../ui/modeTabs.js';
import { StatusMessage } from '../ui/statusMessage.js';
import { TopologyEditor } from '../editor/topologyEditor.js';

const DEFAULT_TOPOLOGY_ID = 'default';
const INVALID_TOPOLOGY_MESSAGE = 'La red tiene errores. Revísalos en el editor de red antes de simular.';

async function initializeSimulatePage() {
  const topologyContainer = document.getElementById('topology-view');
  let initialTopologyDefinition;
  try {
    initialTopologyDefinition = await fetchTopology(DEFAULT_TOPOLOGY_ID);
  } catch (error) {
    topologyContainer.textContent = 'No se ha podido cargar la topología de red.';
    console.error(error);
    return;
  }

  const topologyDocument = new TopologyDocument(initialTopologyDefinition);
  const topologyView = new TopologyView(topologyContainer, topologyDocument.definition);
  // Registered before the editor so the graph is already updated when the editor reacts to the same change
  topologyDocument.onChange((changeType) => {
    if (changeType !== CHANGE_TYPES.POSITION) {
      topologyView.renderDefinition(topologyDocument.definition);
    }
  });

  const packetRenderer = new PacketRenderer(document.getElementById('packet-layer'), topologyView);
  const trafficShareChart = new TrafficShareChart(document.getElementById('traffic-share-chart'));
  const statsPanel = new StatsPanel(document.getElementById('stats-grid'));
  const simulationStatus = new StatusMessage(document.getElementById('simulation-status'));
  renderTrafficLegend(document.getElementById('traffic-legend'));

  let currentMode = PAGE_MODES.SIMULATION;
  let isRunning = false;
  let totalDroppedMessages = 0;
  let totalMessages = 0;

  const simulationClient = new SimulationClient({
    onReady: ({ agentCountByNodeId }) => topologyView.setAgentCounts(agentCountByNodeId),
    onTick: (tick) => {
      // Ticks already in flight when the editor opens refer to the old network and are ignored
      if (currentMode !== PAGE_MODES.SIMULATION) {
        return;
      }
      packetRenderer.addTransmissions(tick.transmissions);
      for (const window of tick.completedWindows) {
        totalDroppedMessages += window.droppedMessages;
        totalMessages += Object.values(window.messagesByClass).reduce((sum, count) => sum + count, 0);
      }
      const latestWindow = tick.completedWindows[tick.completedWindows.length - 1] || null;
      if (latestWindow) {
        trafficShareChart.addWindows(tick.completedWindows);
        topologyView.updateLinkLoads(latestWindow.bytesByLinkId, latestWindow.endTime - latestWindow.startTime);
      }
      statsPanel.update({
        currentTime: tick.currentTime,
        latestWindow,
        contentStatistics: tick.contentStatistics,
        totalDroppedMessages,
        totalMessages
      });
    }
  });

  const setRunning = (shouldRun) => {
    isRunning = shouldRun;
    if (shouldRun) {
      simulationClient.start();
    } else {
      simulationClient.pause();
    }
    simulationControls.setRunning(shouldRun);
  };

  const getSimulationSettings = () => ({
    seed: simulationControls.getSeed(),
    populationByClass: simulationControls.getPopulationByClass()
  });

  // Returns false when the network cannot be simulated with the current population
  const restartSimulation = () => {
    packetRenderer.clear();
    trafficShareChart.clear();
    statsPanel.reset();
    topologyView.resetLinkLoads();
    totalDroppedMessages = 0;
    totalMessages = 0;

    const simulationSettings = getSimulationSettings();
    const validationReport = validateTopology(topologyDocument.definition, simulationSettings.populationByClass);
    if (!validationReport.isValid()) {
      setRunning(false);
      simulationStatus.show(INVALID_TOPOLOGY_MESSAGE);
      return false;
    }
    simulationStatus.hide();
    simulationClient.configure({ topologyDefinition: topologyDocument.toDefinition(), ...simulationSettings });
    return true;
  };

  const simulationControls = new SimulationControls({
    elements: {
      playPauseButton: document.getElementById('play-pause-button'),
      resetButton: document.getElementById('reset-button'),
      speedSelect: document.getElementById('speed-select'),
      seedInput: document.getElementById('seed-input'),
      unitSelect: document.getElementById('unit-select'),
      populationContainer: document.getElementById('population-controls')
    },
    onPlayToggle: () => {
      if (!isRunning && simulationStatus.isVisible()) {
        return;
      }
      setRunning(!isRunning);
    },
    onReset: restartSimulation,
    onSpeedChange: (speed) => simulationClient.setSpeed(speed),
    onPopulationChange: () => {
      restartSimulation();
      topologyEditor.revalidate();
    },
    onSeedChange: restartSimulation,
    onUnitChange: (unit) => {
      trafficShareChart.setUnit(unit);
      statsPanel.setUnit(unit);
    }
  });

  const modeTabs = new ModeTabs({
    tabButtonsByMode: {
      [PAGE_MODES.SIMULATION]: document.getElementById('simulation-tab'),
      [PAGE_MODES.EDITOR]: document.getElementById('editor-tab')
    },
    panelsByMode: {
      [PAGE_MODES.SIMULATION]: document.getElementById('simulation-panel'),
      [PAGE_MODES.EDITOR]: document.getElementById('editor-panel')
    },
    onModeRequested: (mode) => (mode === PAGE_MODES.EDITOR ? enterEditor() : leaveEditor())
  });

  const enterEditor = () => {
    if (currentMode === PAGE_MODES.EDITOR) {
      return;
    }
    currentMode = PAGE_MODES.EDITOR;
    setRunning(false);
    packetRenderer.clear();
    topologyView.resetLinkLoads();
    topologyEditor.setEnabled(true);
    modeTabs.show(PAGE_MODES.EDITOR);
  };

  // The editor can only be left with a valid network, which then replaces the simulated one
  const leaveEditor = () => {
    if (currentMode === PAGE_MODES.SIMULATION) {
      return;
    }
    if (!topologyEditor.revalidate().isValid()) {
      return;
    }
    currentMode = PAGE_MODES.SIMULATION;
    topologyEditor.setEnabled(false);
    modeTabs.show(PAGE_MODES.SIMULATION);
    topologyView.fitToContainer();
    restartSimulation();
  };

  const topologyEditor = new TopologyEditor({
    topologyDocument,
    topologyView,
    elements: {
      toolContainer: document.getElementById('tool-grid'),
      toolHint: document.getElementById('tool-hint'),
      deleteButton: document.getElementById('delete-button'),
      presetSelect: document.getElementById('preset-select'),
      loadPresetButton: document.getElementById('load-preset-button'),
      importInput: document.getElementById('import-input'),
      exportButton: document.getElementById('export-button'),
      applyButton: document.getElementById('apply-button'),
      propertiesContainer: document.getElementById('properties-panel'),
      validationList: document.getElementById('validation-list')
    },
    getSimulationSettings,
    onSimulationSettingsImported: (simulation) => {
      simulationControls.setSeed(simulation.seed);
      simulationControls.setPopulationByClass(simulation.populationByClass || {});
    },
    onApply: leaveEditor
  });
  topologyEditor.initializePresets(DEFAULT_TOPOLOGY_ID);

  modeTabs.show(PAGE_MODES.SIMULATION);
  simulationClient.setSpeed(simulationControls.getSpeed());
  trafficShareChart.setUnit(simulationControls.getUnit());
  statsPanel.setUnit(simulationControls.getUnit());
  restartSimulation();
}

initializeSimulatePage();
