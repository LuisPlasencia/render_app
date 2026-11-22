const ChartLibrary = globalThis.Chart;

// Horizontal bar chart of percentages; stacked mode shows how each row splits between series
export class ShareBarChart {
  constructor(canvasElement, { isStacked = false } = {}) {
    ChartLibrary.defaults.font.family = 'Barlow, Helvetica Neue, Arial, sans-serif';
    ChartLibrary.defaults.color = '#4E6073';
    this.chart = new ChartLibrary(canvasElement, {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: {
        indexAxis: 'y',
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: isStacked, min: 0, max: isStacked ? 100 : undefined, ticks: { callback: (value) => `${value} %` } },
          y: { stacked: isStacked }
        },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12 } },
          tooltip: { callbacks: { label: (item) => `${item.dataset.label}: ${item.parsed.x.toFixed(1)} %` } }
        }
      }
    });
  }

  update({ labels, datasets }) {
    this.chart.data.labels = labels;
    this.chart.data.datasets = datasets.map((dataset) => ({ borderWidth: 0, ...dataset }));
    this.chart.update('none');
  }
}
