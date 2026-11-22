var fs = require('fs');

var LINE_PATTERN = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/;

function stripQuotes(value) {
  var isQuoted = value.length >= 2 && (value[0] === '"' || value[0] === "'") && value[value.length - 1] === value[0];
  return isQuoted ? value.slice(1, -1) : value;
}

// Loads KEY=VALUE pairs from a local .env file; variables already defined (for example on Render) take precedence
function loadEnvironmentFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  var fileContent = fs.readFileSync(filePath, 'utf8');
  fileContent.split(/\r?\n/).forEach(function(line) {
    var match = line.match(LINE_PATTERN);
    if (!match || line.trim().startsWith('#')) {
      return;
    }
    if (process.env[match[1]] === undefined) {
      process.env[match[1]] = stripQuotes(match[2]);
    }
  });
}

module.exports = { loadEnvironmentFile: loadEnvironmentFile };
