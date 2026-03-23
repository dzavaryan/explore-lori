'use strict';
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3002;
const SITE_ROOT = path.join(__dirname, '..');
const IMAGES_DIR = path.join(SITE_ROOT, 'images');

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve admin static files
app.use(express.static(path.join(__dirname, 'public')));

// Image upload via Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, IMAGES_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9.\-_]/g, '');
    const ext = path.extname(safe);
    const base = path.basename(safe, ext);
    const candidate = path.join(IMAGES_DIR, safe);
    if (fs.existsSync(candidate)) {
      cb(null, `${base}-${Date.now()}${ext}`);
    } else {
      cb(null, safe);
    }
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Only JPEG, PNG, WebP allowed'), ok);
  }
});

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({
    filename: req.file.filename,
    path: `images/${req.file.filename}`
  });
});

// API routes
app.use('/api', require('./routes/content'));
app.use('/api/build', require('./routes/build'));

// /api/status — inline handler using same build-state file
app.get('/api/status', (req, res) => {
  const BUILD_STATE_FILE = path.join(__dirname, '.build-state.json');
  const { readJSON } = require('./lib/content-store');
  let state = {};
  try { state = JSON.parse(fs.readFileSync(BUILD_STATE_FILE, 'utf8')); } catch {}
  const counts = {};
  try { counts.discover = readJSON('discover.json').length; } catch { counts.discover = 0; }
  try { counts.stories = readJSON('stories.json').length; } catch { counts.stories = 0; }
  try { counts.events = readJSON('events.json').length; } catch { counts.events = 0; }
  try { counts.stays = readJSON('stays.json').length; } catch { counts.stays = 0; }
  res.json({ ok: true, counts, lastBuilt: state });
});

// SPA fallback for admin pages
app.get('*', (req, res) => {
  const file = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(file)) res.sendFile(file);
  else res.status(404).send('Admin panel not found');
});

app.listen(PORT, () => {
  console.log(`\n🗺️  Explore Lori Admin`);
  console.log(`   Admin panel: http://localhost:${PORT}`);
  console.log(`   Site root:   ${SITE_ROOT}`);
  console.log(`   Content:     ${path.join(SITE_ROOT, 'content')}\n`);
});
