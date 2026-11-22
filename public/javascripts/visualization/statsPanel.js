import { TRAFFIC_CLASSES } from '../shared/trafficClasses.js';
import { computeSharesByClass } from './trafficShareChart.js';

const STAT_DEFINITIONS = [
  { id: 'simulated-time', label: 'Tiempo simulado' },
  { id: 'non-human-traffic', label: 'Tráfico no humano' },
  { id: 'synthetic-content', label: 'Publicaciones sintéticas' },
  { id: 'bot-to-bot-replies', label: 'Respuestas bot → bot' },
  { id: 'longest-automated-chain', label: 'Cadena más larga sin humanos' },
  { id: 'dropped-messages', label: 'Mensajes perdidos' }
];
const UNIT_DESCRIPTIONS = { bytes: 'en bytes', messages: 'en mensajes' };
const EMPTY_VALUE = '—';

function formatPercentage(part, total) {
  return total > 0 ? `${((100 * part) / total).toFixed(1)} %` : EMPTY_VALUE;
}

export class StatsPanel {
  constructor(containerElement) {
    this.unit = 'bytes';
    this.latestWindow = null;
    this.valueElements = {};
    this.detailElements = {};
    for (const statDefinition of STAT_DEFINITIONS) {
      const tile = document.createElement('div');
      tile.className = 'stat-tile';
      tile.innerHTML = '<span class="stat-value"></span><span class="stat-label"></span><span class="stat-detail"></span>';
      tile.querySelector('.stat-label').textContent = statDefinition.label;
      this.valueElements[statDefinition.id] = tile.querySelector('.stat-value');
      this.detailElements[statDefinition.id] = tile.querySelector('.stat-detail');
      containerElement.appendChild(tile);
    }
    this.reset();
  }

  reset() {
    this.latestWindow = null;
    for (const statDefinition of STAT_DEFINITIONS) {
      this.setStat(statDefinition.id, EMPTY_VALUE, '');
    }
    this.setStat('simulated-time', '0 s', '');
  }

  setUnit(unit) {
    this.unit = unit;
    this.renderNonHumanTraffic();
  }

  update({ currentTime, latestWindow, contentStatistics, totalDroppedMessages, totalMessages }) {
    this.setStat('simulated-time', `${currentTime.toFixed(0)} s`, '');
    if (latestWindow) {
      this.latestWindow = latestWindow;
      this.renderNonHumanTraffic();
    }

    const statistics = contentStatistics;
    this.setStat(
      'synthetic-content',
      formatPercentage(statistics.syntheticPosts, statistics.totalPosts),
      `${statistics.syntheticPosts} de ${statistics.totalPosts} publicaciones`
    );
    const totalReplies =
      statistics.humanRepliesToHuman +
      statistics.humanRepliesToSynthetic +
      statistics.syntheticRepliesToHuman +
      statistics.syntheticRepliesToSynthetic;
    this.setStat(
      'bot-to-bot-replies',
      formatPercentage(statistics.syntheticRepliesToSynthetic, totalReplies),
      `${statistics.syntheticRepliesToSynthetic} de ${totalReplies} respuestas`
    );
    this.setStat('longest-automated-chain', String(statistics.longestAutomatedChain), 'mensajes seguidos sin intervención humana');
    this.setStat('dropped-messages', formatPercentage(totalDroppedMessages, totalMessages), `${totalDroppedMessages} de ${totalMessages} mensajes`);
  }

  renderNonHumanTraffic() {
    if (!this.latestWindow) {
      return;
    }
    const sharesByClass = computeSharesByClass(this.latestWindow, this.unit);
    const nonHumanShare = TRAFFIC_CLASSES
      .filter((trafficClass) => !trafficClass.isHuman)
      .reduce((sum, trafficClass) => sum + sharesByClass[trafficClass.id], 0);
    this.setStat('non-human-traffic', `${nonHumanShare.toFixed(1)} %`, `último segundo, ${UNIT_DESCRIPTIONS[this.unit]}`);
  }

  setStat(statId, value, detail) {
    this.valueElements[statId].textContent = value;
    this.detailElements[statId].textContent = detail;
  }
}
