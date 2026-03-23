/* stays-ui.js — Stays content management */
(function () {
  'use strict';

  const panel   = document.getElementById('editPanel');
  const overlay = document.getElementById('overlay');
  const tbody   = document.getElementById('tableBody');

  let items = [];
  let editingId = null;
  let amenities = [];

  const F = {
    name:       () => document.getElementById('fName'),
    type:       () => document.getElementById('fType'),
    village:    () => document.getElementById('fVillage'),
    region:     () => document.getElementById('fRegion'),
    excerpt:    () => document.getElementById('fExcerpt'),
    priceRange: () => document.getElementById('fPriceRange'),
    bookingUrl: () => document.getElementById('fBookingUrl'),
    website:    () => document.getElementById('fWebsite'),
    image:      () => document.getElementById('fImage'),
    featured:   () => document.getElementById('fFeatured'),
    imgPreview: () => document.getElementById('fImgPreview'),
    imageUpload:() => document.getElementById('fImageUpload'),
    amenityList:() => document.getElementById('amenityList'),
  };

  async function loadItems() {
    try {
      items = await AdminCore.api('GET', '/stays');
      renderTable();
    } catch (e) {
      AdminCore.toast('Failed to load stays: ' + e.message, 'error');
    }
  }

  function renderTable() {
    tbody.innerHTML = '';
    items.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.name || '—'}</td>
        <td>${item.type || '—'}</td>
        <td>${item.village || '—'}</td>
        <td>${item.region || '—'}</td>
        <td>${item.priceRange || '—'}</td>
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

  // ── Amenities ────────────────────────────────────────────────────────────────
  function renderAmenities() {
    const list = F.amenityList();
    list.innerHTML = '';
    amenities.forEach((val, idx) => {
      const row = document.createElement('div');
      row.className = 'amenity-row';
      row.innerHTML = `
        <input class="form-input amenity-input" type="text" value="${val}">
        <button class="btn btn--sm amenity-remove" type="button" data-idx="${idx}">✕</button>`;
      row.querySelector('.amenity-input').addEventListener('input', (e) => {
        amenities[idx] = e.target.value;
      });
      row.querySelector('.amenity-remove').addEventListener('click', () => {
        amenities.splice(idx, 1);
        renderAmenities();
      });
      list.appendChild(row);
    });
  }

  document.getElementById('btnAddAmenity').addEventListener('click', () => {
    amenities.push('');
    renderAmenities();
    // Focus the new input
    const inputs = F.amenityList().querySelectorAll('.amenity-input');
    if (inputs.length) inputs[inputs.length - 1].focus();
  });

  // ── Panel open/close ─────────────────────────────────────────────────────────
  function openNew() {
    editingId = null;
    amenities = [];
    document.getElementById('panelTitle').textContent = 'New Stay';
    document.getElementById('btnDelete').style.display = 'none';
    clearForm();
    AdminCore.openPanel(panel, overlay);
  }

  function openEdit(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    editingId = id;
    amenities = Array.isArray(item.amenities) ? [...item.amenities] : [];
    document.getElementById('panelTitle').textContent = 'Edit Stay';
    document.getElementById('btnDelete').style.display = '';
    fillForm(item);
    AdminCore.openPanel(panel, overlay);
  }

  function clearForm() {
    F.name().value = '';
    F.type().value = 'guesthouse';
    F.village().value = '';
    F.region().value = '';
    F.excerpt().value = '';
    F.priceRange().value = '';
    F.bookingUrl().value = '';
    F.website().value = '';
    F.image().value = '';
    F.featured().checked = false;
    F.imgPreview().style.display = 'none';
    F.imgPreview().src = '';
    amenities = [];
    renderAmenities();
  }

  function fillForm(item) {
    F.name().value       = item.name || '';
    F.type().value       = item.type || 'guesthouse';
    F.village().value    = item.village || '';
    F.region().value     = item.region || '';
    F.excerpt().value    = item.excerpt || '';
    F.priceRange().value = item.priceRange || '';
    F.bookingUrl().value = item.bookingUrl || '';
    F.website().value    = item.website || '';
    F.image().value      = item.image || '';
    F.featured().checked = !!item.featured;
    if (item.image) {
      F.imgPreview().src = item.image;
      F.imgPreview().style.display = 'block';
    } else {
      F.imgPreview().style.display = 'none';
    }
    renderAmenities();
  }

  function collectForm() {
    return {
      name:       F.name().value.trim(),
      type:       F.type().value,
      village:    F.village().value.trim(),
      region:     F.region().value.trim(),
      excerpt:    F.excerpt().value.trim(),
      priceRange: F.priceRange().value.trim(),
      bookingUrl: F.bookingUrl().value.trim(),
      website:    F.website().value.trim(),
      amenities:  amenities.filter(a => a.trim()),
      image:      F.image().value.trim(),
      featured:   F.featured().checked,
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
    if (!body.name) { AdminCore.toast('Name is required', 'error'); return; }
    try {
      if (editingId) {
        await AdminCore.api('PUT', '/stays/' + editingId, body);
      } else {
        await AdminCore.api('POST', '/stays', body);
      }
      AdminCore.toast('Saved!', 'success');
      AdminCore.closePanel(panel, overlay);
      await loadItems();
      if (andRebuild) {
        const res = await AdminCore.api('POST', '/build/stays');
        AdminCore.toast('Stays page rebuilt (' + (res.injected||0) + ' cards)', 'success');
      }
    } catch (e) {
      AdminCore.toast('Save error: ' + e.message, 'error');
    }
  }

  document.getElementById('btnDelete').addEventListener('click', async () => {
    if (!editingId) return;
    const ok = await AdminCore.confirm('Delete this stay? This cannot be undone.');
    if (!ok) return;
    try {
      await AdminCore.api('DELETE', '/stays/' + editingId);
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
