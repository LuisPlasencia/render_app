export class RealDataError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

async function fetchJson(url) {
  const response = await fetch(url);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new RealDataError(body && body.error ? body.error : 'http-error', body && body.message ? body.message : `HTTP ${response.status}`);
  }
  return body;
}

export function fetchRadarOverview({ location, dateRange }) {
  const query = new URLSearchParams({ location, dateRange });
  return fetchJson(`/api/radar/overview?${query}`);
}

export function fetchMobileTrafficReference() {
  return fetchJson('/api/reference/mobile-traffic');
}
