// MTB Trails Mapper - main UI logic
// -------------------------------------------------
let map;
let trailLayers = L.featureGroup();
let allTrailsData = [];

// Quick WKT builder state
let wktPoints = [];        // stores [lng, lat]
let tempLineLayer = null;  // preview polyline

// -------------------------------------------------
// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  initializeMap();
  loadTrails();
  setupEventListeners();
});

// -------------------------------------------------
// Map init
function initializeMap() {
  map = L.map('map', { zoomControl: true, attributionControl: true })
          .setView([53.35, -7.5], 12); // Ireland

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors | MTB Trails Ireland',
    maxZoom: 18
  }).addTo(map);

  L.control.scale({ position: 'bottomleft' }).addTo(map);
  trailLayers.addTo(map);

  // Live coordinates HUD (optional element in template)
  map.on('mousemove', (e) => {
    const hud = document.getElementById('map-coordinates');
    if (hud) hud.textContent = `Coords: ${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
  });

  // Click-to-build WKT LineString
  map.on('click', (e) => {
    const lng = e.latlng.lng;
    const lat = e.latlng.lat;
    wktPoints.push([lng, lat]); // store WKT order

    // Draw / update preview polyline
    const latlngs = wktPoints.map(([x, y]) => [y, x]);
    if (tempLineLayer) {
      tempLineLayer.setLatLngs(latlngs);
    } else {
      tempLineLayer = L.polyline(latlngs, { color: '#0d6efd', weight: 3, dashArray: '6,4' })
        .addTo(map);
    }

    // Write WKT into the textarea
    const textarea = document.getElementById('trail-path');
    if (textarea) {
      const coordsWkt = wktPoints.map(([x, y]) => `${x.toFixed(6)} ${y.toFixed(6)}`).join(', ');
      textarea.value = `LINESTRING(${coordsWkt})`;
    }
  });

  // ESC clears the temporary line + points
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') clearWktBuilder();
  });
}

// Helper to clear the WKT builder + preview
function clearWktBuilder(silent = false) {
  wktPoints = [];
  if (tempLineLayer) {
    map.removeLayer(tempLineLayer);
    tempLineLayer = null;
  }
  const textarea = document.getElementById('trail-path');
  if (textarea) textarea.value = '';
  if (!silent) showAlert('WKT builder cleared.', 'info');
}

// -------------------------------------------------
// Load data
function loadTrails() {
  showLoading(true);

  fetch('/api/trails/geojson/')
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      // Accept correct FC or the “double-wrapped” FC we saw earlier
      let features = [];
      if (data?.type === 'FeatureCollection' && Array.isArray(data.features)) {
        features = data.features;
      } else if (data?.features?.type === 'FeatureCollection' && Array.isArray(data.features.features)) {
        features = data.features.features;
      } else {
        throw new Error('Unexpected GeoJSON format from /api/trails/geojson/');
      }

      allTrailsData = features;
      displayTrailsOnMap(allTrailsData);
      updateTrailCount(allTrailsData.length);
    })
    .catch(err => {
      console.error('Load failed:', err);
      showAlert(`Error loading trails: ${err.message}`, 'danger');
    })
    .finally(() => showLoading(false));
}

// -------------------------------------------------
// Render
function displayTrailsOnMap(trails) {
  trailLayers.clearLayers();

  trails.forEach(trail => {
    try {
      const { geometry, properties } = trail;
      if (!geometry || geometry.type !== 'LineString' ||
          !Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2) {
        console.warn('Invalid trail geometry:', properties?.name, geometry);
        return;
      }

      // Leaflet expects [lat, lng]
      const latlngs = geometry.coordinates.map(([lng, lat]) => [lat, lng]);

      const diff = String(properties?.difficulty || '').toLowerCase();
      const color = diff === 'beginner' ? 'green'
                  : diff === 'intermediate' ? 'blue'
                  : 'red';

      const poly = L.polyline(latlngs, { className: 'trail-line', color, weight: 5, opacity: 0.8 })
        .bindPopup(createPopupContent(properties))
        .addTo(trailLayers);

      poly.trailData = properties;
      poly.on('click', () => showTrailInfo(properties));
    } catch (err) {
      console.error('Render error:', err);
    }
  });

  if (trails.length > 0) {
    const bounds = trailLayers.getBounds();
    if (bounds.isValid()) map.fitBounds(bounds.pad(0.1));
  }
}

function createPopupContent(trail) {
  const id = trail.id ?? '';
  const name = trail.name || 'Unknown Trail';
  const diff = trail.difficulty || 'Unknown';
  const len = trail.length_km ?? 'Unknown';
  const gain = trail.elevation_gain_m ?? 'Unknown';

  return `
    <div class="trail-popup">
      <h6>${name}</h6>
      <p><strong>Difficulty:</strong> ${diff}</p>
      <p><strong>Length:</strong> ${len} km</p>
      <p><strong>Elevation Gain:</strong> ${gain} m</p>
      <button class="btn btn-sm btn-primary" onclick="zoomToTrail('${id}')">Zoom to Trail</button>
    </div>
  `;
}

// -------------------------------------------------
// Add trail
function saveNewTrail() {
  const name = document.getElementById('trail-name')?.value.trim();
  const difficulty = document.getElementById('trail-difficulty')?.value;
  const length_km = parseFloat(document.getElementById('trail-length')?.value);
  const elevation_gain_m = parseFloat(document.getElementById('trail-elevation')?.value);
  const wkt = (document.getElementById('trail-path')?.value || '').trim();

  // basic WKT sanity: "LINESTRING(lon lat, lon lat, ...)" with >=2 points
  const isLineString = /^LINESTRING\s*\(\s*-?\d+(\.\d+)?\s+-?\d+(\.\d+)?(\s*,\s*-?\d+(\.\d+)?\s+-?\d+(\.\d+)?)+\s*\)$/i.test(wkt);
  if (!isLineString) {
    showAlert('Please enter a valid WKT LINESTRING with at least two points (lon lat, lon lat).', 'warning');
    return;
  }
  if (!name || !difficulty || isNaN(length_km) || isNaN(elevation_gain_m)) {
    showAlert('Please fill all required fields.', 'warning');
    return;
  }

  const payload = { name, difficulty, length_km, elevation_gain_m, path_wkt: wkt };

  showLoading(true);
  fetch('/api/trails/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken()
    },
    body: JSON.stringify(payload)
  })
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(() => {
      showAlert('Trail added successfully!', 'success');

      // Hide modal if open
      const modalEl = document.getElementById('addTrailModal');
      if (modalEl) {
        const instance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        instance.hide();
      }

      // Reset both forms if present
      document.getElementById('quick-add-form')?.reset();
      document.getElementById('add-trail-form')?.reset();

      clearWktBuilder(true); // clear preview + textarea quietly
      loadTrails();
    })
    .catch(err => {
      console.error('Save trail failed:', err);
      showAlert('Error saving trail.', 'danger');
    })
    .finally(() => showLoading(false));
}

// -------------------------------------------------
// Search (server, then fallback client)
function performSearch() {
  const input = document.getElementById('trail-search');
  const diffSel = document.getElementById('difficulty-filter');
  const query = (input?.value || '').trim();
  const diff = String(diffSel?.value || '').toLowerCase();

  // If neither filter set, just reset
  if (!query && !diff) {
    displayTrailsOnMap(allTrailsData);
    updateTrailCount(allTrailsData.length);
    return;
  }

  showLoading(true);

  // Try server-side search if available
  fetch(`/api/trails/search/?q=${encodeURIComponent(query || diff)}`)
    .then(r => {
      if (!r.ok) throw new Error('Search endpoint unavailable');
      return r.json();
    })
    .then(data => {
      if (Array.isArray(data?.features)) {
        const features = filterByDifficulty(data.features, diff);
        displayTrailsOnMap(features);
        updateTrailCount(features.length);
        if (!features.length) showAlert('No trails found for your filters.', 'info');
      } else {
        throw new Error('Unexpected search response format');
      }
    })
    .catch(() => {
      // Client-side fallback using the full dataset
      const filtered = allTrailsData.filter(f => {
        const name = String(f.properties?.name || '').toLowerCase();
        const d = String(f.properties?.difficulty || '').toLowerCase();
        const matchesText = !query || name.includes(query.toLowerCase()) || d.includes(query.toLowerCase());
        const matchesDiff = !diff || d === diff;
        return matchesText && matchesDiff;
      });
      displayTrailsOnMap(filtered);
      updateTrailCount(filtered.length);
      if (!filtered.length) showAlert('No trails found for your filters.', 'info');
    })
    .finally(() => showLoading(false));
}

function filterByDifficulty(features, diff) {
  if (!diff) return features;
  return features.filter(f => String(f.properties?.difficulty || '').toLowerCase() === diff);
}

// -------------------------------------------------
// Proximity search (uses /api/trails/proximity/?lat=...&lng=...&radius=...)
function findNearestTrails() {
  if (!navigator.geolocation) return showAlert('Geolocation not supported', 'warning');

  showLoading(true);
  navigator.geolocation.getCurrentPosition(pos => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    fetch(`/api/trails/proximity/?lat=${lat}&lng=${lng}&radius=20`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        const features = Array.isArray(data)
          ? data
              .filter(trail => trail?.path && trail.path.type === 'LineString')
              .map(trail => ({ type: 'Feature', geometry: trail.path, properties: trail }))
          : [];
        displayTrailsOnMap(features);
        updateTrailCount(features.length);
        showAlert(`${features.length} nearest trails found within 20km!`, 'success');
      })
      .catch(err => showAlert(`Error: ${err.message}`, 'danger'))
      .finally(() => showLoading(false));
  }, () => showAlert('Location access denied', 'warning'));
}

// -------------------------------------------------
// Helpers / UI
function zoomToTrail(trailId) {
  const feature = allTrailsData.find(f => String(f.properties?.id) === String(trailId));
  if (!feature?.geometry?.coordinates) return;
  const latlngs = feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  const group = L.featureGroup([L.polyline(latlngs)]);
  map.fitBounds(group.getBounds().pad(0.1));
}

function showTrailInfo(trail) {
  const panel = document.getElementById('trail-info');
  const content = document.getElementById('trail-info-content');
  if (!panel || !content) return;

  panel.style.display = 'block';
  content.innerHTML = `
    <div class="trail-info-grid">
      <div class="info-item"><label>Name</label><div class="value">${trail.name ?? '-'}</div></div>
      <div class="info-item"><label>Difficulty</label><div class="value">${trail.difficulty ?? '-'}</div></div>
      <div class="info-item"><label>Length (km)</label><div class="value">${trail.length_km ?? '-'}</div></div>
      <div class="info-item"><label>Elevation Gain (m)</label><div class="value">${trail.elevation_gain_m ?? '-'}</div></div>
    </div>
  `;
}

function updateTrailCount(count) {
  const topBadge = document.getElementById('trail-count');
  const sideBadge = document.getElementById('sidebar-trail-count');
  if (topBadge) topBadge.textContent = `${count} trails loaded`;
  if (sideBadge) sideBadge.textContent = count;
}

function showLoading(show) {
  const searchBtn = document.getElementById('search-btn');
  const overlay = document.querySelector('.map-loading');
  if (searchBtn) {
    if (show) {
      searchBtn.innerHTML = '<span class="loading"></span> Loading...';
      searchBtn.disabled = true;
    } else {
      searchBtn.innerHTML = 'Search';
      searchBtn.disabled = false;
    }
  }
  if (overlay) overlay.classList.toggle('active', !!show);
}

function showAlert(message, type) {
  const el = document.createElement('div');
  el.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
  el.style.top = '20px';
  el.style.right = '20px';
  el.style.zIndex = '9999';
  el.style.minWidth = '300px';
  el.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

function getCsrfToken() {
  const cookies = document.cookie.split(';');
  for (const c of cookies) {
    const [name, value] = c.trim().split('=');
    if (name === 'csrftoken') return value;
  }
  return '';
}

// -------------------------------------------------
// Events
function setupEventListeners() {
  const searchBtn = document.getElementById('search-btn');
  const searchInput = document.getElementById('trail-search');
  const clearBtn = document.getElementById('clear-search');
  const refreshBtn = document.getElementById('refresh-map');
  const closeInfoBtn = document.getElementById('close-info');
  const addTrailBtn = document.getElementById('add-trail-btn');
  const saveTrailBtn = document.getElementById('save-trail');
  const proximityBtn = document.getElementById('proximity-btn');

  searchBtn?.addEventListener('click', performSearch);
  searchInput?.addEventListener('keypress', e => e.key === 'Enter' && performSearch());
  clearBtn?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    const df = document.getElementById('difficulty-filter');
    if (df) df.value = '';
    displayTrailsOnMap(allTrailsData);
    updateTrailCount(allTrailsData.length);
  });
  refreshBtn?.addEventListener('click', loadTrails);
  closeInfoBtn?.addEventListener('click', () => {
    const panel = document.getElementById('trail-info');
    if (panel) panel.style.display = 'none';
  });
  addTrailBtn?.addEventListener('click', () => {
    const modalEl = document.getElementById('addTrailModal');
    if (modalEl) new bootstrap.Modal(modalEl).show();
  });
  saveTrailBtn?.addEventListener('click', saveNewTrail);
  proximityBtn?.addEventListener('click', findNearestTrails);
}
