import { EDITOR_TOOLS } from './editorTools.js';

const TOOL_HINTS = {
  [EDITOR_TOOLS.SELECT]: 'Haz clic en un nodo o enlace para editarlo. Arrastra los nodos para moverlos.',
  [EDITOR_TOOLS.ADD_ROUTER]: 'Haz clic en un hueco de la red para colocar el router.',
  [EDITOR_TOOLS.ADD_ACCESS]: 'Haz clic en un hueco de la red para colocar la red de acceso.',
  [EDITOR_TOOLS.ADD_SERVER]: 'Haz clic en un hueco de la red para colocar el servidor.',
  [EDITOR_TOOLS.ADD_LINK]: 'Haz clic en el nodo de origen y después en el de destino.'
};

export class EditorToolbar {
  constructor({ elements, onToolSelected, onDelete, onLoadPreset, onImportFile, onExport, onApply }) {
    this.elements = elements;
    this.toolButtons = [...elements.toolContainer.querySelectorAll('[data-tool]')];

    for (const toolButton of this.toolButtons) {
      toolButton.addEventListener('click', () => onToolSelected(toolButton.dataset.tool));
    }
    elements.deleteButton.addEventListener('click', onDelete);
    elements.loadPresetButton.addEventListener('click', () => onLoadPreset(elements.presetSelect.value));
    elements.exportButton.addEventListener('click', onExport);
    elements.applyButton.addEventListener('click', onApply);
    elements.importInput.addEventListener('change', () => {
      const [file] = elements.importInput.files;
      if (file) {
        onImportFile(file);
      }
      elements.importInput.value = '';
    });
  }

  setPresets(topologySummaries, selectedPresetId) {
    this.elements.presetSelect.replaceChildren(
      ...topologySummaries.map((summary) => new Option(summary.name, summary.id, false, summary.id === selectedPresetId))
    );
  }

  showToolState({ activeTool, pendingLinkSourceLabel }) {
    for (const toolButton of this.toolButtons) {
      toolButton.setAttribute('aria-pressed', String(toolButton.dataset.tool === activeTool));
    }
    this.elements.toolHint.textContent = pendingLinkSourceLabel
      ? `Origen: ${pendingLinkSourceLabel}. Haz clic en el nodo de destino (Esc para cancelar).`
      : TOOL_HINTS[activeTool];
  }

  setDeleteEnabled(isEnabled) {
    this.elements.deleteButton.disabled = !isEnabled;
  }

  setApplyEnabled(isEnabled) {
    this.elements.applyButton.disabled = !isEnabled;
  }
}
