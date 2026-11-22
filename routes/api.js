var express = require('express');
var createError = require('http-errors');
var topologyRepository = require('../services/topologyRepository');
var router = express.Router();

/* GET available topologies (id and display name). */
router.get('/topologies', async function(req, res, next) {
  try {
    res.json(await topologyRepository.listTopologySummaries());
  } catch (error) {
    next(error);
  }
});

/* GET one topology by name. */
router.get('/topologies/:topologyName', async function(req, res, next) {
  try {
    var topology = await topologyRepository.loadTopology(req.params.topologyName);
    if (!topology) {
      return next(createError(404, 'Topology not found'));
    }
    res.json(topology);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
