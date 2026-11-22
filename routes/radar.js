var express = require('express');
var radarClient = require('../services/radarClient');
var radarOverview = require('../services/radarOverview');
var router = express.Router();

var LOCATION_PATTERN = /^[A-Z]{2}$/;
var ALLOWED_DATE_RANGES = ['1d', '7d', '28d'];
var AUTHENTICATION_FAILURE_STATUSES = [401, 403];

/* GET aggregated Radar indicators for a location (empty for worldwide) and a date range. */
router.get('/overview', async function(req, res) {
  if (!radarClient.isConfigured()) {
    return res.status(503).json({
      error: 'missing-token',
      message: 'El servidor no tiene configurada la variable CLOUDFLARE_API_TOKEN.'
    });
  }

  var location = String(req.query.location || '').toUpperCase();
  var dateRange = String(req.query.dateRange || '7d');
  if ((location && !LOCATION_PATTERN.test(location)) || !ALLOWED_DATE_RANGES.includes(dateRange)) {
    return res.status(400).json({ error: 'invalid-parameters', message: 'País o periodo no válidos.' });
  }

  try {
    res.json(await radarOverview.getOverview(location, dateRange));
  } catch (error) {
    var isAuthenticationFailure = error instanceof radarClient.RadarError && AUTHENTICATION_FAILURE_STATUSES.includes(error.status);
    res.status(502).json({
      error: isAuthenticationFailure ? 'invalid-token' : 'radar-unavailable',
      message: isAuthenticationFailure
        ? 'Cloudflare ha rechazado el token: revisa que sea correcto y tenga permiso de lectura de Radar.'
        : 'No se ha podido consultar Cloudflare Radar: ' + error.message
    });
  }
});

module.exports = router;
