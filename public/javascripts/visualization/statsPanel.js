import { TRAFFIC_CLASSES } from '../shared/trafficClasses.js';
import { computeShares, computeWindowShares } from './trafficShareChart.js';

const STAT_DEFINITIONS = [
  { id: 'simulated-time', label: 'Tiempo simulado' },
  { id: 'non-human-traffic', label: 'Tráfico no humano' },
  { id: 'video-traffic', label: 'Tráfico de vídeo' },
  { id: 'synthetic-content', label: 'Publicaciones sintéticas' },
  { id: 'bot-to-bot-replies', label: 'Respuestas bot → bot' },
  { id: 'longest-automated-chain', label: 'Cadena más larga sin humanos' },
  { id: 'dropped-messages', label: 'Mensajes perdidos' }
];
const UNIT_DESCRIPTIONS = { bytes: 'en bytes', messages: 'en mensajes' };
const EMPTY_VALUE = '—';
const RECENT_WINDOW_COUNT = 10;
const RECENT_PERIOD_DESCRIPTION = `últimos ${RECENT_WINDOW_COUNT} s`;

// Adds up the counters of several metric windows, including nested maps such as bytesByCategoryAndClass
function mergeCounters(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'number') {
      target[key] = (target[key] || 0) + value;
    } else if (value && typeof value === 'object') {
      target[key] = mergeCounters(target[key] || {}, value);
    }
  }
  return target;
}

function formatPercentage(part, total) {
  return total > 0 ? `${((100 * part) / total).toFixed(1)} %` : EMPTY_VALUE;
}

export class StatsPanel {
  constructor(containerElement) {
    this.unit = 'bytes';
    this.recentWindows = [];
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
    this.recentWindows = [];
    for (const statDefinition of STAT_DEFINITIONS) {
      this.setStat(statDefinition.id, EMPTY_VALUE, '');
    }
    this.setStat('simulated-time', '0 s', '');
  }

  setUnit(unit) {
    this.unit = unit;
    this.renderWindowStats();
  }

  update({ currentTime, latestWindow, contentStatistics, totalDroppedMessages, totalMessages }) {
    this.setStat('simulated-time', `${currentTime.toFixed(0)} s`, '');
    if (latestWindow) {
      this.recentWindows = [...this.recentWindows, latestWindow].slice(-RECENT_WINDOW_COUNT);
      this.renderWindowStats();
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

  renderWindowStats() {
    if (this.recentWindows.length === 0) {
      return;
    }
    const recentTotals = this.recentWindows.reduce((totals, window) => mergeCounters(totals, window), {});
    this.renderNonHumanTraffic(recentTotals);
    this.renderVideoTraffic(recentTotals);
  }

  renderNonHumanTraffic(recentTotals) {
    const sharesByClass = computeWindowShares(recentTotals, 'class', this.unit);
    const nonHumanShare = TRAFFIC_CLASSES
      .filter((trafficClass) => !trafficClass.isHuman)
      .reduce((sum, trafficClass) => sum + sharesByClass[trafficClass.id], 0);
    this.setStat('non-human-traffic', `${nonHumanShare.toFixed(1)} %`, `${RECENT_PERIOD_DESCRIPTION}, ${UNIT_DESCRIPTIONS[this.unit]}`);
  }

  renderVideoTraffic(recentTotals) {
    const videoShare = computeWindowShares(recentTotals, 'category', this.unit).video;
    const videoSharesByClass = computeShares(recentTotals.bytesByCategoryAndClass.video);
    const botVideoShare = TRAFFIC_CLASSES
      .filter((trafficClass) => !trafficClass.isHuman)
      .reduce((sum, trafficClass) => sum + videoSharesByClass[trafficClass.id], 0);
    this.setStat(
      'video-traffic',
      `${videoShare.toFixed(1)} %`,
      `${RECENT_PERIOD_DESCRIPTION}, ${UNIT_DESCRIPTIONS[this.unit]}; ${botVideoShare.toFixed(0)} % de sus bytes los piden bots`
    );
  }

  setStat(statId, value, detail) {
    this.valueElements[statId].textContent = value;
    this.detailElements[statId].textContent = detail;
  }
}
