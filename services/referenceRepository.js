var fs = require('fs/promises');
var path = require('path');

var REFERENCE_DIRECTORY = path.join(__dirname, '..', 'data', 'reference');

async function loadReference(referenceName) {
  var fileContent = await fs.readFile(path.join(REFERENCE_DIRECTORY, referenceName + '.json'), 'utf8');
  return JSON.parse(fileContent);
}

module.exports = { loadReference: loadReference };
