export const PAGE_MODES = { SIMULATION: 'simulation', EDITOR: 'editor' };

export class ModeTabs {
  constructor({ tabButtonsByMode, panelsByMode, onModeRequested }) {
    this.tabButtonsByMode = tabButtonsByMode;
    this.panelsByMode = panelsByMode;
    for (const [mode, tabButton] of Object.entries(tabButtonsByMode)) {
      tabButton.addEventListener('click', () => onModeRequested(mode));
    }
  }

  show(mode) {
    for (const [tabMode, tabButton] of Object.entries(this.tabButtonsByMode)) {
      const isActive = tabMode === mode;
      tabButton.setAttribute('aria-selected', String(isActive));
      this.panelsByMode[tabMode].hidden = !isActive;
    }
  }
}
