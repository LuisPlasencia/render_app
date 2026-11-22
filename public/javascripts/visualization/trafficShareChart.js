import { TRAFFIC_CLASSES } from '../shared/trafficClasses.js';
import { CONTENT_CATEGORIES } from '../shared/contentCategories.js';

const VISIBLE_WINDOW_COUNT = 60;
const AREA_FILL_OPACITY_HEX = 'B3';
const ChartLibrary = globalThis.Chart;

export const CHART_GROUPINGS = {
  class: {
    title: 'Reparto del tráfico por tipo de emisor',
    series: TRAFFIC_CLASSES,
    countKeyByUnit: { bytes: 'bytesByClass', messages: 'messagesByClass' }
  },
  category: {
    title: 'Reparto del tráfico por tipo de contenido',
    series: CONTENT_CATEGORIES,
    countKeyByUnit: { bytes: 'bytesByCategory', messages: 'messagesByCategory' }
  }
};

export function computeShares(countById) {
  const total = Object.values(countById).reduce((sum, count) => sum + count, 0);
  return Object.fromEntries(
    Object.entries(countById).map(([seriesId, count]) => [seriesId, total > 0 ? (100 * count) / total : 0])
  );
}

export function computeWindowShares(window, grouping, unit) {
  return computeShares(window[CHART_GROUPINGS[grouping].countKeyByUnit[unit]]);
}

function createDatasets(series) {
  return series.map((seriesEntry, seriesIndex) => ({
    label: seriesEntry.label,
    data: [],
    borderColor: seriesEntry.color,
    backgroundColor: seriesEntry.color + AREA_FILL_OPACITY_HEX,
    fill: seriesIndex === 0 ? 'origin' : '-1',
    pointRadius: 0,
    borderWidth: 1,
    tension: 0.2
  }));
}

// Stacked area chart: each band is the share of one series (emitter class or content category) in a one-second window
export class TrafficShareChart {
  constructor(canvasElement, titleElement) {
    this.titleElement = titleElement;
    this.windows = [];
    this.unit = 'bytes';
    this.grouping = 'class';
    ChartLibrary.defaults.font.family = 'Barlow, Helvetica Neue, Arial, sans-serif';
    ChartLibrary.defaults.color = '#4E6073';
    this.chart = new ChartLibrary(canvasElement, {
      type: 'line',
      data: { labels: [], datasets: createDatasets(CHART_GROUPINGS[this.grouping].series) },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { title: { display: true, text: 'Tiempo simulado (s)' }, ticks: { maxTicksLimit: 12 } },
          y: { stacked: true, min: 0, max: 100, ticks: { callback: (value) => `${value} %` } }
        },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12 } },
          tooltip: {
            callbacks: { label: (item) => `${item.dataset.label}: ${item.parsed.y.toFixed(1)} %` }
          }
        }
      }
    });
  }

  addWindows(windows) {
    this.windows.push(...windows);
    this.windows = this.windows.slice(-VISIBLE_WINDOW_COUNT);
    this.render();
  }

  setUnit(unit) {
    this.unit = unit;
    this.render();
  }

  setGrouping(grouping) {
    this.grouping = grouping;
    this.chart.data.datasets = createDatasets(CHART_GROUPINGS[grouping].series);
    this.titleElement.textContent = CHART_GROUPINGS[grouping].title;
    this.render();
  }

  clear() {
    this.windows = [];
    this.render();
  }

  render() {
    const { series } = CHART_GROUPINGS[this.grouping];
    const sharesPerWindow = this.windows.map((window) => computeWindowShares(window, this.grouping, this.unit));
    this.chart.data.labels = this.windows.map((window) => window.endTime.toFixed(0));
    this.chart.data.datasets.forEach((dataset, seriesIndex) => {
      const seriesId = series[seriesIndex].id;
      dataset.data = sharesPerWindow.map((shares) => shares[seriesId]);
    });
    this.chart.update('none');
  }
}
