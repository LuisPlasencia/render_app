import { TopologyEditorController } from './topologyEditorController.js';
import { PropertiesPanel } from './propertiesPanel.js';
import { ValidationPanel } from './validationPanel.js';
import { EditorToolbar } from './editorToolbar.js';
import { EDITOR_TOOLS } from './editorTools.js';
import { CHANGE_TYPES } from '../topology/topologyDocument.js';
import { validateTopology } from '../topology/topologyValidator.js';
import { fetchTopology, fetchTopologySummaries } from '../topology/topologyRepository.js';
import { downloadExperiment, parseExperiment } from '../topology/experimentFile.js';

const EDITABLE_TARGET_TAGS = new Set(['INPUT', 'SELECT', 'TEXTAREA']);

// Coordinates the editor widgets around a shared topology document
export class TopologyEditor {
  constructor({ topologyDocument, topologyView, elements, getSimulationSettings, onSimulationSettingsImported, onApply }) {
    this.topologyDocument = topologyDocument;
    this.topologyView = topologyView;
    this.getSimulationSettings = getSimulationSettings;
    this.onSimulationSettingsImported = onSimulationSettingsImported;
    this.isEnabled = false;

    this.propertiesPanel = new PropertiesPanel(elements.propertiesContainer, topologyDocument);
    this.validationPanel = new ValidationPanel(elements.validationList, {
      onIssueSelected: (elementId) => this.controller.selectElementById(elementId)
    });
    this.toolbar = new EditorToolbar({
      elements,
      onToolSelected: (tool) => this.controller.setTool(tool),
      onDelete: () => this.controller.deleteSelection(),
      onLoadPreset: (presetId) => this.loadPreset(presetId),
      onImportFile: (file) => this.importExperiment(file),
      onExport: () => this.exportExperiment(),
      onApply
    });
    this.controller = new TopologyEditorController({
      topologyDocument,
      topologyView,
      onSelectionChange: (selection) => {
        this.propertiesPanel.show(selection);
        this.toolbar.setDeleteEnabled(Boolean(selection));
      },
      onToolStateChange: ({ activeTool, pendingLinkSourceId }) => {
        const pendingNode = pendingLinkSourceId ? topologyDocument.getNode(pendingLinkSourceId) : null;
        this.toolbar.showToolState({ activeTool, pendingLinkSourceLabel: pendingNode ? pendingNode.label : null });
      }
    });

    topologyDocument.onChange((changeType) => {
      if (changeType !== CHANGE_TYPES.POSITION) {
        this.revalidate();
      }
    });
    document.addEventListener('keydown', (event) => this.handleKeyDown(event));
    this.controller.setEnabled(false);
    this.revalidate();
  }

  async initializePresets(selectedPresetId) {
    try {
      this.toolbar.setPresets(await fetchTopologySummaries(), selectedPresetId);
    } catch (error) {
      console.error(error);
    }
  }

  setEnabled(isEnabled) {
    this.isEnabled = isEnabled;
    this.controller.setEnabled(isEnabled);
    this.revalidate();
  }

  validate() {
    const { populationByClass, trafficProfile } = this.getSimulationSettings();
    return validateTopology(this.topologyDocument.definition, populationByClass, trafficProfile);
  }

  revalidate() {
    const validationReport = this.validate();
    this.validationPanel.render(validationReport);
    this.topologyView.markElementsWithErrors(
      this.isEnabled ? validationReport.errors.map((issue) => issue.elementId).filter(Boolean) : []
    );
    this.toolbar.setApplyEnabled(validationReport.isValid());
    return validationReport;
  }

  async loadPreset(presetId) {
    try {
      this.topologyDocument.load(await fetchTopology(presetId));
      this.topologyView.fitToContainer();
    } catch (error) {
      this.validationPanel.showImportError(error.message);
      this.revalidate();
    }
  }

  async importExperiment(file) {
    try {
      const { topologyDefinition, simulation } = parseExperiment(await file.text());
      if (simulation) {
        this.onSimulationSettingsImported(simulation);
      }
      this.topologyDocument.load(topologyDefinition);
      this.topologyView.fitToContainer();
    } catch (error) {
      this.validationPanel.showImportError(error.message);
      this.revalidate();
    }
  }

  exportExperiment() {
    downloadExperiment({ topologyDefinition: this.topologyDocument.toDefinition(), ...this.getSimulationSettings() });
  }

  handleKeyDown(event) {
    if (!this.isEnabled || EDITABLE_TARGET_TAGS.has(event.target.tagName)) {
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.controller.deleteSelection();
    } else if (event.key === 'Escape') {
      this.controller.setTool(EDITOR_TOOLS.SELECT);
    }
  }
}
