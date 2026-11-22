var fs = require('fs/promises');
var path = require('path');

var TOPOLOGIES_DIRECTORY = path.join(__dirname, '..', 'data', 'topologies');
var TOPOLOGY_NAME_PATTERN = /^[a-z0-9-]+$/;

function isValidTopologyName(topologyName) {
  return TOPOLOGY_NAME_PATTERN.test(topologyName);
}

async function listTopologyNames() {
  var fileNames = await fs.readdir(TOPOLOGIES_DIRECTORY);
  return fileNames
    .filter(function(fileName) { return fileName.endsWith('.json'); })
    .map(function(fileName) { return path.basename(fileName, '.json'); })
    .sort();
}

async function listTopologySummaries() {
  var topologyNames = await listTopologyNames();
  return Promise.all(topologyNames.map(async function(topologyName) {
    var topology = await loadTopology(topologyName);
    return { id: topologyName, name: topology.name || topologyName };
  }));
}

async function loadTopology(topologyName) {
  if (!isValidTopologyName(topologyName)) {
    return null;
  }
  var topologyPath = path.join(TOPOLOGIES_DIRECTORY, topologyName + '.json');
  try {
    var fileContent = await fs.readFile(topologyPath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

module.exports = {
  listTopologyNames: listTopologyNames,
  listTopologySummaries: listTopologySummaries,
  loadTopology: loadTopology
};
