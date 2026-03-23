/* discover-ui.js — Discover content management */
(function () {
  'use strict';

  const API      = '/api/discover';
  const REBUILD  = '/api/build/discover';
  const panel    = document.getElementById('editPanel');
  const overlay  = document.getElementById('overlay');
  const tbody    = document.getElementById('tableBody');

  let items = [];
  let editingId = null;

  // ── Fields ──────────────────────────────────────────────────────────────────
  const F = {
    title:     () => document.getElementById('fTitle'),
    slug:      () => document.getElementById('fSlug'),
    excerpt:   () => document.getElementById('fExcerpt'),
    type:      () => document.getElementById('fType'),
    region:    () => document.getElementById('fRegion'),
    season:    () => document.getElementById('fSeason'),
    difficulty:() => document.getElementById('fDifficulty'),
    circuit:   () => document.getElementById('fCircuit'),
    duration:  () => document.getElementById('fDuration'),
    distance:  () => document.getElementById('fDistance'),
    elevation: () => document.getElementById('fElevation'),
    image:     () => document.getElementById('fImage'),
    featured:  () => document.getElementById('fFeatured'),
    imgPreview:() => document.getElementById('fImgPreview'),
    imageUpload:()=> document.getElementById('fImageUpload'),
  };

  // ── Load & render table ──────────────────────────────────────────────────────
  async function loadItems() {
    try {
      items = await AdminCore.api('GET', '/discover');
      renderTable();
    } catch (e) {
      AdminCore.toast('Failed to load discover items: ' + e.message, 'error');
    }
  }

  function renderTable() {
    tbody.innerHTML = '';
    items.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.title || '—'}</td>
        <td>${item.type || '—'}</td>
        <td>${item.region || '—'}</td>
        <td>${item.season || '—'}</td>
        <td>${item.difficulty || '—'}</td>
        <td>${item.circuit || '—'}</td>
        <td>${item.featured ? '★' : ''}</td>
        <td class="table-actions">
          <button class="btn btn--sm btn--secondary btn-edit" data-id="${item.id}">Edit</button>
        </td>`;
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => openEdit(btn.dataset.id));
    });
  }

  // ── Open panel ───────────────────────────────────────────────────────────────
  function openNew() {
    editingId = null;
    document.getElementById('panelTitle').textContent = 'New Item';
    document.getElementById('btnDelete').style.display = 'none';
    clearForm();
    AdminCore.openPanel(panel, overlay);
  }

  function openEdit(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    editingId = id;
    document.getElementById('panelTitle').textContent = 'Edit Item';
    document.getElementById('btnDelete').style.display = '';
    fillForm(item);
    AdminCore.openPanel(panel, overlay);
  }

  function clearForm() {
    F.title().value = '';
    F.slug().value = '';
    F.excerpt().value = '';
    F.type().value = 'place';
    F.region().value = '';
    F.season().value = 'spring';
    F.difficulty().value = 'easy';
    F.circuit().value = 'monastery';
    F.duration().value = '';
    F.distance().value = '';
    F.elevation().value = '';
    F.image().value = '';
    F.featured().checked = false;
    F.imgPreview().style.display = 'none';
    F.imgPreview().src = '';
  }

  function fillForm(item) {
    F.title().value     = item.title || '';
    F.slug().value      = item.slug || '';
    F.excerpt().value   = item.excerpt || '';
    F.type().value      = item.type || 'place';
    F.region().value    = item.region || '';
    F.season().value    = item.season || 'spring';
    F.difficulty().value= item.difficulty || 'easy';
    F.circuit().value   = item.circuit || 'monastery';
    F.duration().value  = item.duration || '';
    F.distance().value  = item.distance || '';
    F.elevation().value = item.elevation || '';
    F.image().value     = item.image || '';
    F.featured().checked= !!item.featured;
    if (item.image) {
      F.imgPreview().src = item.image;
      F.imgPreview().style.display = 'block';
    } else {
      F.imgPreview().style.display = 'none';
    }
  }

  function collectForm() {
    return {
      title:      F.title().value.trim(),
      slug:       F.slug().value.trim(),
      excerpt:    F.excerpt().value.trim(),
      type:       F.type().value,
      region:     F.region().value.trim(),
      season:     F.season().value,
      difficulty: F.difficulty().value,
      circuit:    F.circuit().value,
      duration:   F.duration().value.trim(),
      distance:   F.distance().value.trim(),
      elevation:  F.elevation().value.trim(),
      image:      F.image().value.trim(),
      featured:   F.featured().checked,
    };
  }

  // ── Image upload ─────────────────────────────────────────────────────────────
  F.imageUpload().addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      F.image().value = data.path;
      F.imgPreview().src = data.path;
      F.imgPreview().style.display = 'block';
      AdminCore.toast('Image uploaded', 'success');
    } catch (e) {
      AdminCore.toast('Upload error: ' + e.message, 'error');
    }
  });

  F.image().addEventListener('input', () => {
    const v = F.image().value.trim();
    F.imgPreview().src = v;
    F.imgPreview().style.display = v ? 'block' : 'none';
  });

  // ── Save ─────────────────────────────────────────────────────────────────────
  async function saveItem(andRebuild) {
    const body = collectForm();
    if (!body.title) { AdminCore.toast('Title is required', 'error'); return; }
    try {
      if (editingId) {
        await AdminCore.api('PUT', '/discover/' + editingId, body);
      } else {
        await AdminCore.api('POST', '/discover', body);
      }
      AdminCore.toast('Saved!', 'success');
      AdminCore.closePanel(panel, overlay);
      await loadItems();
      if (andRebuild) {
        const res = await AdminCore.api('POST', '/build/discover');
        AdminCore.toast('Discover page rebuilt (' + (res.injected||0) + ' cards)', 'success');
      }
    } catch (e) {
      AdminCore.toast('Save error: ' + e.message, 'error');
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  document.getElementById('btnDelete').addEventListener('click', async () => {
    if (!editingId) return;
    const ok = await AdminCore.confirm('Delete this item? This cannot be undone.');
    if (!ok) return;
    try {
      await AdminCore.api('DELETE', '/discover/' + editingId);
      AdminCore.toast('Deleted', 'success');
      AdminCore.closePanel(panel, overlay);
      await loadItems();
    } catch (e) {
      AdminCore.toast('Delete error: ' + e.message, 'error');
    }
  });

  // ── Event wiring ─────────────────────────────────────────────────────────────
  document.getElementById('btnNew').addEventListener('click', openNew);
  document.getElementById('btnClose').addEventListener('click', () => AdminCore.closePanel(panel, overlay));
  overlay.addEventListener('click', () => AdminCore.closePanel(panel, overlay));
  document.getElementById('btnSave').addEventListener('click', () => saveItem(false));
  document.getElementById('btnSaveRebuild').addEventListener('click', () => saveItem(true));

  // Auto-slug from title
  F.title().addEventListener('input', () => {
    if (!editingId) {
      F.slug().value = F.title().value
        .toLowerCase().trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
  });

  loadItems();
})();
