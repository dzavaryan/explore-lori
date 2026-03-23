'use strict';
const fs = require('fs');

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inject(filePath, startMarker, endMarker, newContent) {
  const html = fs.readFileSync(filePath, 'utf8');
  const startIdx = html.indexOf(startMarker);
  const endIdx = html.indexOf(endMarker);

  if (startIdx === -1) throw new Error(`Start marker "${startMarker}" not found in ${filePath}`);
  if (endIdx === -1) throw new Error(`End marker "${endMarker}" not found in ${filePath}`);
  if (endIdx <= startIdx) throw new Error(`End marker appears before start in ${filePath}`);

  // Backup before write
  fs.copyFileSync(filePath, filePath + '.bak');

  const result =
    html.slice(0, startIdx + startMarker.length) +
    '\n' + newContent + '\n' +
    html.slice(endIdx);

  // Safety check: result must be at least 80% of original size
  if (result.length < html.length * 0.8) {
    fs.copyFileSync(filePath + '.bak', filePath); // restore
    throw new Error(`Inject result suspiciously small (${result.length} vs ${html.length}) — restored backup`);
  }

  fs.writeFileSync(filePath, result, 'utf8');
  return { injected: true, bytesBefore: html.length, bytesAfter: result.length };
}

function checkMarkers(filePath, markers) {
  const html = fs.readFileSync(filePath, 'utf8');
  const missing = markers.filter(m => !html.includes(m));
  return { ok: missing.length === 0, missing };
}

module.exports = { esc, inject, checkMarkers };
