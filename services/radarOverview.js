var radarClient = require('./radarClient');
var createResponseCache = require('./responseCache').createResponseCache;

var CACHE_TIME_TO_LIVE_MS = 30 * 60 * 1000;
var HTTP_SUMMARY_PATH = 'http/summary';
var AI_BOTS_SUMMARY_PATH = 'ai/bots/summary';
var HUMAN_FILTER = { botClass: 'LIKELY_HUMAN' };
var BOT_FILTER = { botClass: 'LIKELY_AUTOMATED' };

var RADAR_QUERIES = {
  humanVsBot: { path: HTTP_SUMMARY_PATH, dimension: 'BOT_CLASS' },
  humanDevices: { path: HTTP_SUMMARY_PATH, dimension: 'DEVICE_TYPE', filters: HUMAN_FILTER },
  botDevices: { path: HTTP_SUMMARY_PATH, dimension: 'DEVICE_TYPE', filters: BOT_FILTER },
  allContent: { path: HTTP_SUMMARY_PATH, dimension: 'CONTENT_TYPE' },
  humanContent: { path: HTTP_SUMMARY_PATH, dimension: 'CONTENT_TYPE', filters: HUMAN_FILTER },
  botContent: { path: HTTP_SUMMARY_PATH, dimension: 'CONTENT_TYPE', filters: BOT_FILTER },
  videoHumanVsBot: { path: HTTP_SUMMARY_PATH, dimension: 'BOT_CLASS', filters: { contentType: 'VIDEO' } },
  audioHumanVsBot: { path: HTTP_SUMMARY_PATH, dimension: 'BOT_CLASS', filters: { contentType: 'AUDIO' } },
  imagesHumanVsBot: { path: HTTP_SUMMARY_PATH, dimension: 'BOT_CLASS', filters: { contentType: 'IMAGES' } },
  aiCrawlPurpose: { path: AI_BOTS_SUMMARY_PATH, dimension: 'CRAWL_PURPOSE' }
};

// Each section of the page depends on these queries; a section fails on its own if one of them fails
var SECTION_QUERIES = {
  humanVsBot: ['humanVsBot'],
  devicesByClass: ['humanDevices', 'botDevices'],
  contentTypes: ['allContent', 'humanContent', 'botContent'],
  multimediaHumanVsBot: ['videoHumanVsBot', 'audioHumanVsBot', 'imagesHumanVsBot'],
  aiCrawlPurpose: ['aiCrawlPurpose']
};

var overviewCache = createResponseCache(CACHE_TIME_TO_LIVE_MS);

function normalizeKey(rawKey) {
  return String(rawKey).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

// Radar returns shares as numeric strings keyed by category name; keys are normalised to snake_case
function toShareMap(summary) {
  var shares = {};
  Object.entries(summary || {}).forEach(function([rawKey, rawValue]) {
    var share = parseFloat(rawValue);
    if (Number.isFinite(share)) {
      shares[normalizeKey(rawKey)] = share;
    }
  });
  return shares;
}

function toHumanVsBotShares(summary) {
  var shares = { human: 0, bot: 0 };
  Object.entries(toShareMap(summary)).forEach(function([key, share]) {
    if (key.includes('human')) {
      shares.human += share;
    } else if (key.includes('bot') || key.includes('automated')) {
      shares.bot += share;
    }
  });
  return shares;
}

function buildSection(sectionName, summariesByQuery) {
  switch (sectionName) {
    case 'humanVsBot':
      return toHumanVsBotShares(summariesByQuery.humanVsBot);
    case 'devicesByClass':
      return { human: toShareMap(summariesByQuery.humanDevices), bot: toShareMap(summariesByQuery.botDevices) };
    case 'contentTypes':
      return {
        all: toShareMap(summariesByQuery.allContent),
        human: toShareMap(summariesByQuery.humanContent),
        bot: toShareMap(summariesByQuery.botContent)
      };
    case 'multimediaHumanVsBot':
      return {
        video: toHumanVsBotShares(summariesByQuery.videoHumanVsBot),
        audio: toHumanVsBotShares(summariesByQuery.audioHumanVsBot),
        images: toHumanVsBotShares(summariesByQuery.imagesHumanVsBot)
      };
    case 'aiCrawlPurpose':
      return toShareMap(summariesByQuery.aiCrawlPurpose);
    default:
      return null;
  }
}

async function loadOverview(location, dateRange) {
  var commonParameters = { dateRange: dateRange, location: location, format: 'json' };
  var queryNames = Object.keys(RADAR_QUERIES);
  var outcomes = await Promise.allSettled(queryNames.map(function(queryName) {
    var query = RADAR_QUERIES[queryName];
    return radarClient.getSummary(query.path, query.dimension, Object.assign({}, commonParameters, query.filters));
  }));

  var resultsByQuery = {};
  var errorsByQuery = {};
  queryNames.forEach(function(queryName, queryIndex) {
    var outcome = outcomes[queryIndex];
    if (outcome.status === 'fulfilled') {
      resultsByQuery[queryName] = outcome.value;
    } else {
      errorsByQuery[queryName] = outcome.reason;
    }
  });

  if (Object.keys(resultsByQuery).length === 0) {
    throw Object.values(errorsByQuery)[0];
  }

  var summariesByQuery = {};
  Object.entries(resultsByQuery).forEach(function([queryName, result]) {
    summariesByQuery[queryName] = result.summary_0;
  });

  var sections = {};
  Object.entries(SECTION_QUERIES).forEach(function([sectionName, sectionQueryNames]) {
    var failedQueryName = sectionQueryNames.find(function(queryName) { return errorsByQuery[queryName]; });
    sections[sectionName] = failedQueryName
      ? { status: 'error', message: errorsByQuery[failedQueryName].message }
      : { status: 'ok', shares: buildSection(sectionName, summariesByQuery) };
  });

  var firstMeta = Object.values(resultsByQuery)[0].meta || {};
  return {
    location: location || null,
    dateRange: dateRange,
    lastUpdated: firstMeta.lastUpdated || null,
    retrievedAt: new Date().toISOString(),
    sections: sections
  };
}

function getOverview(location, dateRange) {
  return overviewCache.getOrLoad(JSON.stringify([location, dateRange]), function() {
    return loadOverview(location, dateRange);
  });
}

module.exports = { getOverview: getOverview };
