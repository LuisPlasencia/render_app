var DEFAULT_RADAR_BASE_URL = 'https://api.cloudflare.com/client/v4/radar';
var REQUEST_TIMEOUT_MS = 10000;
var DIMENSION_FALLBACK_STATUSES = [400, 404];

class RadarError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'RadarError';
    this.status = status;
  }
}

function getApiToken() {
  return process.env.CLOUDFLARE_API_TOKEN || '';
}

function isConfigured() {
  return getApiToken().length > 0;
}

// The base URL can be overridden to point the proxy at a local fake API during tests
function getBaseUrl() {
  return process.env.RADAR_API_BASE_URL || DEFAULT_RADAR_BASE_URL;
}

function describeRadarFailure(responseBody, status) {
  var apiErrors = responseBody && Array.isArray(responseBody.errors) ? responseBody.errors : [];
  var apiMessage = apiErrors.map(function(apiError) { return apiError.message; }).filter(Boolean).join('; ');
  return apiMessage || 'Radar respondió con HTTP ' + status;
}

async function getRadarResult(path, queryParameters) {
  var url = new URL(getBaseUrl() + '/' + path);
  Object.entries(queryParameters).forEach(function([name, value]) {
    if (value !== undefined && value !== '') {
      url.searchParams.append(name, value);
    }
  });

  var response = await fetch(url, {
    headers: { Authorization: 'Bearer ' + getApiToken() },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  var responseBody = await response.json().catch(function() { return null; });
  if (!response.ok || !responseBody || responseBody.success === false) {
    throw new RadarError(describeRadarFailure(responseBody, response.status), response.status);
  }
  return responseBody.result;
}

// Radar's v2 summary endpoints take the dimension in upper case; older ones use lower case, so both are tried
async function getSummary(endpointPath, dimension, queryParameters) {
  try {
    return await getRadarResult(endpointPath + '/' + dimension, queryParameters);
  } catch (error) {
    if (error instanceof RadarError && DIMENSION_FALLBACK_STATUSES.includes(error.status)) {
      return getRadarResult(endpointPath + '/' + dimension.toLowerCase(), queryParameters);
    }
    throw error;
  }
}

module.exports = {
  RadarError: RadarError,
  isConfigured: isConfigured,
  getSummary: getSummary
};
