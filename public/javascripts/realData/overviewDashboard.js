import { ShareBarChart } from './shareBarChart.js';
import {
  DEVICE_LABELS,
  CONTENT_TYPE_LABELS,
  MULTIMEDIA_LABELS,
  CRAWL_PURPOSE_LABELS,
  labelFor
} from './radarLabels.js';

const HUMAN_COLOR = '#2F5BEA';
const BOT_COLOR = '#5F6B78';
const ALL_TRAFFIC_COLOR = '#9AA9BA';
const AI_COLOR = '#E4572E';
const DEVICE_COLORS = { mobile: '#2F5BEA', desktop: '#7FA0F5', other: '#C5D0DC' };
const DEVICE_ORDER = ['mobile', 'desktop', 'other'];
const MAXIMUM_CONTENT_TYPES_SHOWN = 8;

function formatPercent(value) {
  return `${value.toFixed(1)} %`;
}

function sortedKeysByShare(shares) {
  return Object.keys(shares).sort((first, second) => shares[second] - shares[first]);
}

// Renders each Radar section in its own card; a failed section shows its error without hiding the others
export class OverviewDashboard {
  constructor(sectionElementsByName) {
    this.sectionElementsByName = sectionElementsByName;
    this.charts = {
      humanVsBot: new ShareBarChart(sectionElementsByName.humanVsBot.querySelector('canvas'), { isStacked: true }),
      devicesByClass: new ShareBarChart(sectionElementsByName.devicesByClass.querySelector('canvas'), { isStacked: true }),
      contentTypes: new ShareBarChart(sectionElementsByName.contentTypes.querySelector('canvas')),
      multimediaHumanVsBot: new ShareBarChart(sectionElementsByName.multimediaHumanVsBot.querySelector('canvas'), { isStacked: true }),
      aiCrawlPurpose: new ShareBarChart(sectionElementsByName.aiCrawlPurpose.querySelector('canvas'))
    };
  }

  render(overview) {
    for (const [sectionName, section] of Object.entries(overview.sections)) {
      const sectionElement = this.sectionElementsByName[sectionName];
      if (!sectionElement) {
        continue;
      }
      const errorElement = sectionElement.querySelector('.section-error');
      errorElement.hidden = section.status === 'ok';
      errorElement.textContent = section.status === 'ok' ? '' : `Sin datos: ${section.message}`;
      sectionElement.querySelector('.chart-canvas-wrapper').hidden = section.status !== 'ok';
      if (section.status === 'ok') {
        this.charts[sectionName].update(this.buildChartData(sectionName, section.shares));
        this.renderHeadline(sectionName, section.shares);
      }
    }
  }

  renderHeadline(sectionName, shares) {
    const headlineElement = this.sectionElementsByName[sectionName].querySelector('.section-headline');
    if (!headlineElement) {
      return;
    }
    if (sectionName === 'humanVsBot') {
      headlineElement.textContent = `${formatPercent(shares.bot)} de las peticiones HTTP son automatizadas`;
    } else if (sectionName === 'devicesByClass') {
      headlineElement.textContent = `${formatPercent(shares.human.mobile || 0)} del tráfico humano llega desde móviles`;
    } else if (sectionName === 'multimediaHumanVsBot') {
      headlineElement.textContent = `${formatPercent(shares.video.bot)} de las peticiones de vídeo las hacen bots`;
    }
  }

  buildChartData(sectionName, shares) {
    switch (sectionName) {
      case 'humanVsBot':
        return {
          labels: ['Peticiones HTTP'],
          datasets: [
            { label: 'Humanos', data: [shares.human], backgroundColor: HUMAN_COLOR },
            { label: 'Bots', data: [shares.bot], backgroundColor: BOT_COLOR }
          ]
        };
      case 'devicesByClass':
        return {
          labels: ['Humanos', 'Bots'],
          datasets: DEVICE_ORDER.map((deviceKey) => ({
            label: DEVICE_LABELS[deviceKey],
            data: [shares.human[deviceKey] || 0, shares.bot[deviceKey] || 0],
            backgroundColor: DEVICE_COLORS[deviceKey]
          }))
        };
      case 'contentTypes': {
        const contentKeys = sortedKeysByShare(shares.all).slice(0, MAXIMUM_CONTENT_TYPES_SHOWN);
        return {
          labels: contentKeys.map((key) => labelFor(CONTENT_TYPE_LABELS, key)),
          datasets: [
            { label: 'Todo el tráfico', data: contentKeys.map((key) => shares.all[key] || 0), backgroundColor: ALL_TRAFFIC_COLOR },
            { label: 'Humanos', data: contentKeys.map((key) => shares.human[key] || 0), backgroundColor: HUMAN_COLOR },
            { label: 'Bots', data: contentKeys.map((key) => shares.bot[key] || 0), backgroundColor: BOT_COLOR }
          ]
        };
      }
      case 'multimediaHumanVsBot': {
        const mediaKeys = Object.keys(MULTIMEDIA_LABELS);
        return {
          labels: mediaKeys.map((key) => MULTIMEDIA_LABELS[key]),
          datasets: [
            { label: 'Humanos', data: mediaKeys.map((key) => shares[key].human), backgroundColor: HUMAN_COLOR },
            { label: 'Bots', data: mediaKeys.map((key) => shares[key].bot), backgroundColor: BOT_COLOR }
          ]
        };
      }
      case 'aiCrawlPurpose': {
        const purposeKeys = sortedKeysByShare(shares);
        return {
          labels: purposeKeys.map((key) => labelFor(CRAWL_PURPOSE_LABELS, key)),
          datasets: [{ label: 'Peticiones de rastreadores de IA', data: purposeKeys.map((key) => shares[key]), backgroundColor: AI_COLOR }]
        };
      }
      default:
        return { labels: [], datasets: [] };
    }
  }
}
