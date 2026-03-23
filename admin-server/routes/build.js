'use strict';
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { readJSON } = require('../lib/content-store');
const { inject, checkMarkers } = require('../lib/injector');
const { buildDiscoverGrid } = require('../lib/builders/discover-builder');
const { buildStoriesGrid } = require('../lib/builders/stories-builder');
const { buildEventsBody } = require('../lib/builders/events-builder');
const { buildStaysGrid } = require('../lib/builders/stays-builder');

const SITE_ROOT = path.join(__dirname, '..', '..');
const BUILD_STATE_FILE = path.join(__dirname, '..', '.build-state.json');

function updateBuildState(section, info) {
  let state = {};
  try { state = JSON.parse(fs.readFileSync(BUILD_STATE_FILE, 'utf8')); } catch {}
  state[section] = info;
  fs.writeFileSync(BUILD_STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function getBuildState() {
  try { return JSON.parse(fs.readFileSync(BUILD_STATE_FILE, 'utf8')); } catch { return {}; }
}

// Check all markers are present
router.get('/check-markers', (req, res) => {
  const checks = [
    { file: 'discover/index.html', markers: ['<!-- CMS:CARDS:START -->', '<!-- CMS:CARDS:END -->', '<!-- CMS:DISCOVER:COUNT:START -->', '<!-- CMS:DISCOVER:COUNT:END -->'] },
    { file: 'stories/index.html', markers: ['<!-- CMS:CARDS:START -->', '<!-- CMS:CARDS:END -->'] },
    { file: 'events/index.html', markers: ['<!-- CMS:EVENTS:START -->', '<!-- CMS:EVENTS:END -->'] },
    { file: 'plan/index.html', markers: ['<!-- CMS:CARDS:START -->', '<!-- CMS:CARDS:END -->'] },
  ];
  const results = checks.map(c => {
    const filePath = path.join(SITE_ROOT, c.file);
    const { ok, missing } = checkMarkers(filePath, c.markers);
    return { file: c.file, ok, missing };
  });
  const allOk = results.every(r => r.ok);
  res.json({ allOk, results });
});

// Build discover
router.post('/discover', (req, res) => {
  const t0 = Date.now();
  try {
    const items = readJSON('discover.json');
    const cardsHTML = buildDiscoverGrid(items);
    const countHTML = `    <p class="results-count" aria-live="polite" aria-atomic="true">Showing all ${items.length} places</p>`;
    const htmlPath = path.join(SITE_ROOT, 'discover', 'index.html');
    inject(htmlPath, '<!-- CMS:CARDS:START -->', '<!-- CMS:CARDS:END -->', cardsHTML);
    inject(htmlPath, '<!-- CMS:DISCOVER:COUNT:START -->', '<!-- CMS:DISCOVER:COUNT:END -->', countHTML);
    updateBuildState('discover', { count: items.length, builtAt: new Date().toISOString() });
    res.json({ ok: true, injected: items.length, duration: Date.now() - t0 });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Build stories
router.post('/stories', (req, res) => {
  const t0 = Date.now();
  try {
    const items = readJSON('stories.json');
    const cardsHTML = buildStoriesGrid(items);
    const htmlPath = path.join(SITE_ROOT, 'stories', 'index.html');
    inject(htmlPath, '<!-- CMS:CARDS:START -->', '<!-- CMS:CARDS:END -->', cardsHTML);
    updateBuildState('stories', { count: items.length, builtAt: new Date().toISOString() });
    res.json({ ok: true, injected: items.length, duration: Date.now() - t0 });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Build events
router.post('/events', (req, res) => {
  const t0 = Date.now();
  try {
    const items = readJSON('events.json');
    const bodyHTML = buildEventsBody(items);
    const htmlPath = path.join(SITE_ROOT, 'events', 'index.html');
    inject(htmlPath, '<!-- CMS:EVENTS:START -->', '<!-- CMS:EVENTS:END -->', bodyHTML);
    updateBuildState('events', { count: items.length, builtAt: new Date().toISOString() });
    res.json({ ok: true, injected: items.length, duration: Date.now() - t0 });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Build stays
router.post('/stays', (req, res) => {
  const t0 = Date.now();
  try {
    const items = readJSON('stays.json');
    const cardsHTML = buildStaysGrid(items);
    const htmlPath = path.join(SITE_ROOT, 'plan', 'index.html');
    inject(htmlPath, '<!-- CMS:CARDS:START -->', '<!-- CMS:CARDS:END -->', cardsHTML);
    updateBuildState('stays', { count: items.length, builtAt: new Date().toISOString() });
    res.json({ ok: true, injected: items.length, duration: Date.now() - t0 });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Build all
router.post('/all', async (req, res) => {
  const t0 = Date.now();
  const results = {};
  const sections = ['discover', 'stories', 'events', 'stays'];
  for (const section of sections) {
    try {
      const r = await fetch(`http://localhost:3002/api/build/${section}`, { method: 'POST' });
      results[section] = await r.json();
    } catch (e) {
      results[section] = { ok: false, error: e.message };
    }
  }
  res.json({ results, duration: Date.now() - t0 });
});

// Status
router.get('/status', (req, res) => {
  const state = getBuildState();
  const counts = {};
  try { counts.discover = readJSON('discover.json').length; } catch { counts.discover = 0; }
  try { counts.stories = readJSON('stories.json').length; } catch { counts.stories = 0; }
  try { counts.events = readJSON('events.json').length; } catch { counts.events = 0; }
  try { counts.stays = readJSON('stays.json').length; } catch { counts.stays = 0; }
  res.json({ counts, lastBuilt: state });
});

module.exports = router;
