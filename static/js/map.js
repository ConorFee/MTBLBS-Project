// MTB Trails Mapper - Main JavaScript functionality
let map;
let trailMarkers = L.layerGroup();
let allTrailsData = [];

// Initialize map when page loads
document.addEventListener('DOMContentLoaded', function() {
  initializeMap();
  loadTrails();
  setupEventListeners();
});

function initializeMap() {
  map = L.map('map').setView([53.35, -7.5], 7);  // Ireland center

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18
  }).addTo(map);

  trailMarkers.addTo(map);

  map.on('click', function(e) {
    const { lat, lng } = e.latlng;
    document.getElementById('trail-lat').value = lat.toFixed(6);
    document.getElementById('trail-lng').value = lng.toFixed(6);

    const modal = new bootstrap.Modal(document.getElementById('addTrailModal'));
    modal.show();
  });
}

function loadTrails() {
  console.log('Loading trails...');
  showLoading(true);

  fetch('/api/trails/geojson/')
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then(data => {
      console.log('Raw API response:', data);

      if (data && data.features && Array.isArray(data.features)) {
        allTrailsData = data.features;
        displayTrailsOnMap(allTrailsData);
        updateTrailCount(allTrailsData.length);
        console.log(`Successfully loaded ${allTrailsData.length} trails`);
      } else if (Array.isArray(data)) {
        const geojsonFeatures = data.map(trail => ({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: trail.path.coordinates
          },
          properties: trail
        }));
        allTrailsData = geojsonFeatures;
        displayTrailsOnMap(allTrailsData);
        updateTrailCount(allTrailsData.length);
      } else {
        return loadTrailsFromRegularAPI();
      }
    })
    .catch(error => {
      console.error('Error with geojson endpoint:', error);
      return loadTrailsFromRegularAPI();
    })
    .finally(() => {
      showLoading(false);
    });
}

function loadTrailsFromRegularAPI() {
  console.log('Trying regular API...');

  fetch('/api/trails/')
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then(data => {
      let trailsArray;
      if (data && data.results && Array.isArray(data.results)) {
        trailsArray = data.results;
      } else if (Array.isArray(data)) {
        trailsArray = data;
      } else {
        throw new Error('Unexpected format');
      }

      const geojsonFeatures = trailsArray.map(trail => ({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: trail.path.coordinates  // Assume path is LineString
        },
        properties: trail
      }));

      allTrailsData = geojsonFeatures;
      displayTrailsOnMap(allTrailsData);
      updateTrailCount(allTrailsData.length);
      console.log(`Loaded ${allTrailsData.length} trails from regular API`);
    })
    .catch(error => {
      console.error('Error loading trails:', error);
      showAlert(`Error loading trails: ${error.message}`, 'danger');
    });
}

function displayTrailsOnMap(trails) {
  trailMarkers.clearLayers();

  trails.forEach(trail => {
    try {
      const { geometry, properties } = trail;

      if (!geometry || !geometry.coordinates) {
        console.warn('Invalid geometry for trail:', properties?.name);
        return;
      }

      const coords = geometry.coordinates.map(c => [c[1], c[0]]);  // Leaflet order

      // Color by difficulty
      const color = properties.difficulty === 'beginner' ? 'green' : properties.difficulty === 'intermediate' ? 'blue' : 'red';

      const trailLayer = L.polyline(coords, {
        color: color,
        weight: 5,
        opacity: 0.8
      }).bindPopup(createPopupContent(properties)).addTo(trailMarkers);

      trailLayer.on('click', function() {
        showTrailInfo(properties);
      });

      trailLayer.trailData = properties;
    } catch (error) {
      console.error('Error rendering trail:', trail, error);
    }
  });

  if (trails.length > 0) {
    trailMarkers.fitBounds(trailMarkers.getBounds().pad(0.1));
  }
}

function createPopupContent(trail) {
  const name = trail.name || 'Unknown Trail';
  const difficulty = trail.difficulty || 'Unknown';
  const length = trail.length_km || 'Unknown';
  const elevation = trail.elevation_gain_m || 'Unknown';

  return `
    <div class="trail-popup">
      <h6>${name}</h6>
      <p><strong>Difficulty:</strong> ${difficulty}</p>
      <p><strong>Length:</strong> ${length} km</p>
      <p><strong>Elevation Gain:</strong> ${elevation} m</p>
      <button class="btn btn-sm btn-primary" onclick="zoomToTrail('${trail.id}')">Zoom to Trail</button>
    </div>
  `;
}

function showTrailInfo(trail) {
  const infoPanel = document.getElementById('trail-info');
  if (!infoPanel) {
    console.warn('Trail info panel not found');
    return;
  }
  // Update panel with trail details (adapt from Lab 4's showCityInfo)
  infoPanel.style.display = 'block';
  // ... (add content similar to createPopupContent)
}

function performSearch() {
  const query = document.getElementById('trail-search').value.trim();
  if (!query) {
    displayTrailsOnMap(allTrailsData);
    updateTrailCount(allTrailsData.length);
    return;
  }

  showLoading(true);
  fetch(`/api/trails/search/?q=${encodeURIComponent(query)}`)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then(data => {
      console.log('Search response:', data);

      let filteredTrails;
      if (Array.isArray(data)) {
        filteredTrails = data.map(trail => ({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: trail.path.coordinates
          },
          properties: trail
        }));
      } else {
        filteredTrails = allTrailsData.filter(trail =>
          trail.properties.name.toLowerCase().includes(query.toLowerCase()) ||
          trail.properties.difficulty.toLowerCase().includes(query.toLowerCase())
        );
      }

      displayTrailsOnMap(filteredTrails);
      updateTrailCount(filteredTrails.length);

      if (filteredTrails.length === 0) {
        showAlert('No trails found matching your search.', 'info');
      }
    })
    .catch(error => {
      console.error('Error searching trails:', error);
      showAlert(`Error searching trails: ${error.message}`, 'danger');
    })
    .finally(() => {
      showLoading(false);
    });
}

// Utility functions (adapt from Lab 4)
function zoomToTrail(trailId) {
  const trail = allTrailsData.find(t => t.properties.id === parseInt(trailId));
  if (trail && trail.geometry && trail.geometry.coordinates) {
    const group = L.featureGroup([L.polyline(trail.geometry.coordinates.map(c => [c[1], c[0]]))]);
    map.fitBounds(group.getBounds().pad(0.1));
  }
}

function updateTrailCount(count) {
  const countElement = document.getElementById('trail-count');
  if (countElement) {
    countElement.textContent = `${count} trails loaded`;
  }
}

function showLoading(show) {
  const searchBtn = document.getElementById('search-btn');
  if (searchBtn) {
    if (show) {
      searchBtn.innerHTML = '<span class="loading"></span> Loading...';
      searchBtn.disabled = true;
    } else {
      searchBtn.innerHTML = '🔍 Search';
      searchBtn.disabled = false;
    }
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
  if (clearSearchBtn) clearSearchBtn.addEventListener('click', () => { searchInput.value = ''; displayTrailsOnMap(allTrailsData); updateTrailCount(allTrailsData.length); });
  if (refreshBtn) refreshBtn.addEventListener('click', loadTrails);
  if (closeInfoBtn) closeInfoBtn.addEventListener('click', () => document.getElementById('trail-info').style.display = 'none');
  if (addTrailBtn) addTrailBtn.addEventListener('click', () => new bootstrap.Modal(document.getElementById('addTrailModal')).show());
  if (saveTrailBtn) saveTrailBtn.addEventListener('click', saveNewTrail);
}

function saveNewTrail() {
  const formData = {
    name: document.getElementById('trail-name').value.trim(),
    difficulty: document.getElementById('trail-difficulty').value,
    length_km: parseFloat(document.getElementById('trail-length').value),
    elevation_gain_m: parseFloat(document.getElementById('trail-elevation').value),
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
    document.getElementById('addTrailModal').querySelector('.modal').hide();
    document.getElementById('add-trail-form').reset();
    loadTrails();
  })
  .catch(error => {
    console.error('Error saving trail:', error);
    showAlert('Error saving trail.', 'danger');
  });
}