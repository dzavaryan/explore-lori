'use strict';
const express = require('express');
const router = express.Router();
const { readJSON, writeJSON } = require('../lib/content-store');

const COLLECTIONS = {
  discover: 'discover.json',
  stories: 'stories.json',
  events: 'events.json',
  stays: 'stays.json'
};

// Generic CRUD factory
Object.entries(COLLECTIONS).forEach(([name, file]) => {
  // GET all
  router.get(`/${name}`, (req, res) => {
    try {
      res.json(readJSON(file));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET one
  router.get(`/${name}/:id`, (req, res) => {
    try {
      const items = readJSON(file);
      const item = items.find(i => i.id === req.params.id || i.slug === req.params.id);
      if (!item) return res.status(404).json({ error: 'Not found' });
      res.json(item);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST (create)
  router.post(`/${name}`, (req, res) => {
    try {
      const items = readJSON(file);
      const newItem = req.body;
      if (!newItem.id && newItem.slug) newItem.id = newItem.slug;
      if (!newItem.id && newItem.title) {
        const { toSlug } = require('../lib/slug');
        newItem.id = toSlug(newItem.title);
        if (!newItem.slug) newItem.slug = newItem.id;
      }
      items.push(newItem);
      writeJSON(file, items);
      res.status(201).json(newItem);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // PUT (update)
  router.put(`/${name}/:id`, (req, res) => {
    try {
      const items = readJSON(file);
      const idx = items.findIndex(i => i.id === req.params.id || i.slug === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Not found' });
      items[idx] = { ...items[idx], ...req.body };
      writeJSON(file, items);
      res.json(items[idx]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // DELETE
  router.delete(`/${name}/:id`, (req, res) => {
    try {
      const items = readJSON(file);
      const idx = items.findIndex(i => i.id === req.params.id || i.slug === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Not found' });
      const [deleted] = items.splice(idx, 1);
      writeJSON(file, items);
      res.json({ deleted: deleted.id || deleted.slug });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
});

module.exports = router;
