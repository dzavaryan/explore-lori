/* ═══════════════════════════════════════════════════════════
   EXPLORE LORI — ADMIN PANEL
   admin/admin.js
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // ── Reference data ──────────────────────────────────────────
  var CIRCUITS = [
    { id: 1, name: 'Monastery Plateau',     color: '#8B3A28' },
    { id: 2, name: "Poet's Highlands",       color: '#3A7055' },
    { id: 3, name: 'Fortress Plateau',       color: '#4A5A6A' },
    { id: 4, name: 'Deep Gorges',            color: '#B8943A' },
    { id: 5, name: 'Gugark Forest Corridor', color: '#3A4A6A' },
    { id: 6, name: 'Northern Steppe',        color: '#8A7A6A' },
    { id: 7, name: 'Resilience Valley',      color: '#5A6A5A' }
  ];

  var SEASONS       = ['spring', 'summer', 'autumn', 'winter'];
  var STORY_TYPES   = ['reportage', 'photography', 'longread', 'fieldnotes'];
  var EVENT_TYPES   = ['festival', 'market', 'literary', 'tour'];
  var LOC_TYPES     = ['monastery', 'bridge', 'cultural', 'fortress', 'nature', 'landmark', 'village', 'trail'];

  // ── State ────────────────────────────────────────────────────
  var S = {
    section:  'dashboard',
    stories:  [],
    events:   [],
    locations:[],
    pillars:  [],
    images:   [],
    rootHandle: null,     // FileSystemDirectoryHandle
    editing:  null,       // { type, item }
    deployId: null,
    deployPollTimer: null
  };

  // ── DOM helpers ──────────────────────────────────────────────
  function $id(id)       { return document.getElementById(id); }
  function esc(str)      { return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function slugify(str)  { return String(str).toLowerCase().trim().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,''); }
  function fmt(date)     { return date ? new Date(date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '—'; }

  // ── Toast ────────────────────────────────────────────────────
  function toast(msg, type) {
    var c = $id('toast-container');
    if (!c) return;
    var t = document.createElement('div');
    t.className = 'admin-toast' + (type ? ' ' + type : '');
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(function() { t.style.opacity='0'; t.style.transition='opacity 0.3s'; setTimeout(function(){t.remove();},300); }, 3000);
  }

  // ── Spinner ──────────────────────────────────────────────────
  function showSpinner(msg) {
    var el = $id('spinner-overlay');
    if (!el) return;
    el.querySelector('.admin-spinner-msg').textContent = msg || '';
    el.style.display = 'flex';
  }
  function hideSpinner() {
    var el = $id('spinner-overlay');
    if (el) el.style.display = 'none';
  }

  // ── File System Access ───────────────────────────────────────
  async function getRoot() {
    if (S.rootHandle) return S.rootHandle;
    toast('Select the "v1.01" folder inside LORI WEBSITE on your Desktop', '');
    S.rootHandle = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'desktop' });
    // Quick sanity check — the root should contain a 'data' folder
    try {
      await S.rootHandle.getDirectoryHandle('data');
    } catch(e) {
      S.rootHandle = null;
      throw new Error('Wrong folder selected — please select the "v1.01" folder that contains the data/, images/, and admin/ folders.');
    }
    return S.rootHandle;
  }

  async function writeJSON(relPath, data) {
    var root = await getRoot();
    var parts = relPath.split('/');
    var dir = root;
    for (var i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i], { create: true });
    }
    var fh = await dir.getFileHandle(parts[parts.length - 1], { create: true });
    var w  = await fh.createWritable();
    await w.write(JSON.stringify(data, null, 2));
    await w.close();
  }

  async function writeFile(relPath, blob) {
    var root = await getRoot();
    var parts = relPath.split('/');
    var dir = root;
    for (var i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i], { create: true });
    }
    var fh = await dir.getFileHandle(parts[parts.length - 1], { create: true });
    var w  = await fh.createWritable();
    await w.write(blob);
    await w.close();
  }

  // ── Data loading ─────────────────────────────────────────────
  async function loadData() {
    try {
      var results = await Promise.all([
        fetch('/data/stories.json').then(function(r){ if(!r.ok) throw new Error('stories '+r.status); return r.json(); }),
        fetch('/data/events.json').then(function(r){ if(!r.ok) throw new Error('events '+r.status); return r.json(); }),
        fetch('/data/locations.json').then(function(r){ if(!r.ok) throw new Error('locations '+r.status); return r.json(); }),
        fetch('/data/pillars.json').then(function(r){ if(!r.ok) throw new Error('pillars '+r.status); return r.json(); })
      ]);
      S.stories   = results[0];
      S.events    = results[1];
      S.locations = results[2];
      S.pillars   = results[3];
    } catch(e) {
      toast('Failed to load data: ' + e.message, 'error');
    }
    // Images endpoint only available when running start-admin.py
    try {
      S.images = await fetch('/api/images').then(r => {
        if (!r.ok) return [];
        return r.json();
      });
    } catch(e) {
      S.images = [];
    }
  }

  async function refreshImages() {
    // Try API endpoint first (start-admin.py), fall back to FSA directory listing
    try {
      var r = await fetch('/api/images');
      if (r.ok) { S.images = await r.json(); return; }
    } catch(e) {}
    // FSA fallback — only works if user already granted folder access
    if (S.rootHandle) {
      try {
        var imgDir = await S.rootHandle.getDirectoryHandle('images');
        var exts = new Set(['.jpg','.jpeg','.png','.gif','.webp','.svg']);
        var files = [];
        for await (var [name] of imgDir.entries()) {
          var ext = name.substring(name.lastIndexOf('.')).toLowerCase();
          if (exts.has(ext)) files.push(name);
        }
        S.images = files.sort();
      } catch(e) {}
    }
  }

  // ── Image resizing ───────────────────────────────────────────
  function resizeImage(file, maxW) {
    return new Promise(function(resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function() {
        URL.revokeObjectURL(url);
        var scale = Math.min(1, maxW / img.width);
        var w = Math.round(img.width * scale);
        var h = Math.round(img.height * scale);
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(function(blob) { resolve({ blob: blob, w: w, h: h }); }, 'image/jpeg', 0.88);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  async function uploadImageFile(file, customName) {
    showSpinner('Resizing image…');
    try {
      var result  = await resizeImage(file, 1400);
      var name    = customName || slugify(file.name.replace(/\.[^.]+$/,'')) + '.jpg';
      if (!name.endsWith('.jpg')) name += '.jpg';
      await writeFile('images/' + name, result.blob);
      await refreshImages();
      toast('Image uploaded: ' + name, 'success');
      return '/images/' + name;
    } catch(e) {
      toast('Upload failed: ' + e.message, 'error');
      return null;
    } finally {
      hideSpinner();
    }
  }

  // ── CRUD helpers ──────────────────────────────────────────────
  function getCollection(type) {
    if (type === 'story')    return S.stories;
    if (type === 'event')    return S.events;
    if (type === 'location') return S.locations;
    return [];
  }

  function getFilename(type) {
    if (type === 'story')    return 'data/stories.json';
    if (type === 'event')    return 'data/events.json';
    if (type === 'location') return 'data/locations.json';
  }

  async function saveCollection(type) {
    await writeJSON(getFilename(type), getCollection(type));
  }

  function upsertRecord(type, record) {
    var col = getCollection(type);
    var idx = col.findIndex(function(r){ return r.id === record.id; });
    if (idx >= 0) col[idx] = record; else col.push(record);
  }

  function deleteRecord(type, id) {
    var col = getCollection(type);
    var idx = col.findIndex(function(r){ return r.id === id; });
    if (idx >= 0) col.splice(idx, 1);
  }

  function circuitFor(id) { return CIRCUITS.find(function(c){return c.id===id;}) || CIRCUITS[0]; }
  function pillarFor(id)  { return S.pillars.find(function(p){return p.id===id;}) || {}; }

  function makeGradient(color) {
    return 'linear-gradient(135deg, ' + color + ' 0%, #2C3340 100%)';
  }

  // ── Routing ───────────────────────────────────────────────────
  function setSection(name) {
    S.section = name;
    S.editing = null;
    document.querySelectorAll('.admin-nav-link').forEach(function(a){
      a.classList.toggle('active', a.dataset.section === name);
    });
    render();
  }

  // ── Version saving ────────────────────────────────────────────
  async function saveVersion() {
    var version = prompt('Save as version (e.g. v1.02):', 'v1.02');
    if (!version) return;

    showSpinner('Picking destination folder…');
    var targetRoot;
    try {
      targetRoot = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'desktop' });
    } catch(e) { hideSpinner(); return; }

    var sourceRoot;
    try {
      sourceRoot = await getRoot();
    } catch(e) { hideSpinner(); return; }

    showSpinner('Copying files to ' + version + '…');
    try {
      var versionDir = await targetRoot.getDirectoryHandle(version, { create: true });
      await copyDir(sourceRoot, versionDir, ['admin', '.git', '.claude', '__MACOSX', 'node_modules']);
      toast('Saved as ' + version, 'success');
    } catch(e) {
      toast('Save failed: ' + e.message, 'error');
    } finally {
      hideSpinner();
    }
  }

  async function copyDir(src, dst, skipNames) {
    skipNames = skipNames || [];
    for await (var [name, handle] of src.entries()) {
      if (skipNames.indexOf(name) >= 0) continue;
      if (name === '.DS_Store') continue;
      if (handle.kind === 'directory') {
        var subDst = await dst.getDirectoryHandle(name, { create: true });
        await copyDir(handle, subDst, []);
      } else {
        var file = await handle.getFile();
        var fh   = await dst.getFileHandle(name, { create: true });
        var w    = await fh.createWritable();
        await w.write(await file.arrayBuffer());
        await w.close();
      }
    }
  }

  // ── Deploy ────────────────────────────────────────────────────
  async function deploy() {
    var btn = $id('btn-deploy-main') || $id('btn-deploy');
    if (btn) { btn.disabled = true; btn.textContent = 'Deploying…'; }
    showSpinner('Creating ZIP and uploading to Netlify…');
    try {
      var res  = await fetch('/api/deploy');
      var data = await res.json();
      if (data.ok) {
        S.deployId = data.id;
        toast('Deploy started! Checking status…', '');
        startDeployPoll();
      } else {
        toast('Deploy failed: ' + data.error, 'error');
      }
    } catch(e) {
      toast('Deploy error: ' + e.message, 'error');
    } finally {
      hideSpinner();
      if (btn) { btn.disabled = false; btn.textContent = 'Deploy to Netlify'; }
    }
  }

  function startDeployPoll() {
    if (S.deployPollTimer) clearInterval(S.deployPollTimer);
    S.deployPollTimer = setInterval(async function() {
      if (!S.deployId) { clearInterval(S.deployPollTimer); return; }
      var res  = await fetch('/api/deploy-status?id=' + S.deployId);
      var data = await res.json();
      if (data.state === 'ready') {
        clearInterval(S.deployPollTimer);
        S.deployId = null;
        toast('✓ Live: ' + (data.url || 'site updated'), 'success');
        renderDeployStatus('ready', data.url);
      } else if (data.state === 'error') {
        clearInterval(S.deployPollTimer);
        toast('Deploy error — check Netlify dashboard', 'error');
        renderDeployStatus('error', '');
      } else {
        renderDeployStatus('building', '');
      }
    }, 4000);
  }

  function renderDeployStatus(state, url) {
    var el = $id('deploy-status-val');
    if (!el) return;
    var labels = { ready: '✓ Live', building: '⏳ Building…', error: '✗ Error', unknown: '—' };
    el.textContent = url ? labels[state] + ' — ' + url : (labels[state] || '—');
    el.className = 'deploy-status-value status-' + state;
  }

  // ── Image picker modal ────────────────────────────────────────
  var _imagePickerCallback = null;

  function openImagePicker(callback) {
    _imagePickerCallback = callback;
    var html = '<div class="admin-modal-header">'
      + '<span class="admin-modal-title">Pick an image</span>'
      + '<button class="admin-modal-close" id="img-picker-close">&times;</button>'
      + '</div>'
      + '<div class="admin-modal-body">'
      + '<div class="admin-photo-grid" id="img-picker-grid">'
      + (S.images.length === 0
          ? '<div class="img-picker-empty">'
            + '<div class="img-picker-empty-icon">📷</div>'
            + '<p>No images found.</p>'
            + '<p>Go to <strong>Photos → Connect folder</strong> to make your image library available here.</p>'
            + '</div>'
          : S.images.map(function(name) {
              return '<div class="admin-photo-card" data-name="' + esc(name) + '">'
                + '<img class="admin-photo-img" src="/images/' + esc(name) + '" loading="lazy" onerror="this.style.background=\'#E8EBF0\'">'
                + '<p class="admin-photo-name">' + esc(name) + '</p>'
                + '</div>';
            }).join(''))
      + '</div></div>';

    var overlay = document.createElement('div');
    overlay.className = 'admin-modal-overlay';
    overlay.id = 'img-picker-overlay';
    var modal = document.createElement('div');
    modal.className = 'admin-modal';
    modal.innerHTML = html;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    $id('img-picker-close').addEventListener('click', closeImagePicker);
    overlay.addEventListener('click', function(e){ if (e.target===overlay) closeImagePicker(); });
    $id('img-picker-grid').addEventListener('click', function(e) {
      var card = e.target.closest('.admin-photo-card');
      if (!card) return;
      var name = card.dataset.name;
      var cb = _imagePickerCallback;
      closeImagePicker();
      if (cb) cb('/images/' + name, name);
    });
  }

  function closeImagePicker() {
    var el = $id('img-picker-overlay');
    if (el) el.remove();
    _imagePickerCallback = null;
  }

  // ── Image edit modal (crop + rotate) ─────────────────────────
  var EDIT_CANVAS_W = 640;
  var EDIT_CANVAS_H = 420;

  var _imgEdit = {
    img:         null,
    rotation:    0,       // 0 | 90 | 180 | 270
    crop:        null,    // { x, y, w, h } in canvas display coords
    dragging:    false,
    dragStart:   null,
    displayRect: null,    // { x, y, w, h, scale } — image area in canvas
    callback:    null     // function(blob|null)
  };

  function openImageEditModal(src, onApply) {
    _imgEdit.rotation = 0;
    _imgEdit.crop = null;
    _imgEdit.dragging = false;
    _imgEdit.callback = onApply;
    _imgEdit.img = null;
    _imgEdit.displayRect = null;

    var overlay = document.createElement('div');
    overlay.className = 'admin-modal-overlay';
    overlay.id = 'img-edit-overlay';
    overlay.innerHTML =
      '<div class="admin-modal admin-modal-edit">'
      + '<div class="img-edit-toolbar">'
      + '<button type="button" class="admin-btn admin-btn-sm admin-btn-outline" id="btn-rot-ccw">↺ Rotate CCW</button>'
      + '<button type="button" class="admin-btn admin-btn-sm admin-btn-outline" id="btn-rot-cw">↻ Rotate CW</button>'
      + '<button type="button" class="admin-btn admin-btn-sm admin-btn-outline" id="btn-crop-clear" style="display:none">✕ Clear crop</button>'
      + '<span class="img-edit-hint">Drag on image to crop</span>'
      + '<button type="button" class="admin-modal-close" id="img-edit-close">&times;</button>'
      + '</div>'
      + '<div class="img-edit-canvas-wrap" id="img-edit-wrap">'
      + '<canvas id="img-edit-canvas" width="' + EDIT_CANVAS_W + '" height="' + EDIT_CANVAS_H + '"></canvas>'
      + '</div>'
      + '<div class="img-edit-footer">'
      + '<button type="button" class="admin-btn admin-btn-outline" id="btn-edit-skip">Use as-is</button>'
      + '<button type="button" class="admin-btn admin-btn-primary" id="btn-edit-apply">Apply &amp; Use</button>'
      + '</div>'
      + '</div>';
    document.body.appendChild(overlay);

    // Load image
    var img = new Image();
    img.onload = function() { _imgEdit.img = img; renderEditCanvas(); };
    img.onerror = function() {
      toast('Could not load image for editing', 'error');
      closeImageEditModal();
    };
    img.src = src;

    // Toolbar buttons
    $id('img-edit-close').addEventListener('click', function() {
      var cb = _imgEdit.callback;
      closeImageEditModal();
      if (cb) cb(null);
    });
    $id('btn-edit-skip').addEventListener('click', function() {
      var cb = _imgEdit.callback;
      closeImageEditModal();
      if (cb) cb(null);
    });
    $id('btn-edit-apply').addEventListener('click', function() {
      applyImageEdit(function(blob) {
        var cb = _imgEdit.callback;
        closeImageEditModal();
        if (cb) cb(blob);
      });
    });
    $id('btn-rot-ccw').addEventListener('click', function() {
      _imgEdit.rotation = (_imgEdit.rotation + 270) % 360;
      _imgEdit.crop = null;
      $id('btn-crop-clear').style.display = 'none';
      renderEditCanvas();
    });
    $id('btn-rot-cw').addEventListener('click', function() {
      _imgEdit.rotation = (_imgEdit.rotation + 90) % 360;
      _imgEdit.crop = null;
      $id('btn-crop-clear').style.display = 'none';
      renderEditCanvas();
    });
    $id('btn-crop-clear').addEventListener('click', function() {
      _imgEdit.crop = null;
      $id('btn-crop-clear').style.display = 'none';
      renderEditCanvas();
    });

    // Canvas mouse crop selection
    var canvas = $id('img-edit-canvas');

    function getCanvasPos(e) {
      var rect = canvas.getBoundingClientRect();
      var sx = EDIT_CANVAS_W / rect.width;
      var sy = EDIT_CANVAS_H / rect.height;
      return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
    }
    function finaliseCrop() {
      _imgEdit.dragging = false;
      if (_imgEdit.crop && (_imgEdit.crop.w < 10 || _imgEdit.crop.h < 10)) {
        _imgEdit.crop = null;
      }
      var clr = $id('btn-crop-clear');
      if (clr) clr.style.display = _imgEdit.crop ? '' : 'none';
      renderEditCanvas();
    }

    canvas.addEventListener('mousedown', function(e) {
      var p = getCanvasPos(e);
      _imgEdit.dragging = true;
      _imgEdit.dragStart = p;
      _imgEdit.crop = null;
    });
    canvas.addEventListener('mousemove', function(e) {
      if (!_imgEdit.dragging) return;
      var p = getCanvasPos(e);
      _imgEdit.crop = {
        x: Math.min(_imgEdit.dragStart.x, p.x),
        y: Math.min(_imgEdit.dragStart.y, p.y),
        w: Math.abs(p.x - _imgEdit.dragStart.x),
        h: Math.abs(p.y - _imgEdit.dragStart.y)
      };
      renderEditCanvas();
    });
    canvas.addEventListener('mouseup',    finaliseCrop);
    canvas.addEventListener('mouseleave', finaliseCrop);

    // Touch support
    function getTouchCanvasPos(e) {
      var t = e.touches[0] || e.changedTouches[0];
      var rect = canvas.getBoundingClientRect();
      var sx = EDIT_CANVAS_W / rect.width;
      var sy = EDIT_CANVAS_H / rect.height;
      return { x: (t.clientX - rect.left) * sx, y: (t.clientY - rect.top) * sy };
    }
    canvas.addEventListener('touchstart', function(e) {
      e.preventDefault();
      var p = getTouchCanvasPos(e);
      _imgEdit.dragging = true; _imgEdit.dragStart = p; _imgEdit.crop = null;
    }, { passive: false });
    canvas.addEventListener('touchmove', function(e) {
      e.preventDefault();
      if (!_imgEdit.dragging) return;
      var p = getTouchCanvasPos(e);
      _imgEdit.crop = {
        x: Math.min(_imgEdit.dragStart.x, p.x), y: Math.min(_imgEdit.dragStart.y, p.y),
        w: Math.abs(p.x - _imgEdit.dragStart.x), h: Math.abs(p.y - _imgEdit.dragStart.y)
      };
      renderEditCanvas();
    }, { passive: false });
    canvas.addEventListener('touchend', finaliseCrop);
  }

  function closeImageEditModal() {
    var el = $id('img-edit-overlay');
    if (el) el.remove();
    _imgEdit.img = null;
    _imgEdit.callback = null;
    _imgEdit.crop = null;
    _imgEdit.dragging = false;
  }

  function renderEditCanvas() {
    var canvas = $id('img-edit-canvas');
    if (!canvas || !_imgEdit.img) return;
    var ctx = canvas.getContext('2d');
    var img = _imgEdit.img;
    var rot = _imgEdit.rotation;
    var is90 = (rot === 90 || rot === 270);

    // Dimensions of the image after rotation
    var rotW = is90 ? img.height : img.width;
    var rotH = is90 ? img.width  : img.height;

    // Scale to fit canvas
    var scale = Math.min(EDIT_CANVAS_W / rotW, EDIT_CANVAS_H / rotH);
    var drawW = Math.round(rotW * scale);
    var drawH = Math.round(rotH * scale);
    var offX  = Math.round((EDIT_CANVAS_W - drawW) / 2);
    var offY  = Math.round((EDIT_CANVAS_H - drawH) / 2);
    _imgEdit.displayRect = { x: offX, y: offY, w: drawW, h: drawH, scale: scale };

    // Background
    ctx.fillStyle = '#1A1F29';
    ctx.fillRect(0, 0, EDIT_CANVAS_W, EDIT_CANVAS_H);

    // Draw rotated image
    ctx.save();
    ctx.translate(offX + drawW / 2, offY + drawH / 2);
    ctx.rotate(rot * Math.PI / 180);
    if (is90) {
      ctx.drawImage(img, -drawH / 2, -drawW / 2, drawH, drawW);
    } else {
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    }
    ctx.restore();

    // Crop selection overlay
    if (_imgEdit.crop) {
      var c = _imgEdit.crop;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, EDIT_CANVAS_W, c.y);
      ctx.fillRect(0, c.y + c.h, EDIT_CANVAS_W, EDIT_CANVAS_H - c.y - c.h);
      ctx.fillRect(0, c.y, c.x, c.h);
      ctx.fillRect(c.x + c.w, c.y, EDIT_CANVAS_W - c.x - c.w, c.h);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(c.x + 0.5, c.y + 0.5, c.w - 1, c.h - 1);
      ctx.setLineDash([]);
    }
  }

  function applyImageEdit(callback) {
    var img = _imgEdit.img;
    var rot = _imgEdit.rotation;
    var dr  = _imgEdit.displayRect;
    if (!img || !dr) { callback(null); return; }

    var is90 = (rot === 90 || rot === 270);
    var rotW = is90 ? img.height : img.width;
    var rotH = is90 ? img.width  : img.height;

    var outW, outH, cropX, cropY;
    if (_imgEdit.crop) {
      var c = _imgEdit.crop;
      // Clamp crop rect to image display area
      var ix = Math.max(c.x, dr.x) - dr.x;
      var iy = Math.max(c.y, dr.y) - dr.y;
      var iw = Math.min(c.x + c.w, dr.x + dr.w) - Math.max(c.x, dr.x);
      var ih = Math.min(c.y + c.h, dr.y + dr.h) - Math.max(c.y, dr.y);
      if (iw < 2 || ih < 2) { _imgEdit.crop = null; applyImageEdit(callback); return; }
      cropX = Math.round(ix / dr.scale);
      cropY = Math.round(iy / dr.scale);
      outW  = Math.round(iw / dr.scale);
      outH  = Math.round(ih / dr.scale);
    } else {
      cropX = 0; cropY = 0;
      outW = rotW; outH = rotH;
    }

    // Cap at 1400px wide
    var fs = Math.min(1, 1400 / outW);
    var fw = Math.round(outW * fs);
    var fh = Math.round(outH * fs);

    var out = document.createElement('canvas');
    out.width = fw; out.height = fh;
    var ctx = out.getContext('2d');

    if (_imgEdit.crop) {
      // Render full rotated image on a temp canvas, then extract crop region
      var tmp = document.createElement('canvas');
      tmp.width = rotW; tmp.height = rotH;
      var tc = tmp.getContext('2d');
      tc.save();
      tc.translate(rotW / 2, rotH / 2);
      tc.rotate(rot * Math.PI / 180);
      if (is90) {
        tc.drawImage(img, -rotH / 2, -rotW / 2, rotH, rotW);
      } else {
        tc.drawImage(img, -rotW / 2, -rotH / 2, rotW, rotH);
      }
      tc.restore();
      ctx.drawImage(tmp, cropX, cropY, outW, outH, 0, 0, fw, fh);
    } else {
      ctx.save();
      ctx.translate(fw / 2, fh / 2);
      ctx.rotate(rot * Math.PI / 180);
      if (is90) {
        ctx.drawImage(img, -fh / 2, -fw / 2, fh, fw);
      } else {
        ctx.drawImage(img, -fw / 2, -fh / 2, fw, fh);
      }
      ctx.restore();
    }

    out.toBlob(callback, 'image/jpeg', 0.88);
  }

  // ── Select helpers for forms ──────────────────────────────────
  function circuitSelect(val) {
    return '<select class="admin-select" id="f-circuit">'
      + CIRCUITS.map(function(c){
          return '<option value="' + c.id + '"' + (val==c.id?' selected':'') + '>'
            + c.id + ' — ' + c.name + '</option>';
        }).join('')
      + '</select>';
  }

  function optionSelect(id, arr, val) {
    return '<select class="admin-select" id="' + id + '">'
      + arr.map(function(v){ return '<option' + (val===v?' selected':'') + '>' + v + '</option>'; }).join('')
      + '</select>';
  }

  function pillarSelect(val) {
    return '<select class="admin-select" id="f-pillar">'
      + S.pillars.map(function(p){
          return '<option value="' + p.id + '"' + (val===p.id?' selected':'') + '>' + p.id + '</option>';
        }).join('')
      + '</select>';
  }

  function imageFieldHtml(path, fieldId) {
    var src = path || '';
    return '<div class="admin-image-field admin-form-full" id="' + fieldId + '-wrap">'
      + '<div class="admin-label">Image</div>'
      + '<div class="admin-image-preview-row">'
      + '<img class="admin-image-preview" id="' + fieldId + '-preview" src="' + esc(src) + '" onerror="this.style.opacity=0.2">'
      + '<div class="admin-image-info">'
      + '<div class="admin-image-path" id="' + fieldId + '-path">' + esc(src || 'No image') + '</div>'
      + '<div class="admin-image-btns">'
      + '<button class="admin-btn admin-btn-sm admin-btn-green" id="' + fieldId + '-upload">Upload new</button>'
      + '<button class="admin-btn admin-btn-sm admin-btn-outline" id="' + fieldId + '-pick">Pick existing</button>'
      + '<button class="admin-btn admin-btn-sm admin-btn-outline" id="' + fieldId + '-edit"' + (src ? '' : ' style="display:none"') + '>✎ Edit</button>'
      + '</div></div></div>'
      + '<input type="hidden" id="' + fieldId + '-val" value="' + esc(src) + '">'
      + '</div>';
  }

  function bindImageField(fieldId) {
    var uploadBtn = $id(fieldId + '-upload');
    var pickBtn   = $id(fieldId + '-pick');
    var editBtn   = $id(fieldId + '-edit');
    if (!uploadBtn || !pickBtn) return;

    // Upload — opens crop/rotate modal before writing to disk
    uploadBtn.addEventListener('click', function() {
      if (!S.rootHandle) {
        toast('Connect your project folder first — go to Photos and click "Connect folder"', 'error');
        return;
      }
      var inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = function() {
        if (!inp.files[0]) return;
        var file = inp.files[0];
        var previewUrl = URL.createObjectURL(file);
        openImageEditModal(previewUrl, async function(editedBlob) {
          URL.revokeObjectURL(previewUrl);
          showSpinner('Saving image…');
          try {
            var blob = editedBlob || (await resizeImage(file, 1400)).blob;
            var name = slugify(file.name.replace(/\.[^.]+$/, '')) + '.jpg';
            await writeFile('images/' + name, blob);
            await refreshImages();
            toast('Image saved: ' + name, 'success');
            setImageFieldValue(fieldId, '/images/' + name);
          } catch(e) { toast('Upload failed: ' + e.message, 'error'); }
          finally    { hideSpinner(); }
        });
      };
      inp.click();
    });

    // Pick existing
    pickBtn.addEventListener('click', function() {
      openImagePicker(function(path) { setImageFieldValue(fieldId, path); });
    });

    // Edit — crop/rotate an already-set image, saves as new file
    if (editBtn) {
      editBtn.addEventListener('click', async function() {
        var currentPath = getImageFieldValue(fieldId);
        if (!currentPath) { toast('No image to edit', 'error'); return; }
        if (!S.rootHandle) {
          toast('Connect your project folder first — go to Photos and click "Connect folder"', 'error');
          return;
        }
        openImageEditModal(currentPath, async function(blob) {
          if (!blob) return;
          var basename = currentPath.split('/').pop().replace(/\.[^.]+$/, '');
          var newName  = basename + '-edit-' + Date.now() + '.jpg';
          showSpinner('Saving edited image…');
          try {
            await writeFile('images/' + newName, blob);
            await refreshImages();
            toast('Saved: ' + newName, 'success');
            setImageFieldValue(fieldId, '/images/' + newName);
          } catch(e) { toast('Save failed: ' + e.message, 'error'); }
          finally    { hideSpinner(); }
        });
      });
    }
  }

  function setImageFieldValue(fieldId, path) {
    var valEl   = $id(fieldId + '-val');
    var pathEl  = $id(fieldId + '-path');
    var prevEl  = $id(fieldId + '-preview');
    var editBtn = $id(fieldId + '-edit');
    if (valEl)   valEl.value = path;
    if (pathEl)  pathEl.textContent = path;
    if (prevEl)  { prevEl.src = path; prevEl.style.opacity = '1'; }
    if (editBtn) editBtn.style.display = path ? '' : 'none';
    if (fieldId === 'f-image') refreshPreview();
  }

  function getImageFieldValue(fieldId) {
    var el = $id(fieldId + '-val');
    return el ? el.value : '';
  }

  // ── Render dispatcher ─────────────────────────────────────────
  function render() {
    var main = $id('admin-main');
    if (!main) return;
    var sec = S.section;
    var ed  = S.editing;

    if (sec === 'dashboard')  { main.innerHTML = dashboardHtml(); bindDashboard(); }
    else if (sec === 'stories' && !ed)   { main.innerHTML = storiesListHtml(); bindStoriesList(); }
    else if (sec === 'stories' && ed)    { main.innerHTML = storyEditHtml(ed.item); bindStoryEdit(); }
    else if (sec === 'events' && !ed)    { main.innerHTML = eventsListHtml(); bindEventsList(); }
    else if (sec === 'events' && ed)     { main.innerHTML = eventEditHtml(ed.item); bindEventEdit(); }
    else if (sec === 'locations' && !ed) { main.innerHTML = locationsListHtml(); bindLocationsList(); }
    else if (sec === 'locations' && ed)  { main.innerHTML = locationEditHtml(ed.item); bindLocationEdit(); }
    else if (sec === 'photos')           { main.innerHTML = photosHtml(); bindPhotos(); }
  }

  // ═══════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════
  function dashboardHtml() {
    return '<div class="admin-section">'
      + '<div class="admin-section-header">'
      + '<h1 class="admin-section-title">Dashboard</h1>'
      + '</div>'
      + '<div class="admin-stats">'
      + statCard(S.stories.length,   'Stories')
      + statCard(S.events.length,    'Events')
      + statCard(S.locations.length, 'Locations')
      + statCard(S.images.length,    'Photos')
      + '</div>'
      + '<div class="deploy-status-row">'
      + '<div><div class="deploy-status-label">Last deploy</div>'
      + '<div class="deploy-status-value status-unknown" id="deploy-status-val">—</div></div>'
      + '<button class="admin-btn admin-btn-primary admin-btn-sm" id="btn-deploy-main">Deploy to Netlify</button>'
      + '</div></div>';
  }

  function statCard(num, label) {
    return '<div class="admin-stat-card">'
      + '<div class="admin-stat-num">' + num + '</div>'
      + '<div class="admin-stat-label">' + label + '</div>'
      + '</div>';
  }

  function bindDashboard() {
    var btn = $id('btn-deploy-main');
    if (btn) btn.addEventListener('click', deploy);
  }

  // ═══════════════════════════════════════════════════════════
  // STORIES
  // ═══════════════════════════════════════════════════════════
  function storiesListHtml() {
    var rows = S.stories.map(function(s) {
      var photoBlocks = (s.blocks || []).filter(function(b){ return b.type === 'image'; }).length;
      var hasCover    = !!(s.image_path);
      return '<tr>'
        + '<td style="position:relative">'
        +   '<img class="admin-img-thumb" src="' + esc(s.image_path) + '" loading="lazy" onerror="this.style.opacity=0.2">'
        +   (hasCover ? '' : '<span class="block-no-cover" title="No cover photo">!</span>')
        + '</td>'
        + '<td>' + esc(s.title) + '</td>'
        + '<td><span class="admin-tag" style="background:' + esc(pillarFor(s.pillar).color||'#E8EBF0') + ';color:#fff">' + esc(s.pillar) + '</span></td>'
        + '<td><span class="admin-tag">' + esc(s.type) + '</span></td>'
        + '<td>' + fmt(s.date) + '</td>'
        + '<td>' + (photoBlocks > 0
            ? '<span class="block-photo-count">' + photoBlocks + ' 📷</span>'
            : '<span class="block-none">—</span>') + '</td>'
        + '<td class="col-actions">'
        + '<button class="admin-btn admin-btn-sm admin-btn-outline btn-edit-story" data-id="' + esc(s.id) + '">Edit</button>'
        + '<button class="admin-btn admin-btn-sm admin-btn-danger btn-del-story" data-id="' + esc(s.id) + '">Del</button>'
        + '</td></tr>';
    }).join('');
    return '<div class="admin-section">'
      + '<div class="admin-section-header">'
      + '<h1 class="admin-section-title">Stories (' + S.stories.length + ')</h1>'
      + '<button class="admin-btn admin-btn-green admin-btn-sm" id="btn-new-story">+ New Story</button>'
      + '</div>'
      + (rows ? '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>'
        + '<th style="width:60px"></th><th>Title</th><th>Pillar</th><th>Type</th><th>Date</th><th>Photos</th><th></th>'
        + '</tr></thead><tbody>' + rows + '</tbody></table></div>'
        : '<div class="admin-empty"><div class="admin-empty-icon">📖</div>No stories yet.</div>')
      + '</div>';
  }

  function bindStoriesList() {
    var nb = $id('btn-new-story');
    if (nb) nb.addEventListener('click', function() {
      var c = CIRCUITS[0];
      S.editing = { type: 'story', item: {
        id:'', slug:'', title:'', pillar: S.pillars[0]?S.pillars[0].id:'culture',
        circuit: 1, circuit_name: c.name, circuit_color: c.color,
        season:'spring', type:'reportage', date:'', read_time:8,
        excerpt:'', image_path:'', image_gradient: makeGradient(c.color), image_caption:''
      }};
      render();
    });
    document.querySelectorAll('.btn-edit-story').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var s = S.stories.find(function(x){return x.id===btn.dataset.id;});
        if (s) { S.editing = { type:'story', item: Object.assign({}, s) }; render(); }
      });
    });
    document.querySelectorAll('.btn-del-story').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        if (!confirm('Delete this story?')) return;
        deleteRecord('story', btn.dataset.id);
        try { await saveCollection('story'); toast('Story deleted', 'success'); } catch(e) { toast('Save error: '+e.message,'error'); return; }
        render();
      });
    });
  }

  function storyEditHtml(s) {
    var isNew = !s.id;
    return '<div class="admin-section story-edit-section">'
      + '<a class="admin-back-link" id="back-stories">← Stories</a>'
      + '<div class="story-edit-split">'
      // ── Left: form ──
      + '<div class="story-edit-form">'
      + '<h1 class="admin-section-title">' + (isNew ? 'New Story' : 'Edit Story') + '</h1>'
      + '<form class="admin-form story-edit-form-inner" id="story-form">'
      + '<div class="admin-form-grid">'
      + field('Title', 'text', 'f-title', s.title, false)
      + field('Slug', 'text', 'f-slug', s.slug, false, 'Auto-generated from title')
      + '<div class="admin-field">' + lbl('Pillar') + pillarSelect(s.pillar) + '</div>'
      + '<div class="admin-field">' + lbl('Circuit') + circuitSelect(s.circuit) + '</div>'
      + '<div class="admin-field">' + lbl('Season') + optionSelect('f-season', SEASONS, s.season) + '</div>'
      + '<div class="admin-field">' + lbl('Type') + optionSelect('f-type', STORY_TYPES, s.type) + '</div>'
      + field('Date', 'date', 'f-date', s.date, false)
      + field('Read Time (min)', 'number', 'f-readtime', s.read_time, false)
      + '<div class="admin-field admin-form-full">' + lbl('Excerpt') + '<textarea class="admin-textarea" id="f-excerpt">' + esc(s.excerpt) + '</textarea></div>'
      + imageFieldHtml(s.image_path, 'f-image')
      + field('Image Caption', 'text', 'f-imgcaption', s.image_caption, false, null, 'admin-form-full')
      + '<div class="admin-field admin-form-full">' + lbl('Image Gradient CSS') + '<input class="admin-input" id="f-gradient" value="' + esc(s.image_gradient) + '"><div class="admin-gradient-preview" id="gradient-preview" style="background:' + esc(s.image_gradient) + '"></div></div>'
      + '</div>'
      + blockEditorHtml()
      + '<div class="admin-form-actions">'
      + '<button type="submit" class="admin-btn admin-btn-primary">Save Story</button>'
      + '<button type="button" class="admin-btn admin-btn-outline" id="cancel-story">Cancel</button>'
      + '</div>'
      + '</form></div>'
      // ── Right: live preview ──
      + '<div class="story-edit-preview" id="story-preview"></div>'
      + '</div></div>';
  }

  function bindStoryEdit() {
    var s = S.editing.item;
    _editBlocks      = JSON.parse(JSON.stringify(s.blocks || []));
    _editingBlockIdx = -1;
    bindImageField('f-image');
    bindBlockEditor();

    // Auto-slug from title
    var titleEl = $id('f-title');
    var slugEl  = $id('f-slug');
    if (titleEl) titleEl.addEventListener('input', function() {
      if (!s.id) slugEl.value = slugify(titleEl.value);
    });

    // Gradient preview
    var gEl = $id('f-gradient');
    var gPv = $id('gradient-preview');
    if (gEl) gEl.addEventListener('input', function() { if(gPv) gPv.style.background = gEl.value; });

    // Circuit → gradient auto-update
    var cEl = $id('f-circuit');
    if (cEl) cEl.addEventListener('change', function() {
      var c = circuitFor(parseInt(cEl.value));
      if (gEl) { gEl.value = makeGradient(c.color); if(gPv) gPv.style.background = gEl.value; }
    });

    $id('back-stories').addEventListener('click', function(e){ e.preventDefault(); S.editing=null; render(); });
    $id('cancel-story').addEventListener('click', function(){ S.editing=null; render(); });

    // Live preview — update on any form input
    $id('story-form').addEventListener('input', refreshPreview);

    $id('story-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      var c   = circuitFor(parseInt($id('f-circuit').value));
      var rec = Object.assign({}, s, {
        id:            $id('f-slug').value || slugify($id('f-title').value),
        slug:          $id('f-slug').value || slugify($id('f-title').value),
        title:         $id('f-title').value.trim(),
        pillar:        $id('f-pillar').value,
        circuit:       parseInt($id('f-circuit').value),
        circuit_name:  c.name,
        circuit_color: c.color,
        season:        $id('f-season').value,
        type:          $id('f-type').value,
        date:          $id('f-date').value,
        read_time:     parseInt($id('f-readtime').value) || 8,
        excerpt:       $id('f-excerpt').value.trim(),
        image_path:    getImageFieldValue('f-image'),
        image_caption: $id('f-imgcaption').value.trim(),
        image_gradient:$id('f-gradient').value.trim(),
        blocks: JSON.parse(JSON.stringify(_editBlocks))
      });
      if (!rec.title) { toast('Title is required', 'error'); return; }
      upsertRecord('story', rec);
      showSpinner('Saving…');
      try {
        await saveCollection('story');
        toast('Story saved', 'success');
        S.editing = null; render();
      } catch(e) { toast('Save failed: '+e.message, 'error'); }
      finally { hideSpinner(); }
    });

    // Initial preview render
    refreshPreview();
  }

  // ── Live preview ───────────────────────────────────────────
  function refreshPreview() {
    var el = $id('story-preview');
    if (!el) return;
    el.innerHTML = previewHtml({
      title:    ($id('f-title')   || {}).value || '',
      excerpt:  ($id('f-excerpt') || {}).value || '',
      gradient: ($id('f-gradient')|| {}).value || '#2C3340',
      imgSrc:   getImageFieldValue('f-image'),
      pillar:   ($id('f-pillar')  || {}).value || '',
      season:   ($id('f-season')  || {}).value || '',
      type:     ($id('f-type')    || {}).value || '',
      circuit:  $id('f-circuit') ? circuitFor(parseInt($id('f-circuit').value)) : CIRCUITS[0],
      blocks:   _editBlocks
    });
  }

  function previewHtml(d) {
    var pillarLabel = d.pillar ? d.pillar.charAt(0).toUpperCase() + d.pillar.slice(1) : '';
    var seasonLabel = d.season ? d.season.charAt(0).toUpperCase() + d.season.slice(1) : '';
    var typeLabel   = d.type   ? d.type.charAt(0).toUpperCase()   + d.type.slice(1)   : '';
    var c = d.circuit || CIRCUITS[0];

    var hero = '<div class="preview-hero" style="background:' + esc(d.gradient) + '">'
      + (d.imgSrc ? '<img src="' + esc(d.imgSrc) + '" loading="lazy">' : '')
      + '<div class="preview-hero-overlay"></div>'
      + '<div class="preview-hero-badges">'
      + (seasonLabel ? '<span class="preview-season-badge">' + esc(seasonLabel) + '</span>' : '')
      + (c ? '<span class="preview-circuit-badge" style="background:' + esc(c.color) + '">' + esc(c.name) + '</span>' : '')
      + '</div>'
      + '</div>';

    var metaRow = '<div class="preview-meta-row">'
      + (pillarLabel ? '<span class="preview-pillar">' + esc(pillarLabel) + '</span><span class="preview-dot">·</span>' : '')
      + (c ? '<span class="preview-circuit-txt">' + esc(c.name) + '</span><span class="preview-dot">·</span>' : '')
      + (seasonLabel ? '<span class="preview-badge-sm">' + esc(seasonLabel) + '</span><span class="preview-dot">·</span>' : '')
      + (typeLabel   ? '<span class="preview-badge-sm">' + esc(typeLabel) + '</span>' : '')
      + '</div>';

    var blocksHtml = '';
    if (d.blocks && d.blocks.length) {
      blocksHtml = '<div class="story-prose">'
        + d.blocks.map(function(b) {
            if (b.type === 'text')
              return '<p>' + esc(b.content || '') + '</p>';
            if (b.type === 'pullquote')
              return '<blockquote class="pull-quote">' + esc(b.content || '') + '</blockquote>';
            if (b.type === 'image' && b.src)
              return '<figure class="story-block-fig">'
                + '<img src="' + esc(b.src) + '" loading="lazy">'
                + (b.caption ? '<figcaption>' + esc(b.caption) + '</figcaption>' : '')
                + '</figure>';
            if (b.type === 'image')
              return '<div class="preview-img-placeholder">\uD83D\uDDBC image block (no image selected)</div>';
            if (b.type === 'heading')
              return '<h' + (b.level || 2) + ' style="margin-top:1.5rem;font-family:var(--font-serif)">' + esc(b.content || '') + '</h' + (b.level || 2) + '>';
            if (b.type === 'gallery' && b.images && b.images.length)
              return '<div style="display:grid;grid-template-columns:repeat(' + (b.columns || 3) + ',1fr);gap:0.5rem;margin:1rem 0">'
                + b.images.map(function(img) { return '<img src="' + esc(img.src || '') + '" style="width:100%;aspect-ratio:4/3;object-fit:cover" loading="lazy">'; }).join('')
                + '</div>';
            if (b.type === 'gallery')
              return '<div class="preview-img-placeholder">\u229e gallery (' + ((b.images || []).length) + ' images)</div>';
            if (b.type === 'video')
              return '<div class="preview-img-placeholder">\u25b6 video \u2014 ' + esc(b.provider || '') + (b.src ? ': ' + esc(b.src.substring(0, 50)) : '') + '</div>';
            if (b.type === 'divider')
              return b.style === 'ornament'
                ? '<div style="text-align:center;margin:1.5rem 0;color:var(--ochre);font-size:1.2rem">\u2726 \u2726 \u2726</div>'
                : '<hr style="border:none;border-top:1px solid var(--stone);margin:1.5rem 0">';
            if (b.type === 'callout')
              return '<div style="border-left:3px solid var(--ochre);padding:0.75rem 1rem;background:#F5F0EA;margin:1rem 0">'
                + '<strong>' + esc(b.label || 'Note') + '</strong><br>'
                + esc(b.content || '') + '</div>';
            if (b.type === 'map')
              return '<div class="preview-img-placeholder">\uD83D\uDCCD map \u2014 ' + esc(b.location_id || '(custom pin)') + (b.caption ? ': ' + esc(b.caption) : '') + '</div>';
            if (b.type === 'fullwidth' && b.src)
              return '<figure style="margin:1rem -1rem">'
                + '<img src="' + esc(b.src) + '" style="width:100%;display:block" loading="lazy">'
                + (b.caption ? '<figcaption style="padding:0.3rem 1rem;font-size:0.8rem;color:var(--slate)">' + esc(b.caption) + '</figcaption>' : '')
                + '</figure>';
            if (b.type === 'fullwidth')
              return '<div class="preview-img-placeholder">\u2194 fullwidth (no image)</div>';
            if (b.type === 'audio')
              return '<div style="background:#F5F0EA;padding:0.75rem;border-radius:4px;margin:0.5rem 0">'
                + '\u266a ' + esc(b.title || b.src || '') + (b.duration ? ' (' + esc(b.duration) + ')' : '')
                + '</div>';
            if (b.type === 'beforeafter')
              return '<div class="preview-img-placeholder">\u21d4 before/after: '
                + esc(b.before_label || 'before') + ' / ' + esc(b.after_label || 'after') + '</div>';
            return '';
          }).join('')
        + '</div>';
    } else {
      blocksHtml = '<p class="preview-no-blocks">No content blocks yet.</p>';
    }

    return '<div class="preview-label">Live Preview</div>'
      + hero
      + '<div class="preview-body">'
      + metaRow
      + '<h2 class="story-title">' + esc(d.title || '(no title)') + '</h2>'
      + (d.excerpt ? '<p class="story-lede">' + esc(d.excerpt) + '</p>' : '')
      + blocksHtml
      + '</div>';
  }

  // ═══════════════════════════════════════════════════════════
  // BLOCK EDITOR (story content blocks)
  // ═══════════════════════════════════════════════════════════

  function blockEditorHtml() {
    return '<div class="admin-block-section">'
      + '<div class="admin-block-section-title">Content Blocks'
      + '<span class="admin-block-section-hint">Compose the story body — text, photos, video, and more</span>'
      + '</div>'
      + '<div id="block-list">' + blockListHtml() + '</div>'
      + '<div class="block-add-bar">'
      + '<button type="button" class="admin-btn admin-btn-sm admin-btn-outline" id="btn-add-text">\u00b6 Text</button>'
      + '<button type="button" class="admin-btn admin-btn-sm admin-btn-outline" id="btn-add-image">\uD83D\uDDBC Image</button>'
      + '<button type="button" class="admin-btn admin-btn-sm admin-btn-outline" id="btn-add-quote">\u275d Quote</button>'
      + '<button type="button" class="admin-btn admin-btn-sm admin-btn-outline" id="btn-add-heading">H Heading</button>'
      + '<button type="button" class="admin-btn admin-btn-sm admin-btn-outline" id="btn-add-gallery">\u229e Gallery</button>'
      + '<button type="button" class="admin-btn admin-btn-sm admin-btn-outline" id="btn-add-video">\u25b6 Video</button>'
      + '<button type="button" class="admin-btn admin-btn-sm admin-btn-outline" id="btn-add-divider">\u2014 Divider</button>'
      + '<button type="button" class="admin-btn admin-btn-sm admin-btn-outline" id="btn-add-callout">\u2726 Callout</button>'
      + '<button type="button" class="admin-btn admin-btn-sm admin-btn-outline" id="btn-add-map">\uD83D\uDCCD Map</button>'
      + '<button type="button" class="admin-btn admin-btn-sm admin-btn-outline" id="btn-add-fullwidth">\u2194 Full Width</button>'
      + '<button type="button" class="admin-btn admin-btn-sm admin-btn-outline" id="btn-add-audio">\u266a Audio</button>'
      + '<button type="button" class="admin-btn admin-btn-sm admin-btn-outline" id="btn-add-beforeafter">\u21d4 Before/After</button>'
      + '</div>'
      + '</div>';
  }

  function blockListHtml() {
    if (!_editBlocks.length) {
      return '<div class="block-empty">No blocks yet \u2014 add text, images, video, and more.</div>';
    }
    var BLOCK_LABELS = {
      text: '\u00b6 text', image: '\uD83D\uDDBC image', pullquote: '\u275d quote',
      heading: 'H heading', gallery: '\u229e gallery', video: '\u25b6 video',
      divider: '\u2014 divider', callout: '\u2726 callout', map: '\uD83D\uDCCD map',
      fullwidth: '\u2194 fullwidth', audio: '\u266a audio', beforeafter: '\u21d4 before/after'
    };
    var BLOCK_BADGE_CLASS = {
      text: 'block-badge-text', image: 'block-badge-image', pullquote: 'block-badge-quote',
      heading: 'block-badge-heading', gallery: 'block-badge-gallery', video: 'block-badge-video',
      divider: 'block-badge-divider', callout: 'block-badge-callout', map: 'block-badge-map',
      fullwidth: 'block-badge-fullwidth', audio: 'block-badge-audio', beforeafter: 'block-badge-beforeafter'
    };
    return _editBlocks.map(function(b, i) {
      var isEditing = (_editingBlockIdx === i);
      var btype = b.type || 'text';
      var badge = '<span class="block-badge ' + (BLOCK_BADGE_CLASS[btype] || 'block-badge-text') + '">'
        + (BLOCK_LABELS[btype] || btype) + '</span>';

      var preview;
      if (btype === 'image' || btype === 'fullwidth')
        preview = esc(b.src || '(no image)');
      else if (btype === 'gallery')
        preview = esc((b.images || []).length + ' image' + ((b.images || []).length !== 1 ? 's' : ''));
      else if (btype === 'video')
        preview = esc((b.provider || '') + (b.src ? ' \u2014 ' + b.src.substring(0, 60) : ''));
      else if (btype === 'divider')
        preview = esc(b.style || 'line');
      else if (btype === 'map')
        preview = esc(b.location_id || (b.lat ? b.lat + ', ' + b.lon : '(no location)'));
      else if (btype === 'audio')
        preview = esc(b.title || b.src || '');
      else if (btype === 'beforeafter')
        preview = esc((b.before_label || 'before') + ' / ' + (b.after_label || 'after'));
      else
        preview = esc((b.content || '').substring(0, 90) + ((b.content || '').length > 90 ? '\u2026' : ''));

      var row = '<div class="block-row">'
        + badge
        + ((btype === 'image' || btype === 'fullwidth') && b.src
            ? '<img class="block-row-thumb" src="' + esc(b.src) + '" loading="lazy">' : '')
        + (btype === 'beforeafter' && b.before_src
            ? '<img class="block-row-thumb" src="' + esc(b.before_src) + '" loading="lazy">' : '')
        + '<span class="block-preview">' + preview + '</span>'
        + '<div class="block-actions">'
        + (i > 0 ? '<button type="button" class="admin-btn admin-btn-xs block-btn-up" data-idx="' + i + '">\u2191</button>' : '')
        + (i < _editBlocks.length - 1 ? '<button type="button" class="admin-btn admin-btn-xs block-btn-down" data-idx="' + i + '">\u2193</button>' : '')
        + (btype !== 'divider' ? '<button type="button" class="admin-btn admin-btn-xs admin-btn-outline block-btn-edit" data-idx="' + i + '">' + (isEditing ? 'Close' : 'Edit') + '</button>' : '')
        + '<button type="button" class="admin-btn admin-btn-xs admin-btn-danger block-btn-del" data-idx="' + i + '">\u2715</button>'
        + '</div>'
        + '</div>';

      var panel = '';
      if (isEditing) {
        panel = '<div class="block-edit-panel">';
        if (b.type === 'text' || b.type === 'pullquote') {
          panel += '<textarea class="admin-textarea block-edit-ta" id="block-ta-' + i + '">' + esc(b.content || '') + '</textarea>';
        } else if (b.type === 'image') {
          panel += '<div class="block-img-row">'
            + (b.src ? '<img class="block-img-preview" src="' + esc(b.src) + '">' : '')
            + '<div class="block-img-controls">'
            + '<span class="block-img-path" id="block-path-' + i + '">' + esc(b.src || 'No image selected') + '</span>'
            + '<button type="button" class="admin-btn admin-btn-sm admin-btn-outline block-btn-pick" data-idx="' + i + '">Pick from library</button>'
            + '<button type="button" class="admin-btn admin-btn-sm admin-btn-outline block-btn-upload" data-idx="' + i + '">Upload new</button>'
            + '</div></div>'
            + '<input class="admin-input" id="block-cap-' + i + '" placeholder="Caption (optional)" value="' + esc(b.caption || '') + '">';
        } else if (b.type === 'heading') {
          panel += '<div class="block-field-row" style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.5rem">'
            + '<label class="admin-label" style="margin:0;white-space:nowrap">Level</label>'
            + '<select class="admin-select" id="block-heading-level-' + i + '">'
            + '<option value="2"' + (b.level !== 3 ? ' selected' : '') + '>H2 \u2014 Section Title</option>'
            + '<option value="3"' + (b.level === 3 ? ' selected' : '') + '>H3 \u2014 Sub-heading</option>'
            + '</select></div>'
            + '<input class="admin-input" id="block-heading-text-' + i + '" placeholder="Heading text" value="' + esc(b.content || '') + '">';
        } else if (b.type === 'gallery') {
          var galleryImgRows = (b.images || []).map(function(img, gi) {
            return '<div class="block-gallery-img-row" style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem">'
              + '<img class="block-row-thumb" src="' + esc(img.src || '') + '" loading="lazy" style="flex-shrink:0">'
              + '<input class="admin-input" style="flex:1" id="block-gal-cap-' + i + '-' + gi + '" placeholder="Caption" value="' + esc(img.caption || '') + '">'
              + '<button type="button" class="admin-btn admin-btn-xs admin-btn-danger block-gal-del" data-idx="' + i + '" data-gidx="' + gi + '">\u2715</button>'
              + '</div>';
          }).join('');
          panel += '<div class="block-field-row" style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.5rem">'
            + '<label class="admin-label" style="margin:0;white-space:nowrap">Columns</label>'
            + '<select class="admin-select" id="block-gal-cols-' + i + '">'
            + [2, 3, 4].map(function(n) { return '<option value="' + n + '"' + ((b.columns || 3) === n ? ' selected' : '') + '>' + n + '</option>'; }).join('')
            + '</select></div>'
            + '<div id="block-gal-list-' + i + '">' + galleryImgRows + '</div>'
            + '<button type="button" class="admin-btn admin-btn-sm admin-btn-outline block-gal-add" data-idx="' + i + '" style="margin-top:0.5rem">+ Add image from library</button>';
        } else if (b.type === 'video') {
          panel += '<div class="block-field-row" style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.5rem">'
            + '<label class="admin-label" style="margin:0;white-space:nowrap">Provider</label>'
            + '<select class="admin-select" id="block-vid-provider-' + i + '">'
            + ['youtube', 'vimeo', 'self'].map(function(p) { return '<option value="' + p + '"' + (b.provider === p ? ' selected' : '') + '>' + p + '</option>'; }).join('')
            + '</select></div>'
            + '<input class="admin-input" id="block-vid-src-' + i + '" placeholder="YouTube/Vimeo URL or /images/clip.mp4" value="' + esc(b.src || '') + '">'
            + '<input class="admin-input" id="block-vid-caption-' + i + '" placeholder="Caption (optional)" value="' + esc(b.caption || '') + '">'
            + '<div class="block-field-row" style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.5rem">'
            + '<label class="admin-label" style="margin:0;white-space:nowrap">Display</label>'
            + '<select class="admin-select" id="block-vid-display-' + i + '">'
            + ['default', 'ambient', 'shorts'].map(function(d) { return '<option value="' + d + '"' + ((b.display || 'default') === d ? ' selected' : '') + '>' + d + '</option>'; }).join('')
            + '</select></div>';
        } else if (b.type === 'callout') {
          panel += '<div class="block-field-row" style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.5rem">'
            + '<label class="admin-label" style="margin:0;white-space:nowrap">Style</label>'
            + '<select class="admin-select" id="block-callout-style-' + i + '">'
            + ['note', 'tip', 'warning'].map(function(s) { return '<option value="' + s + '"' + ((b.style || 'note') === s ? ' selected' : '') + '>' + s + '</option>'; }).join('')
            + '</select></div>'
            + '<input class="admin-input" id="block-callout-label-' + i + '" placeholder="Label (e.g. Field Note)" value="' + esc(b.label || '') + '">'
            + '<textarea class="admin-textarea block-edit-ta" id="block-callout-ta-' + i + '">' + esc(b.content || '') + '</textarea>';
        } else if (b.type === 'map') {
          panel += '<input class="admin-input" id="block-map-locid-' + i + '" placeholder="Location ID from locations.json (leave blank for custom pin)" value="' + esc(b.location_id || '') + '">'
            + '<input class="admin-input" id="block-map-caption-' + i + '" placeholder="Caption (optional)" value="' + esc(b.caption || '') + '">';
        } else if (b.type === 'fullwidth') {
          panel += '<div class="block-img-row">'
            + (b.src ? '<img class="block-img-preview" src="' + esc(b.src) + '">' : '')
            + '<div class="block-img-controls">'
            + '<span class="block-img-path" id="block-fw-path-' + i + '">' + esc(b.src || 'No image selected') + '</span>'
            + '<button type="button" class="admin-btn admin-btn-sm admin-btn-outline block-fw-pick" data-idx="' + i + '">Pick from library</button>'
            + '</div></div>'
            + '<input class="admin-input" id="block-fw-cap-' + i + '" placeholder="Caption (optional)" value="' + esc(b.caption || '') + '">'
            + '<input class="admin-input" id="block-fw-overlay-' + i + '" placeholder="Overlay text (optional)" value="' + esc(b.overlay_text || '') + '">';
        } else if (b.type === 'audio') {
          panel += '<input class="admin-input" id="block-audio-src-' + i + '" placeholder="/images/ambient.mp3" value="' + esc(b.src || '') + '">'
            + '<input class="admin-input" id="block-audio-title-' + i + '" placeholder="Title (e.g. Morning bells at Sanahin)" value="' + esc(b.title || '') + '">'
            + '<input class="admin-input" id="block-audio-dur-' + i + '" placeholder="Duration (e.g. 2:14)" value="' + esc(b.duration || '') + '">';
        } else if (b.type === 'beforeafter') {
          panel += '<div class="block-field-row" style="margin-bottom:0.5rem">'
            + '<label class="admin-label">Before image</label>'
            + (b.before_src ? '<img class="block-row-thumb" src="' + esc(b.before_src) + '" style="display:block;margin-bottom:0.25rem">' : '')
            + '<div style="display:flex;gap:0.5rem;align-items:center">'
            + '<span class="block-img-path" id="block-ba-before-path-' + i + '">' + esc(b.before_src || 'No image') + '</span>'
            + '<button type="button" class="admin-btn admin-btn-sm admin-btn-outline block-ba-before-pick" data-idx="' + i + '">Pick</button>'
            + '</div>'
            + '<input class="admin-input" id="block-ba-before-label-' + i + '" placeholder="Before label (e.g. 1988)" value="' + esc(b.before_label || '') + '" style="margin-top:0.25rem">'
            + '</div>'
            + '<div class="block-field-row">'
            + '<label class="admin-label">After image</label>'
            + (b.after_src ? '<img class="block-row-thumb" src="' + esc(b.after_src) + '" style="display:block;margin-bottom:0.25rem">' : '')
            + '<div style="display:flex;gap:0.5rem;align-items:center">'
            + '<span class="block-img-path" id="block-ba-after-path-' + i + '">' + esc(b.after_src || 'No image') + '</span>'
            + '<button type="button" class="admin-btn admin-btn-sm admin-btn-outline block-ba-after-pick" data-idx="' + i + '">Pick</button>'
            + '</div>'
            + '<input class="admin-input" id="block-ba-after-label-' + i + '" placeholder="After label (e.g. 2024)" value="' + esc(b.after_label || '') + '" style="margin-top:0.25rem">'
            + '</div>';
        }
        if (b.type !== 'divider') {
          panel += '<button type="button" class="admin-btn admin-btn-sm admin-btn-primary block-btn-apply" data-idx="' + i + '">Apply</button>';
        }
        panel += '</div>';
      }
      return row + panel;
    }).join('');
  }

  function rebuildBlockList() {
    var el = $id('block-list');
    if (el) { el.innerHTML = blockListHtml(); bindBlockList(); }
    refreshPreview();
  }

  function bindBlockEditor() {
    var addText       = $id('btn-add-text');
    var addImg        = $id('btn-add-image');
    var addQuote      = $id('btn-add-quote');
    var addHeading    = $id('btn-add-heading');
    var addGallery    = $id('btn-add-gallery');
    var addVideo      = $id('btn-add-video');
    var addDivider    = $id('btn-add-divider');
    var addCallout    = $id('btn-add-callout');
    var addMap        = $id('btn-add-map');
    var addFullwidth  = $id('btn-add-fullwidth');
    var addAudio      = $id('btn-add-audio');
    var addBeforeAfter = $id('btn-add-beforeafter');

    if (addText) addText.addEventListener('click', function() {
      _editBlocks.push({ type: 'text', content: '' });
      _editingBlockIdx = _editBlocks.length - 1;
      rebuildBlockList();
    });
    if (addImg) addImg.addEventListener('click', function() {
      _editBlocks.push({ type: 'image', src: '', caption: '' });
      _editingBlockIdx = _editBlocks.length - 1;
      rebuildBlockList();
    });
    if (addQuote) addQuote.addEventListener('click', function() {
      _editBlocks.push({ type: 'pullquote', content: '' });
      _editingBlockIdx = _editBlocks.length - 1;
      rebuildBlockList();
    });
    if (addHeading) addHeading.addEventListener('click', function() {
      _editBlocks.push({ type: 'heading', level: 2, content: '' });
      _editingBlockIdx = _editBlocks.length - 1;
      rebuildBlockList();
    });
    if (addGallery) addGallery.addEventListener('click', function() {
      _editBlocks.push({ type: 'gallery', images: [], columns: 3 });
      _editingBlockIdx = _editBlocks.length - 1;
      rebuildBlockList();
    });
    if (addVideo) addVideo.addEventListener('click', function() {
      _editBlocks.push({ type: 'video', provider: 'youtube', src: '', caption: '', display: 'default' });
      _editingBlockIdx = _editBlocks.length - 1;
      rebuildBlockList();
    });
    if (addDivider) addDivider.addEventListener('click', function() {
      _editBlocks.push({ type: 'divider', style: 'line' });
      _editingBlockIdx = -1;
      rebuildBlockList();
    });
    if (addCallout) addCallout.addEventListener('click', function() {
      _editBlocks.push({ type: 'callout', label: 'Field Note', content: '', style: 'note' });
      _editingBlockIdx = _editBlocks.length - 1;
      rebuildBlockList();
    });
    if (addMap) addMap.addEventListener('click', function() {
      _editBlocks.push({ type: 'map', location_id: '', caption: '' });
      _editingBlockIdx = _editBlocks.length - 1;
      rebuildBlockList();
    });
    if (addFullwidth) addFullwidth.addEventListener('click', function() {
      _editBlocks.push({ type: 'fullwidth', src: '', caption: '', overlay_text: '' });
      _editingBlockIdx = _editBlocks.length - 1;
      rebuildBlockList();
    });
    if (addAudio) addAudio.addEventListener('click', function() {
      _editBlocks.push({ type: 'audio', src: '', title: '', duration: '' });
      _editingBlockIdx = _editBlocks.length - 1;
      rebuildBlockList();
    });
    if (addBeforeAfter) addBeforeAfter.addEventListener('click', function() {
      _editBlocks.push({ type: 'beforeafter', before_src: '', after_src: '', before_label: 'Before', after_label: 'After' });
      _editingBlockIdx = _editBlocks.length - 1;
      rebuildBlockList();
    });
    bindBlockList();
  }

  function bindBlockList() {
    document.querySelectorAll('.block-btn-edit').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(btn.dataset.idx);
        _editingBlockIdx = (_editingBlockIdx === idx) ? -1 : idx;
        rebuildBlockList();
      });
    });

    document.querySelectorAll('.block-btn-apply').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(btn.dataset.idx);
        var b = _editBlocks[idx];
        if (b.type === 'text' || b.type === 'pullquote') {
          var ta = $id('block-ta-' + idx);
          if (ta) b.content = ta.value;
        } else if (b.type === 'image') {
          var capEl = $id('block-cap-' + idx);
          if (capEl) b.caption = capEl.value.trim();
        } else if (b.type === 'heading') {
          var lvlEl = $id('block-heading-level-' + idx);
          var txtEl = $id('block-heading-text-' + idx);
          if (lvlEl) b.level = parseInt(lvlEl.value);
          if (txtEl) b.content = txtEl.value;
        } else if (b.type === 'gallery') {
          var colsEl = $id('block-gal-cols-' + idx);
          if (colsEl) b.columns = parseInt(colsEl.value);
          (b.images || []).forEach(function(img, gi) {
            var capEl2 = $id('block-gal-cap-' + idx + '-' + gi);
            if (capEl2) img.caption = capEl2.value;
          });
        } else if (b.type === 'video') {
          var vpEl = $id('block-vid-provider-' + idx);
          var vsEl = $id('block-vid-src-' + idx);
          var vcEl = $id('block-vid-caption-' + idx);
          var vdEl = $id('block-vid-display-' + idx);
          if (vpEl) b.provider = vpEl.value;
          if (vsEl) b.src = vsEl.value.trim();
          if (vcEl) b.caption = vcEl.value.trim();
          if (vdEl) b.display = vdEl.value;
        } else if (b.type === 'callout') {
          var csEl = $id('block-callout-style-' + idx);
          var clEl = $id('block-callout-label-' + idx);
          var ctEl = $id('block-callout-ta-' + idx);
          if (csEl) b.style = csEl.value;
          if (clEl) b.label = clEl.value.trim();
          if (ctEl) b.content = ctEl.value;
        } else if (b.type === 'map') {
          var mlidEl = $id('block-map-locid-' + idx);
          var mcEl = $id('block-map-caption-' + idx);
          if (mlidEl) b.location_id = mlidEl.value.trim();
          if (mcEl) b.caption = mcEl.value.trim();
        } else if (b.type === 'fullwidth') {
          var fwcEl = $id('block-fw-cap-' + idx);
          var fwoEl = $id('block-fw-overlay-' + idx);
          if (fwcEl) b.caption = fwcEl.value.trim();
          if (fwoEl) b.overlay_text = fwoEl.value.trim();
        } else if (b.type === 'audio') {
          var asEl = $id('block-audio-src-' + idx);
          var atEl = $id('block-audio-title-' + idx);
          var adEl = $id('block-audio-dur-' + idx);
          if (asEl) b.src = asEl.value.trim();
          if (atEl) b.title = atEl.value.trim();
          if (adEl) b.duration = adEl.value.trim();
        } else if (b.type === 'beforeafter') {
          var bbLblEl = $id('block-ba-before-label-' + idx);
          var baLblEl = $id('block-ba-after-label-' + idx);
          if (bbLblEl) b.before_label = bbLblEl.value.trim();
          if (baLblEl) b.after_label = baLblEl.value.trim();
        }
        _editingBlockIdx = -1;
        rebuildBlockList();
      });
    });

    document.querySelectorAll('.block-btn-del').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(btn.dataset.idx);
        if (!confirm('Remove this block?')) return;
        _editBlocks.splice(idx, 1);
        if (_editingBlockIdx >= _editBlocks.length) _editingBlockIdx = -1;
        rebuildBlockList();
      });
    });

    document.querySelectorAll('.block-btn-up').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(btn.dataset.idx);
        if (idx === 0) return;
        var tmp = _editBlocks[idx - 1];
        _editBlocks[idx - 1] = _editBlocks[idx];
        _editBlocks[idx] = tmp;
        if (_editingBlockIdx === idx) _editingBlockIdx = idx - 1;
        else if (_editingBlockIdx === idx - 1) _editingBlockIdx = idx;
        rebuildBlockList();
      });
    });

    document.querySelectorAll('.block-btn-down').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(btn.dataset.idx);
        if (idx >= _editBlocks.length - 1) return;
        var tmp = _editBlocks[idx + 1];
        _editBlocks[idx + 1] = _editBlocks[idx];
        _editBlocks[idx] = tmp;
        if (_editingBlockIdx === idx) _editingBlockIdx = idx + 1;
        else if (_editingBlockIdx === idx + 1) _editingBlockIdx = idx;
        rebuildBlockList();
      });
    });

    document.querySelectorAll('.block-btn-pick').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(btn.dataset.idx);
        openImagePicker(function(path) {
          _editBlocks[idx].src = path;
          var pathEl = $id('block-path-' + idx);
          if (pathEl) pathEl.textContent = path;
          rebuildBlockList();
        });
      });
    });

    document.querySelectorAll('.block-btn-upload').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (!S.rootHandle) {
          toast('Connect your project folder first — go to Photos and click "Connect folder"', 'error');
          return;
        }
        var idx = parseInt(btn.dataset.idx);
        var inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = function() {
          if (!inp.files[0]) return;
          var file = inp.files[0];
          var previewUrl = URL.createObjectURL(file);
          openImageEditModal(previewUrl, async function(editedBlob) {
            URL.revokeObjectURL(previewUrl);
            showSpinner('Saving image…');
            try {
              var blob = editedBlob || (await resizeImage(file, 1400)).blob;
              var name = slugify(file.name.replace(/\.[^.]+$/, '')) + '.jpg';
              await writeFile('images/' + name, blob);
              await refreshImages();
              toast('Image saved: ' + name, 'success');
              _editBlocks[idx].src = '/images/' + name;
              rebuildBlockList();
            } catch(e) { toast('Upload failed: ' + e.message, 'error'); }
            finally    { hideSpinner(); }
          });
        };
        inp.click();
      });
    });

    document.querySelectorAll('.block-gal-add').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(btn.dataset.idx);
        openImagePicker(function(path) {
          if (!_editBlocks[idx].images) _editBlocks[idx].images = [];
          _editBlocks[idx].images.push({ src: path, caption: '' });
          rebuildBlockList();
        });
      });
    });

    document.querySelectorAll('.block-gal-del').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(btn.dataset.idx);
        var gidx = parseInt(btn.dataset.gidx);
        if (_editBlocks[idx] && _editBlocks[idx].images) {
          _editBlocks[idx].images.splice(gidx, 1);
          rebuildBlockList();
        }
      });
    });

    document.querySelectorAll('.block-fw-pick').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(btn.dataset.idx);
        openImagePicker(function(path) {
          _editBlocks[idx].src = path;
          rebuildBlockList();
        });
      });
    });

    document.querySelectorAll('.block-ba-before-pick').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(btn.dataset.idx);
        openImagePicker(function(path) {
          _editBlocks[idx].before_src = path;
          rebuildBlockList();
        });
      });
    });

    document.querySelectorAll('.block-ba-after-pick').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(btn.dataset.idx);
        openImagePicker(function(path) {
          _editBlocks[idx].after_src = path;
          rebuildBlockList();
        });
      });
    });
  }

  // ═══════════════════════════════════════════════════════════
  // EVENTS
  // ═══════════════════════════════════════════════════════════
  function eventsListHtml() {
    var rows = S.events.map(function(ev) {
      return '<tr>'
        + '<td><img class="admin-img-thumb" src="' + esc(ev.image_path) + '" loading="lazy" onerror="this.style.opacity=0.2"></td>'
        + '<td>' + esc(ev.title) + '</td>'
        + '<td><span class="admin-tag">' + esc(ev.type) + '</span></td>'
        + '<td>' + esc(ev.date_range) + '</td>'
        + '<td>' + esc(ev.location) + '</td>'
        + '<td class="col-actions">'
        + '<button class="admin-btn admin-btn-sm admin-btn-outline btn-edit-event" data-id="' + esc(ev.id) + '">Edit</button>'
        + '<button class="admin-btn admin-btn-sm admin-btn-danger btn-del-event" data-id="' + esc(ev.id) + '">Del</button>'
        + '</td></tr>';
    }).join('');
    return '<div class="admin-section">'
      + '<div class="admin-section-header">'
      + '<h1 class="admin-section-title">Events (' + S.events.length + ')</h1>'
      + '<button class="admin-btn admin-btn-green admin-btn-sm" id="btn-new-event">+ New Event</button>'
      + '</div>'
      + (rows ? '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>'
        + '<th style="width:60px"></th><th>Title</th><th>Type</th><th>Dates</th><th>Location</th><th></th>'
        + '</tr></thead><tbody>' + rows + '</tbody></table></div>'
        : '<div class="admin-empty"><div class="admin-empty-icon">📅</div>No events yet.</div>')
      + '</div>';
  }

  function bindEventsList() {
    var nb = $id('btn-new-event');
    if (nb) nb.addEventListener('click', function() {
      var c = CIRCUITS[0];
      S.editing = { type:'event', item: {
        id:'', slug:'', title:'', circuit:1, circuit_name:c.name, circuit_color:c.color,
        season:'spring', month:'May', date_range:'', location:'', type:'festival',
        excerpt:'', image_path:'', image_gradient: makeGradient(c.color)
      }};
      render();
    });
    document.querySelectorAll('.btn-edit-event').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var ev = S.events.find(function(x){return x.id===btn.dataset.id;});
        if (ev) { S.editing = { type:'event', item: Object.assign({},ev) }; render(); }
      });
    });
    document.querySelectorAll('.btn-del-event').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        if (!confirm('Delete this event?')) return;
        deleteRecord('event', btn.dataset.id);
        try { await saveCollection('event'); toast('Event deleted','success'); } catch(e) { toast('Save error: '+e.message,'error'); return; }
        render();
      });
    });
  }

  function eventEditHtml(ev) {
    var isNew = !ev.id;
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return '<div class="admin-section">'
      + '<a class="admin-back-link" id="back-events">← Events</a>'
      + '<h1 class="admin-section-title">' + (isNew ? 'New Event' : 'Edit Event') + '</h1>'
      + '<form class="admin-form" id="event-form">'
      + '<div class="admin-form-grid">'
      + field('Title', 'text', 'f-title', ev.title)
      + field('Slug', 'text', 'f-slug', ev.slug, false, 'Auto from title')
      + '<div class="admin-field">' + lbl('Circuit') + circuitSelect(ev.circuit) + '</div>'
      + '<div class="admin-field">' + lbl('Season') + optionSelect('f-season', SEASONS, ev.season) + '</div>'
      + '<div class="admin-field">' + lbl('Month') + optionSelect('f-month', months, ev.month) + '</div>'
      + '<div class="admin-field">' + lbl('Type') + optionSelect('f-type', EVENT_TYPES, ev.type) + '</div>'
      + field('Date Range', 'text', 'f-daterange', ev.date_range, false, 'e.g. 14–16 Oct 2026')
      + field('Location', 'text', 'f-location', ev.location)
      + '<div class="admin-field admin-form-full">' + lbl('Excerpt') + '<textarea class="admin-textarea" id="f-excerpt">' + esc(ev.excerpt) + '</textarea></div>'
      + imageFieldHtml(ev.image_path, 'f-image')
      + '<div class="admin-field admin-form-full">' + lbl('Image Gradient CSS') + '<input class="admin-input" id="f-gradient" value="' + esc(ev.image_gradient) + '"><div class="admin-gradient-preview" id="gradient-preview" style="background:' + esc(ev.image_gradient) + '"></div></div>'
      + '</div>'
      + '<div class="admin-form-actions">'
      + '<button type="submit" class="admin-btn admin-btn-primary">Save Event</button>'
      + '<button type="button" class="admin-btn admin-btn-outline" id="cancel-event">Cancel</button>'
      + '</div></form></div>';
  }

  function bindEventEdit() {
    var ev = S.editing.item;
    bindImageField('f-image');
    var titleEl = $id('f-title');
    var slugEl  = $id('f-slug');
    if (titleEl) titleEl.addEventListener('input', function() { if (!ev.id) slugEl.value = slugify(titleEl.value); });
    var gEl = $id('f-gradient'), gPv = $id('gradient-preview');
    if (gEl) gEl.addEventListener('input', function() { if(gPv) gPv.style.background = gEl.value; });
    var cEl = $id('f-circuit');
    if (cEl) cEl.addEventListener('change', function() {
      var c = circuitFor(parseInt(cEl.value));
      if (gEl) { gEl.value = makeGradient(c.color); if(gPv) gPv.style.background = gEl.value; }
    });
    $id('back-events').addEventListener('click', function(e){ e.preventDefault(); S.editing=null; render(); });
    $id('cancel-event').addEventListener('click', function(){ S.editing=null; render(); });
    $id('event-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      var c = circuitFor(parseInt($id('f-circuit').value));
      var rec = Object.assign({}, ev, {
        id:            $id('f-slug').value || slugify($id('f-title').value),
        slug:          $id('f-slug').value || slugify($id('f-title').value),
        title:         $id('f-title').value.trim(),
        circuit:       parseInt($id('f-circuit').value),
        circuit_name:  c.name, circuit_color: c.color,
        season:        $id('f-season').value,
        month:         $id('f-month').value,
        type:          $id('f-type').value,
        date_range:    $id('f-daterange').value.trim(),
        location:      $id('f-location').value.trim(),
        excerpt:       $id('f-excerpt').value.trim(),
        image_path:    getImageFieldValue('f-image'),
        image_gradient:$id('f-gradient').value.trim()
      });
      if (!rec.title) { toast('Title is required','error'); return; }
      upsertRecord('event', rec);
      showSpinner('Saving…');
      try { await saveCollection('event'); toast('Event saved','success'); S.editing=null; render(); }
      catch(e) { toast('Save failed: '+e.message,'error'); }
      finally { hideSpinner(); }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // LOCATIONS
  // ═══════════════════════════════════════════════════════════
  function locationsListHtml() {
    var rows = S.locations.map(function(lo) {
      return '<tr>'
        + '<td>' + esc(lo.name) + '</td>'
        + '<td><span class="admin-tag">' + esc(lo.type) + '</span></td>'
        + '<td>' + esc(circuitFor(lo.circuit).name) + '</td>'
        + '<td>' + (lo.lat ? lo.lat.toFixed(4) + ', ' + lo.lon.toFixed(4) : '—') + '</td>'
        + '<td class="col-actions">'
        + '<button class="admin-btn admin-btn-sm admin-btn-outline btn-edit-loc" data-id="' + esc(lo.id) + '">Edit</button>'
        + '<button class="admin-btn admin-btn-sm admin-btn-danger btn-del-loc" data-id="' + esc(lo.id) + '">Del</button>'
        + '</td></tr>';
    }).join('');
    return '<div class="admin-section">'
      + '<div class="admin-section-header">'
      + '<h1 class="admin-section-title">Locations (' + S.locations.length + ')</h1>'
      + '<button class="admin-btn admin-btn-green admin-btn-sm" id="btn-new-loc">+ New Location</button>'
      + '</div>'
      + (rows ? '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>'
        + '<th>Name</th><th>Type</th><th>Circuit</th><th>Coordinates</th><th></th>'
        + '</tr></thead><tbody>' + rows + '</tbody></table></div>'
        : '<div class="admin-empty"><div class="admin-empty-icon">🗺</div>No locations yet.</div>')
      + '</div>';
  }

  function bindLocationsList() {
    var nb = $id('btn-new-loc');
    if (nb) nb.addEventListener('click', function() {
      S.editing = { type:'location', item: {
        id:'', name:'', circuit:1, circuit_name:CIRCUITS[0].name, circuit_color:CIRCUITS[0].color,
        type:'monastery', lat:41.0, lon:44.6, micro_season:'', hook:'', read_more:''
      }};
      render();
    });
    document.querySelectorAll('.btn-edit-loc').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var lo = S.locations.find(function(x){return x.id===btn.dataset.id;});
        if (lo) { S.editing = { type:'location', item: Object.assign({},lo) }; render(); }
      });
    });
    document.querySelectorAll('.btn-del-loc').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        if (!confirm('Delete this location?')) return;
        deleteRecord('location', btn.dataset.id);
        try { await saveCollection('location'); toast('Location deleted','success'); } catch(e) { toast('Save error: '+e.message,'error'); return; }
        render();
      });
    });
  }

  function locationEditHtml(lo) {
    var storyOptions = '<option value="">— none / custom —</option>'
      + S.stories.map(function(s) {
          var val = '/story/?slug=' + s.slug;
          return '<option value="' + esc(val) + '"' + (lo.read_more===val?' selected':'') + '>' + esc(s.title) + '</option>';
        }).join('');
    return '<div class="admin-section">'
      + '<a class="admin-back-link" id="back-locs">← Locations</a>'
      + '<h1 class="admin-section-title">' + (!lo.id ? 'New Location' : 'Edit Location') + '</h1>'
      + '<form class="admin-form" id="loc-form">'
      + '<div class="admin-form-grid">'
      + field('Name', 'text', 'f-name', lo.name)
      + field('ID / Slug', 'text', 'f-id', lo.id, false, 'Auto from name')
      + '<div class="admin-field">' + lbl('Circuit') + circuitSelect(lo.circuit) + '</div>'
      + '<div class="admin-field">' + lbl('Type') + optionSelect('f-loctype', LOC_TYPES, lo.type) + '</div>'
      + field('Latitude',  'number', 'f-lat', lo.lat, false, null, null, 'step=0.0001')
      + field('Longitude', 'number', 'f-lon', lo.lon, false, null, null, 'step=0.0001')
      + '<div class="admin-field admin-form-full">'
      + lbl('Map — click to set coordinates')
      + '<div class="admin-map-picker" id="loc-map"></div>'
      + '<p class="admin-map-hint">Click anywhere on the map to update lat/lon</p>'
      + '</div>'
      + field('Micro-season', 'text', 'f-microseason', lo.micro_season, false, 'e.g. Late October dawn')
      + '<div class="admin-field">' + lbl('Link to Story') + '<select class="admin-select" id="f-story-link">' + storyOptions + '</select></div>'
      + field('Read More URL', 'text', 'f-readmore', lo.read_more, false, 'Auto-filled from story above or custom')
      + '<div class="admin-field admin-form-full">' + lbl('Hook (1–2 sentences)') + '<textarea class="admin-textarea" id="f-hook">' + esc(lo.hook) + '</textarea></div>'
      + '</div>'
      + '<div class="admin-form-actions">'
      + '<button type="submit" class="admin-btn admin-btn-primary">Save Location</button>'
      + '<button type="button" class="admin-btn admin-btn-outline" id="cancel-loc">Cancel</button>'
      + '</div></form></div>';
  }

  var _locMap = null;
  var _locMarker = null;

  var _editBlocks      = [];   // working copy of blocks while editing a story
  var _editingBlockIdx = -1;  // which block row is expanded for editing

  function bindLocationEdit() {
    var lo = S.editing.item;

    // Auto-id from name
    var nameEl = $id('f-name'), idEl = $id('f-id');
    if (nameEl) nameEl.addEventListener('input', function() { if (!lo.id) idEl.value = slugify(nameEl.value); });

    // Story link → read_more
    var stEl = $id('f-story-link'), rmEl = $id('f-readmore');
    if (stEl) stEl.addEventListener('change', function() { if (stEl.value && rmEl) rmEl.value = stEl.value; });

    $id('back-locs').addEventListener('click', function(e){ e.preventDefault(); S.editing=null; if(_locMap){_locMap.remove();_locMap=null;} render(); });
    $id('cancel-loc').addEventListener('click', function(){ S.editing=null; if(_locMap){_locMap.remove();_locMap=null;} render(); });

    // Leaflet map picker
    if (window.L) {
      var lat = parseFloat(lo.lat) || 41.0;
      var lon = parseFloat(lo.lon) || 44.6;
      _locMap = L.map('loc-map', { zoomControl: true }).setView([lat, lon], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap', maxZoom: 18
      }).addTo(_locMap);
      _locMarker = L.marker([lat, lon]).addTo(_locMap);
      _locMap.on('click', function(e) {
        var la = e.latlng.lat.toFixed(5);
        var ln = e.latlng.lng.toFixed(5);
        $id('f-lat').value = la;
        $id('f-lon').value = ln;
        _locMarker.setLatLng([la, ln]);
      });
    }

    $id('loc-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      if (_locMap) { _locMap.remove(); _locMap = null; }
      var c = circuitFor(parseInt($id('f-circuit').value));
      var rec = Object.assign({}, lo, {
        id:            $id('f-id').value || slugify($id('f-name').value),
        name:          $id('f-name').value.trim(),
        circuit:       parseInt($id('f-circuit').value),
        circuit_name:  c.name, circuit_color: c.color,
        type:          $id('f-loctype').value,
        lat:           parseFloat($id('f-lat').value) || 41.0,
        lon:           parseFloat($id('f-lon').value) || 44.6,
        micro_season:  $id('f-microseason').value.trim(),
        hook:          $id('f-hook').value.trim(),
        read_more:     $id('f-readmore').value.trim()
      });
      if (!rec.name) { toast('Name is required','error'); return; }
      upsertRecord('location', rec);
      showSpinner('Saving…');
      try { await saveCollection('location'); toast('Location saved','success'); S.editing=null; render(); }
      catch(e) { toast('Save failed: '+e.message,'error'); }
      finally { hideSpinner(); }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // PHOTOS
  // ═══════════════════════════════════════════════════════════
  function photosHtml() {
    var connected = !!S.rootHandle;
    return '<div class="admin-section">'
      + '<div class="admin-section-header">'
      + '<h1 class="admin-section-title">Photos (' + S.images.length + ')</h1>'
      + '</div>'
      + (connected
          ? '<div class="admin-folder-connected">✓ Folder connected — <span id="btn-disconnect" style="cursor:pointer;text-decoration:underline">Disconnect</span></div>'
          : '<div class="admin-folder-banner">'
            + '<div class="admin-folder-banner-icon">📁</div>'
            + '<div>'
            + '<strong>Connect your project folder first</strong><br>'
            + '<small>Select the <code>v1.01</code> folder inside <code>LORI WEBSITE</code> on your Desktop. You only need to do this once per session.</small>'
            + '</div>'
            + '<button class="admin-btn admin-btn-primary" id="btn-connect-folder">Connect folder</button>'
            + '</div>')
      + (connected
          ? '<div class="admin-upload-zone" id="upload-zone">'
            + '<div style="font-size:2rem">📷</div>'
            + '<p>Click to upload photos, or drag &amp; drop</p>'
            + '<small>JPEG/PNG — auto-resized to 1400px wide · 88% quality</small>'
            + '</div>'
          : '')
      + '<div class="admin-photo-grid" id="photo-grid">'
      + S.images.map(function(name) {
          return '<div class="admin-photo-card">'
            + '<img class="admin-photo-img" src="/images/' + esc(name) + '" loading="lazy" onerror="this.style.background=\'#E8EBF0\'">'
            + '<p class="admin-photo-name" title="' + esc(name) + '">' + esc(name) + '</p>'
            + '<div class="admin-photo-actions">'
            + '<button class="admin-btn admin-btn-sm admin-btn-outline btn-copy-path" data-path="/images/' + esc(name) + '">Copy</button>'
            + '</div></div>';
        }).join('')
      + '</div></div>';
  }

  function bindPhotos() {
    // Connect folder button
    var connectBtn = $id('btn-connect-folder');
    if (connectBtn) {
      connectBtn.addEventListener('click', async function() {
        try {
          await getRoot();
          await refreshImages();
          render();
        } catch(e) {
          toast(e.message || 'Folder access cancelled', 'error');
        }
      });
    }

    var disconnectBtn = $id('btn-disconnect');
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', function() {
        S.rootHandle = null; S.images = []; render();
      });
    }

    // Upload zone click — only shown when folder connected
    var zone = $id('upload-zone');
    if (zone) {
      zone.addEventListener('click', function() {
        var inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
        inp.onchange = function() { handlePhotoUpload(Array.from(inp.files)); };
        inp.click();
      });
      // Drag & drop
      zone.addEventListener('dragover', function(e){ e.preventDefault(); zone.classList.add('drag-over'); });
      zone.addEventListener('dragleave', function(){ zone.classList.remove('drag-over'); });
      zone.addEventListener('drop', function(e){
        e.preventDefault(); zone.classList.remove('drag-over');
        handlePhotoUpload(Array.from(e.dataTransfer.files).filter(function(f){return f.type.startsWith('image/');}));
      });
    }

    // Copy path
    document.querySelectorAll('.btn-copy-path').forEach(function(btn) {
      btn.addEventListener('click', function() {
        navigator.clipboard.writeText(btn.dataset.path).then(function(){ toast('Copied: ' + btn.dataset.path, 'success'); });
      });
    });
  }

  async function handlePhotoUpload(files) {
    if (!files.length) return;
    for (var i = 0; i < files.length; i++) {
      await uploadImageFile(files[i], null);
    }
    render();
  }

  // ── Form field helpers ────────────────────────────────────────
  function lbl(text) {
    return '<label class="admin-label">' + text + '</label>';
  }
  function field(label, type, id, val, readonly, hint, extraClass, extraAttrs) {
    var cls = 'admin-field' + (extraClass ? ' ' + extraClass : '');
    return '<div class="' + cls + '">'
      + lbl(label)
      + '<input class="admin-input' + (readonly ? ' admin-input-readonly' : '') + '" type="' + type + '" id="' + id + '" value="' + esc(val) + '"' + (readonly ? ' readonly' : '') + (extraAttrs ? ' ' + extraAttrs : '') + '>'
      + (hint ? '<small style="font-size:0.75rem;color:#6B7A8A">' + hint + '</small>' : '')
      + '</div>';
  }

  // ── Init ──────────────────────────────────────────────────────
  async function init() {
    // Sidebar nav
    document.querySelectorAll('.admin-nav-link').forEach(function(a) {
      a.addEventListener('click', function(e) {
        e.preventDefault();
        if (_locMap) { _locMap.remove(); _locMap = null; }
        setSection(a.dataset.section);
      });
    });

    // Sidebar buttons
    var btnSave = $id('btn-save-version');
    var btnDep  = $id('btn-deploy');
    if (btnSave) btnSave.addEventListener('click', saveVersion);
    if (btnDep)  btnDep.addEventListener('click', deploy);

    // Load data
    showSpinner('Loading…');
    await loadData();
    hideSpinner();
    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
