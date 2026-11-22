import { TRAFFIC_CLASSES } from '../shared/trafficClasses.js';

const VISIBLE_WINDOW_COUNT = 60;
const AREA_FILL_OPACITY_HEX = 'B3';
const ChartLibrary = globalThis.Chart;

export const COUNT_KEY_BY_UNIT = { bytes: 'bytesByClass', messages: 'messagesByClass' };

export function computeSharesByClass(window, unit) {
  const countByClass = window[COUNT_KEY_BY_UNIT[unit]];
  const total = Object.values(countByClass).reduce((sum, count) => sum + count, 0);
  return Object.fromEntries(
    Object.entries(countByClass).map(([trafficClassId, count]) => [trafficClassId, total > 0 ? (100 * count) / total : 0])
  );
}

// Stacked area chart: each band is the share of one traffic class in a one-second window
export class TrafficShareChart {
  constructor(canvasElement) {
    this.windows = [];
    this.unit = 'bytes';
    ChartLibrary.defaults.font.family = 'Barlow, Helvetica Neue, Arial, sans-serif';
    ChartLibrary.defaults.color = '#4E6073';
    this.chart = new ChartLibrary(canvasElement, {
      type: 'line',
      data: {
        labels: [],
        datasets: TRAFFIC_CLASSES.map((trafficClass, classIndex) => ({
          label: trafficClass.label,
          data: [],
          borderColor: trafficClass.color,
          backgroundColor: trafficClass.color + AREA_FILL_OPACITY_HEX,
          fill: classIndex === 0 ? 'origin' : '-1',
          pointRadius: 0,
          borderWidth: 1,
          tension: 0.2
        }))
      },
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

  clear() {
    this.windows = [];
    this.render();
  }

  render() {
    const sharesPerWindow = this.windows.map((window) => computeSharesByClass(window, this.unit));
    this.chart.data.labels = this.windows.map((window) => window.endTime.toFixed(0));
    this.chart.data.datasets.forEach((dataset, classIndex) => {
      const trafficClassId = TRAFFIC_CLASSES[classIndex].id;
      dataset.data = sharesPerWindow.map((sharesByClass) => sharesByClass[trafficClassId]);
    });
    this.chart.update('none');
  }
}
