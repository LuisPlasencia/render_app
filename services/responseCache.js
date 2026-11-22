// In-memory cache with expiry; pending promises are shared so simultaneous requests trigger a single upstream call
function createResponseCache(timeToLiveMs) {
  var entriesByKey = new Map();

  async function getOrLoad(key, loadValue) {
    var entry = entriesByKey.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      return entry.valuePromise;
    }
    var valuePromise = loadValue();
    entriesByKey.set(key, { valuePromise: valuePromise, expiresAt: Date.now() + timeToLiveMs });
    try {
      return await valuePromise;
    } catch (error) {
      entriesByKey.delete(key);
      throw error;
    }
  }

  return { getOrLoad: getOrLoad };
}

module.exports = { createResponseCache: createResponseCache };
