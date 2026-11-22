import { AGENT_TYPE_BY_TRAFFIC_CLASS } from '../agents/agentFactory.js';
import { POST_PROBABILITY } from '../agents/humanAgent.js';
import { TRAFFIC_CLASS_BY_ID } from '../shared/trafficClasses.js';
import { DEFAULT_TRAFFIC_PROFILE } from '../shared/trafficProfile.js';
import { MAXIMUM_AGENTS_PER_CLASS } from '../shared/simulationLimits.js';
import { MESSAGE_KINDS, REQUEST_SIZES_BYTES, RESPONSE_SIZES_BYTES_BY_SERVICE } from '../simulation/messageCatalog.js';

export const VIDEO_CALIBRATION_TARGETS = {
  RADAR_REQUESTS: 'radar-requests',
  MOBILE_BYTES: 'mobile-bytes'
};

const HUMAN_CLASS_IDS = ['human-mobile', 'human-desktop'];
const AUTOMATED_CLASS_IDS = ['bot', 'genai'];
const DEFAULT_HUMAN_MOBILE_SHARE = 0.6;
// Larger than the default human population so that small automated shares still round to several agents
const CALIBRATION_HUMAN_POPULATION = 50;

function getDefaultPopulation(trafficClassId) {
  return TRAFFIC_CLASS_BY_ID[trafficClassId].defaultPopulation;
}

function sumDefaultPopulation(trafficClassIds) {
  return trafficClassIds.reduce((total, trafficClassId) => total + getDefaultPopulation(trafficClassId), 0);
}

function getRequestRate(trafficClassId) {
  return AGENT_TYPE_BY_TRAFFIC_CLASS[trafficClassId].getExpectedRequestsPerSecond();
}

// Average request rate of the automated agents, weighted by the default bot/GenAI mix
function getAutomatedRequestRate() {
  const totalWeight = sumDefaultPopulation(AUTOMATED_CLASS_IDS);
  return AUTOMATED_CLASS_IDS.reduce(
    (rate, trafficClassId) => rate + (getDefaultPopulation(trafficClassId) / totalWeight) * getRequestRate(trafficClassId),
    0
  );
}

// Chooses agent counts so that the expected share of automated requests matches the measured one
export function computeCalibratedPopulation(automatedRequestShare, humanMobileShare) {
  const humanTotal = CALIBRATION_HUMAN_POPULATION;
  const boundedShare = Math.min(0.95, Math.max(0, automatedRequestShare));
  const humanRequestRate = getRequestRate('human-mobile');
  const automatedTotal = (boundedShare * humanTotal * humanRequestRate) / ((1 - boundedShare) * getAutomatedRequestRate());
  const automatedWeight = sumDefaultPopulation(AUTOMATED_CLASS_IDS);

  const rawPopulation = {
    'human-mobile': humanTotal * humanMobileShare,
    'human-desktop': humanTotal * (1 - humanMobileShare),
    bot: (automatedTotal * getDefaultPopulation('bot')) / automatedWeight,
    genai: (automatedTotal * getDefaultPopulation('genai')) / automatedWeight
  };
  const scale = Math.min(1, MAXIMUM_AGENTS_PER_CLASS / Math.max(...Object.values(rawPopulation)));

  const populationByClass = { sensor: getDefaultPopulation('sensor') };
  for (const [trafficClassId, rawCount] of Object.entries(rawPopulation)) {
    const scaledCount = rawCount * scale;
    populationByClass[trafficClassId] = scaledCount > 0 && scaledCount < 1 ? 1 : Math.round(scaledCount);
  }
  return populationByClass;
}

// Fraction of human content requests that must be video so that video carries the given share of human bytes
export function computeVideoRequestShareForByteShare(videoByteShare) {
  const contentRequestFraction = 1 - POST_PROBABILITY;
  const requestBytes = REQUEST_SIZES_BYTES[MESSAGE_KINDS.CONTENT_REQUEST];
  const videoBytes = requestBytes + RESPONSE_SIZES_BYTES_BY_SERVICE.video;
  const otherContentBytes = requestBytes + (RESPONSE_SIZES_BYTES_BY_SERVICE.web + RESPONSE_SIZES_BYTES_BY_SERVICE.social) / 2;
  const postBytesPerAction = POST_PROBABILITY * REQUEST_SIZES_BYTES[MESSAGE_KINDS.POST];
  return (
    (videoByteShare * (contentRequestFraction * otherContentBytes + postBytesPerAction)) /
    (contentRequestFraction * (videoBytes * (1 - videoByteShare) + videoByteShare * otherContentBytes))
  );
}

function getHumanMobileShare(overview) {
  const devicesSection = overview.sections.devicesByClass;
  if (devicesSection.status !== 'ok') {
    return DEFAULT_HUMAN_MOBILE_SHARE;
  }
  const { mobile = 0, desktop = 0 } = devicesSection.shares.human;
  return mobile + desktop > 0 ? mobile / (mobile + desktop) : DEFAULT_HUMAN_MOBILE_SHARE;
}

function getRadarVideoShares(overview) {
  const contentSection = overview.sections.contentTypes;
  if (contentSection.status !== 'ok') {
    return { ...DEFAULT_TRAFFIC_PROFILE.videoRequestShareByGroup };
  }
  const { human, bot } = contentSection.shares;
  return { human: (human.video || 0) / 100, bot: (bot.video || 0) / 100 };
}

// Returns null when Radar did not provide the human/bot split, which is the minimum needed to calibrate
export function buildCalibrationProfile({ overview, videoTarget, mobileVideoByteShare, sourceDescription }) {
  const humanVsBotSection = overview.sections.humanVsBot;
  if (humanVsBotSection.status !== 'ok') {
    return null;
  }
  const { human, bot } = humanVsBotSection.shares;
  const automatedRequestShare = bot / (human + bot);
  const humanMobileShare = getHumanMobileShare(overview);
  const radarVideoShares = getRadarVideoShares(overview);
  const humanVideoShare =
    videoTarget === VIDEO_CALIBRATION_TARGETS.MOBILE_BYTES
      ? computeVideoRequestShareForByteShare(mobileVideoByteShare)
      : radarVideoShares.human;

  return {
    createdAt: new Date().toISOString(),
    sourceDescription,
    inputs: { automatedRequestShare, humanMobileShare, radarVideoShares, videoTarget },
    simulation: {
      populationByClass: computeCalibratedPopulation(automatedRequestShare, humanMobileShare),
      trafficProfile: { videoRequestShareByGroup: { human: humanVideoShare, bot: radarVideoShares.bot } }
    }
  };
}
