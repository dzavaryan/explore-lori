/* events-ui.js — Events content management */
(function () {
  'use strict';

  const panel   = document.getElementById('editPanel');
  const overlay = document.getElementById('overlay');
  const tbody   = document.getElementById('tableBody');

  let items = [];
  let editingId = null;

  const F = {
    title:      () => document.getElementById('fTitle'),
    category:   () => document.getElementById('fCategory'),
    day:        () => document.getElementById('fDay'),
    month:      () => document.getElementById('fMonth'),
    year:       () => document.getElementById('fYear'),
    location:   () => document.getElementById('fLocation'),
    description:() => document.getElementById('fDescription'),
    url:        () => document.getElementById('fUrl'),
    image:      () => document.getElementById('fImage'),
    imgPreview: () => document.getElementById('fImgPreview'),
    imageUpload:() => document.getElementById('fImageUpload'),
  };

  async function loadItems() {
    try {
      items = await AdminCore.api('GET', '/events');
      renderTable();
    } catch (e) {
      AdminCore.toast('Failed to load events: ' + e.message, 'error');
    }
  }

  function renderTable() {
    tbody.innerHTML = '';
    items.forEach(item => {
      const tr = document.createElement('tr');
      const dateStr = [item.day, item.month, item.year].filter(Boolean).join(' ');
      tr.innerHTML = `
        <td>${item.title || '—'}</td>
        <td>${item.category || '—'}</td>
        <td>${dateStr || '—'}</td>
        <td>${item.location || '—'}</td>
        <td class="table-actions">
          <button class="btn btn--sm btn--secondary btn-edit" data-id="${item.id}">Edit</button>
        </td>`;
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => openEdit(btn.dataset.id));
    });
  }

  function openNew() {
    editingId = null;
    document.getElementById('panelTitle').textContent = 'New Event';
    document.getElementById('btnDelete').style.display = 'none';
    clearForm();
    AdminCore.openPanel(panel, overlay);
  }

  function openEdit(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    editingId = id;
    document.getElementById('panelTitle').textContent = 'Edit Event';
    document.getElementById('btnDelete').style.display = '';
    fillForm(item);
    AdminCore.openPanel(panel, overlay);
  }

  function clearForm() {
    F.title().value = '';
    F.category().value = 'Food & Foraging';
    F.day().value = '';
    F.month().value = 'Jan';
    F.year().value = new Date().getFullYear();
    F.location().value = '';
    F.description().value = '';
    F.url().value = '';
    F.image().value = '';
    F.imgPreview().style.display = 'none';
    F.imgPreview().src = '';
  }

  function fillForm(item) {
    F.title().value       = item.title || '';
    F.category().value    = item.category || 'Food & Foraging';
    F.day().value         = item.day || '';
    F.month().value       = item.month || 'Jan';
    F.year().value        = item.year || new Date().getFullYear();
    F.location().value    = item.location || '';
    F.description().value = item.description || '';
    F.url().value         = item.url || '';
    F.image().value       = item.image || '';
    if (item.image) {
      F.imgPreview().src = item.image;
      F.imgPreview().style.display = 'block';
    } else {
      F.imgPreview().style.display = 'none';
    }
  }

  function collectForm() {
    return {
      title:       F.title().value.trim(),
      category:    F.category().value,
      day:         F.day().value.trim(),
      month:       F.month().value,
      year:        parseInt(F.year().value, 10) || new Date().getFullYear(),
      location:    F.location().value.trim(),
      description: F.description().value.trim(),
      url:         F.url().value.trim(),
      image:       F.image().value.trim(),
    };
  }

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

  async function saveItem(andRebuild) {
    const body = collectForm();
    if (!body.title) { AdminCore.toast('Title is required', 'error'); return; }
    try {
      if (editingId) {
        await AdminCore.api('PUT', '/events/' + editingId, body);
      } else {
        await AdminCore.api('POST', '/events', body);
      }
      AdminCore.toast('Saved!', 'success');
      AdminCore.closePanel(panel, overlay);
      await loadItems();
      if (andRebuild) {
        const res = await AdminCore.api('POST', '/build/events');
        AdminCore.toast('Events page rebuilt (' + (res.injected||0) + ' events)', 'success');
      }
    } catch (e) {
      AdminCore.toast('Save error: ' + e.message, 'error');
    }
  }

  document.getElementById('btnDelete').addEventListener('click', async () => {
    if (!editingId) return;
    const ok = await AdminCore.confirm('Delete this event? This cannot be undone.');
    if (!ok) return;
    try {
      await AdminCore.api('DELETE', '/events/' + editingId);
      AdminCore.toast('Deleted', 'success');
      AdminCore.closePanel(panel, overlay);
      await loadItems();
    } catch (e) {
      AdminCore.toast('Delete error: ' + e.message, 'error');
    }
  });

  document.getElementById('btnNew').addEventListener('click', openNew);
  document.getElementById('btnClose').addEventListener('click', () => AdminCore.closePanel(panel, overlay));
  overlay.addEventListener('click', () => AdminCore.closePanel(panel, overlay));
  document.getElementById('btnSave').addEventListener('click', () => saveItem(false));
  document.getElementById('btnSaveRebuild').addEventListener('click', () => saveItem(true));

  loadItems();
})();
