'use strict';
const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '..', '..', 'content');

function readJSON(filename) {
  const filePath = path.join(CONTENT_DIR, filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJSON(filename, data) {
  const filePath = path.join(CONTENT_DIR, filename);
  // Safety backup before write
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, filePath + '.bak');
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = { readJSON, writeJSON };
