// MTB Trails Mapper - Main JavaScript functionality
let map;
// Use FeatureGroup so getBounds() works
let trailLayers = L.featureGroup();
let allTrailsData = [];

// Initialize map when page loads
document.addEventListener('DOMContentLoaded', function () {
  initializeMap();
  loadTrails();
  setupEventListeners();
});

function initializeMap() {
  map = L.map('map').setView([53.35, -7.5], 7); // Ireland center

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18
  }).addTo(map);

  trailLayers.addTo(map);

  // If you want to open the modal on map click, keep this.
  // But your modal doesn't have lat/lng inputs, so just show the modal without writing to nonexistent inputs.
  map.on('click', function () {
    const modalEl = document.getElementById('addTrailModal');
    if (modalEl) new bootstrap.Modal(modalEl).show();
  });
}

function loadTrails() {
  console.log('Loading trails...');
  showLoading(true);

  // Your GeoFeatureModelSerializer should already return a FeatureCollection from /api/trails/
  fetch('/api/trails/')
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then(data => {
      // Prefer FeatureCollection
      if (data && data.type === 'FeatureCollection' && Array.isArray(data.features)) {
        allTrailsData = data.features;
      } else if (Array.isArray(data)) {
        // Fallback: convert array to Feature-like objects
        allTrailsData = data.map(trail => ({
          type: "Feature",
          geometry: trail.path && trail.path.coordinates ? {
            type: "LineString",
            coordinates: trail.path.coordinates
          } : null,
          properties: trail
        }));
      } else if (data && data.results && Array.isArray(data.results)) {
        // Paged but non-GeoJSON response
        allTrailsData = data.results.map(trail => ({
          type: "Feature",
          geometry: trail.path && trail.path.coordinates ? {
            type: "LineString",
            coordinates: trail.path.coordinates
          } : null,
          properties: trail
        }));
      } else {
        throw new Error('Unexpected trails API format');
      }

      displayTrailsOnMap(allTrailsData);
      updateTrailCount(allTrailsData.length);
    })
    .catch(error => {
      console.error('Error loading trails:', error);
      showAlert(`Error loading trails: ${error.message}`, 'danger');
    })
    .finally(() => {
      showLoading(false);
    });
}

function displayTrailsOnMap(trails) {
  trailLayers.clearLayers();

  trails.forEach(trail => {
    try {
      const { geometry, properties } = trail;
      if (!geometry || !geometry.coordinates) {
        console.warn('Invalid geometry for trail:', properties?.name);
        return;
      }

      // Leaflet expects [lat, lng]
      const coords = geometry.coordinates.map(c => [c[1], c[0]]);
      const difficulty = (properties.difficulty || '').toLowerCase();
      const color =
        difficulty === 'beginner' ? 'green' :
        difficulty === 'intermediate' ? 'blue' : 'red';

      const poly = L.polyline(coords, { color, weight: 5, opacity: 0.8 })
        .bindPopup(createPopupContent(properties))
        .addTo(trailLayers);

      poly.trailData = properties;

      poly.on('click', function () {
        showTrailInfo(properties);
      });
    } catch (err) {
      console.error('Error rendering trail:', trail, err);
    }
  });

  if (trails.length > 0) {
    const bounds = trailLayers.getBounds();
    if (bounds.isValid()) map.fitBounds(bounds.pad(0.1));
  }
}

function createPopupContent(trail) {
  const name = trail.name || 'Unknown Trail';
  const difficulty = trail.difficulty || 'Unknown';
  const length = trail.length_km ?? 'Unknown';
  const elevation = trail.elevation_gain_m ?? 'Unknown';

  // properties.id should exist with fields="__all__"
  const id = trail.id ?? '';

  return `
    <div class="trail-popup">
      <h6>${name}</h6>
      <p><strong>Difficulty:</strong> ${difficulty}</p>
      <p><strong>Length:</strong> ${length} km</p>
      <p><strong>Elevation Gain:</strong> ${elevation} m</p>
      <button class="btn btn-sm btn-primary" onclick="zoomToTrail('${id}')">Zoom to Trail</button>
    </div>
  `;
}

function showTrailInfo(trail) {
  const infoPanel = document.getElementById('trail-info');
  const content = document.getElementById('trail-info-content');
  if (!infoPanel || !content) return;

  infoPanel.style.display = 'block';
  content.innerHTML = `
    <div class="trail-info-grid">
      <div class="info-item">
        <label>Name</label><div class="value">${trail.name ?? '-'}</div>
      </div>
      <div class="info-item">
        <label>Difficulty</label><div class="value">${trail.difficulty ?? '-'}</div>
      </div>
      <div class="info-item">
        <label>Length (km)</label><div class="value">${trail.length_km ?? '-'}</div>
      </div>
      <div class="info-item">
        <label>Elevation Gain (m)</label><div class="value">${trail.elevation_gain_m ?? '-'}</div>
      </div>
    </div>
  `;
}

function performSearch() {
  const input = document.getElementById('trail-search');
  const difficultySel = document.getElementById('difficulty-filter');
  if (!input) return;

  const query = input.value.trim().toLowerCase();
  const diffFilter = (difficultySel?.value || '').toLowerCase();

  // Client-side filter (no server /search endpoint)
  const filtered = allTrailsData.filter(t => {
    const name = (t.properties?.name || '').toLowerCase();
    const difficulty = (t.properties?.difficulty || '').toLowerCase();
    const matchesText = !query || name.includes(query) || difficulty.includes(query);
    const matchesDiff = !diffFilter || difficulty === diffFilter;
    return matchesText && matchesDiff;
  });

  displayTrailsOnMap(filtered);
  updateTrailCount(filtered.length);

  if (filtered.length === 0) {
    showAlert('No trails found matching your filters.', 'info');
  }
}

function zoomToTrail(trailId) {
  const trail = allTrailsData.find(t => String(t.properties?.id) === String(trailId));
  if (trail?.geometry?.coordinates) {
    const latlngs = trail.geometry.coordinates.map(c => [c[1], c[0]]);
    const group = L.featureGroup([L.polyline(latlngs)]);
    map.fitBounds(group.getBounds().pad(0.1));
  }
}

function updateTrailCount(count) {
  const el = document.getElementById('trail-count');
  if (el) el.textContent = `${count} trails loaded`;
}

function showLoading(show) {
  const btn = document.getElementById('search-btn');
  if (!btn) return;
  if (show) {
    btn.innerHTML = '<span class="loading"></span> Loading...';
    btn.disabled = true;
  } else {
    btn.innerHTML = '🔍 Search';
    btn.disabled = false;
  }
}

function showAlert(message, type) {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
  alertDiv.style.top = '20px';
  alertDiv.style.right = '20px';
  alertDiv.style.zIndex = '9999';
  alertDiv.style.minWidth = '300px';
  alertDiv.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
  document.body.appendChild(alertDiv);
  setTimeout(() => alertDiv.remove(), 5000);
}

function getCsrfToken() {
  // Uses cookie; make sure CsrfViewMiddleware is enabled (default)
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrftoken') return value;
  }
  return '';
}

function setupEventListeners() {
  const searchBtn = document.getElementById('search-btn');
  const searchInput = document.getElementById('trail-search');
  const clearSearchBtn = document.getElementById('clear-search');
  const refreshBtn = document.getElementById('refresh-map');
  const closeInfoBtn = document.getElementById('close-info');
  const addTrailBtn = document.getElementById('add-trail-btn');
  const saveTrailBtn = document.getElementById('save-trail');

  if (searchBtn) searchBtn.addEventListener('click', performSearch);
  if (searchInput) searchInput.addEventListener('keypress', e => e.key === 'Enter' && performSearch());
  if (clearSearchBtn) clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    document.getElementById('difficulty-filter').value = '';
    displayTrailsOnMap(allTrailsData);
    updateTrailCount(allTrailsData.length);
  });
  if (refreshBtn) refreshBtn.addEventListener('click', loadTrails);
  if (closeInfoBtn) closeInfoBtn.addEventListener('click', () => {
    const panel = document.getElementById('trail-info');
    if (panel) panel.style.display = 'none';
  });
  if (addTrailBtn) addTrailBtn.addEventListener('click', () => {
    const modalEl = document.getElementById('addTrailModal');
    if (modalEl) new bootstrap.Modal(modalEl).show();
  });
  if (saveTrailBtn) saveTrailBtn.addEventListener('click', saveNewTrail);
}

function saveNewTrail() {
  const formData = {
    name: document.getElementById('trail-name').value.trim(),
    difficulty: document.getElementById('trail-difficulty').value,
    length_km: parseFloat(document.getElementById('trail-length').value),
    elevation_gain_m: parseFloat(document.getElementById('trail-elevation').value),
    // Backend expects geometry for path; you are entering WKT in textarea and DRF-GIS accepts that.
    path: document.getElementById('trail-path').value.trim()
  };

  if (!formData.name || !formData.difficulty || isNaN(formData.length_km) || isNaN(formData.elevation_gain_m) || !formData.path) {
    showAlert('Please fill all fields.', 'warning');
    return;
  }

  fetch('/api/trails/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken()
    },
    body: JSON.stringify(formData)
  })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then(() => {
      showAlert('Trail added successfully!', 'success');
      // Properly hide Bootstrap 5 modal
      const modalEl = document.getElementById('addTrailModal');
      const instance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      instance.hide();

      document.getElementById('add-trail-form').reset();
      loadTrails();
    })
    .catch(error => {
      console.error('Error saving trail:', error);
      showAlert('Error saving trail.', 'danger');
    });
}
