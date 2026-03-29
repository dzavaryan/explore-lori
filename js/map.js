(function () {
  'use strict';

  // ── 1. CIRCUIT CONFIGURATION ──────────────────────────────────────────────
  var CIRCUITS = [
    { id: 1, name: 'Monastery Plateau',      color: '#8B3A28' },
    { id: 2, name: "Poet's Highlands",       color: '#3A7055' },
    { id: 3, name: 'Fortress Plateau',       color: '#4A5A6A' },
    { id: 4, name: 'Deep Gorges',            color: '#B8943A' },
    { id: 5, name: 'Gugark Forest Corridor', color: '#3A4A6A' },
    { id: 6, name: 'Northern Steppe',        color: '#8A7A6A' },
    { id: 7, name: 'Resilience Valley',      color: '#5A6A5A' }
  ];

  // ── 2. INITIALISE MAP ─────────────────────────────────────────────────────
  var map = L.map('map', {
    center: [40.95, 44.55],
    zoom: 10,
    zoomControl: true
  });

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // ── 3. STATE ──────────────────────────────────────────────────────────────
  var allMarkers = [];
  var activeCircuit = 'all';

  // ── 4. BUILD FILTER BAR ───────────────────────────────────────────────────
  function buildFilterBar() {
    var bar = document.getElementById('filter-bar');
    bar.innerHTML = '';

    var allBtn = document.createElement('button');
    allBtn.className = 'filter-btn';
    allBtn.dataset.circuit = 'all';
    allBtn.textContent = 'All Circuits';
    allBtn.style.backgroundColor = '#3A5A3A';
    allBtn.addEventListener('click', function () { setCircuit('all'); });
    bar.appendChild(allBtn);

    CIRCUITS.forEach(function (c) {
      var btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.dataset.circuit = String(c.id);
      btn.textContent = c.name;
      btn.style.backgroundColor = c.color;
      btn.addEventListener('click', function () { setCircuit(String(c.id)); });
      bar.appendChild(btn);
    });
  }

  // ── 5. FILTER LOGIC ───────────────────────────────────────────────────────
  function setCircuit(circuitStr) {
    activeCircuit = circuitStr;

    allMarkers.forEach(function (item) {
      if (circuitStr === 'all' || String(item.location.circuit) === circuitStr) {
        item.marker.addTo(map);
      } else {
        item.marker.remove();
      }
    });

    document.querySelectorAll('.filter-btn').forEach(function (btn) {
      btn.classList.toggle('inactive', btn.dataset.circuit !== circuitStr);
    });

    closePanel();
  }

  // ── 6. DETAIL PANEL ───────────────────────────────────────────────────────
  function openPanel(loc) {
    var panel = document.getElementById('detail-panel');
    var body = document.getElementById('panel-body');
    var circuitObj = CIRCUITS.find(function (c) { return c.id === loc.circuit; });
    var color = circuitObj ? circuitObj.color : '#3A5A3A';

    body.innerHTML =
      '<p class="panel-type">' + escHtml(loc.type) + '</p>' +
      '<h2 class="panel-name">' + escHtml(loc.name) + '</h2>' +
      '<span class="circuit-badge" style="background:' + color + ';margin-bottom:0.75rem;display:inline-block;">' +
        escHtml(loc.circuit_name) +
      '</span>' +
      '<p class="panel-season">Best time: ' + escHtml(loc.micro_season) + '</p>' +
      '<p class="panel-hook">' + escHtml(loc.hook) + '</p>' +
      '<div class="panel-read-more"><a href="' + escHtml(loc.read_more) + '" class="btn btn-primary">Read More</a></div>';

    panel.classList.add('open');
  }

  function closePanel() {
    document.getElementById('detail-panel').classList.remove('open');
  }

  document.getElementById('panel-close').addEventListener('click', closePanel);

  // ── 7. MARKER CREATION ────────────────────────────────────────────────────
  function createMarker(loc) {
    var circuitObj = CIRCUITS.find(function (c) { return c.id === loc.circuit; });
    var color = circuitObj ? circuitObj.color : '#3A5A3A';

    var marker = L.circleMarker([loc.lat, loc.lon], {
      radius: 9,
      fillColor: color,
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9
    });

    marker.bindTooltip(loc.name, {
      permanent: false,
      direction: 'top',
      offset: [0, -10]
    });

    marker.on('click', function () { openPanel(loc); });

    return marker;
  }

  // ── 8. HTML ESCAPE UTILITY ────────────────────────────────────────────────
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── 9. LOAD LOCATIONS & BOOT ──────────────────────────────────────────────
  fetch('/data/locations.json')
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (locations) {
      locations.forEach(function (loc) {
        var marker = createMarker(loc);
        marker.addTo(map);
        allMarkers.push({ marker: marker, location: loc });
      });
      buildFilterBar();
    })
    .catch(function (err) {
      console.error('Failed to load locations.json:', err);
      document.getElementById('filter-bar').innerHTML =
        '<p style="color:#8C4A2A;font-size:0.875rem;padding:0.5rem;">Map data unavailable. Please refresh.</p>';
    });

})();
