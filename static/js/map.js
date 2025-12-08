// ============================================
// MTB Trails Ireland - Map JavaScript
// Advanced Web Mapping CA2
// ============================================

console.log('🗺️ MTB Trails Map Initializing...');

// Global variables
let map;
let allTrailsData = [];
let allParksData = [];
let allPOIsData = [];
let layerGroups = {
    parks: null,
    trails: null,
    pois: null
};

// Drawing mode variables
let drawingMode = false;
let drawingPoints = [];        // [[lng, lat], ...]
let drawingMarkers = [];       // Leaflet markers
let drawingLine = null;        // Leaflet polyline
let drawingLayer = null;       // LayerGroup for drawing

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    initMap();
    loadAllData();
    setupFilterAndSearchListeners();
    initDrawingControls();
    console.log('✓ All systems initialized');
});

// Initialize Leaflet map
function initMap() {
    map = L.map('map', {
        center: [53.35, -6.26],
        zoom: 10,
        zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors | MTB Trails Ireland',
        maxZoom: 18
    }).addTo(map);

    // Initialize layer groups
    layerGroups.parks = L.layerGroup().addTo(map);
    layerGroups.trails = L.layerGroup().addTo(map);
    layerGroups.pois = L.layerGroup().addTo(map);

    // Drawing layer
    drawingLayer = L.layerGroup().addTo(map);

    // Layer control
    L.control.layers(null, {
        '🏞️ Parks': layerGroups.parks,
        '🚵 Trails': layerGroups.trails,
        '📍 Points of Interest': layerGroups.pois
    }, { position: 'topright' }).addTo(map);

    // Mouse coordinates
    map.on('mousemove', function(e) {
        const el = document.getElementById('map-coordinates');
        if (el) {
            el.textContent = `Lat: ${e.latlng.lat.toFixed(5)}, Lng: ${e.latlng.lng.toFixed(5)}`;
        }
    });

    console.log('✓ Map initialized');
}

// ============================================
// DATA LOADING
// ============================================

async function loadAllData() {
    showLoading(true);
    try {
        await Promise.all([
            fetchParks(),
            fetchTrails(),
            fetchPOIs()
        ]);
        populateParkFilter();
        console.log('✓ All data loaded');
    } catch (err) {
        console.error('❌ Error loading data:', err);
    } finally {
        showLoading(false);
    }
}

async function fetchParks() {
    const res = await fetch('/api/parks/geojson/');
    if (!res.ok) return;
    const data = await res.json();
    allParksData = data.features || [];
    displayParks(data);
    console.log(`✓ Parks loaded: ${allParksData.length}`);
}

async function fetchTrails() {
    const res = await fetch('/api/trails/geojson/');
    if (!res.ok) return;
    const data = await res.json();
    allTrailsData = data.features || [];
    displayTrails(data);
    updateDataCounts();
    console.log(`✓ Trails loaded: ${allTrailsData.length}`);
}

async function fetchPOIs() {
    const res = await fetch('/api/pois/geojson/');
    if (!res.ok) return;
    const data = await res.json();
    allPOIsData = data.features || [];
    displayPOIs(data);
    console.log(`✓ POIs loaded: ${allPOIsData.length}`);
}

// ============================================
// DISPLAY FUNCTIONS
// ============================================

function displayParks(geojson) {
    if (!geojson || !geojson.features) return;
    layerGroups.parks.clearLayers();
    L.geoJSON(geojson, {
        style: {
            color: '#ff7f00',
            weight: 2,
            fillColor: '#ff7f00',
            fillOpacity: 0.2
        },
        onEachFeature: (feature, layer) => {
            const props = feature.properties || {};
            layer.bindPopup(`<h5>🏞️ ${props.name || 'Park'}</h5>`);
        }
    }).addTo(layerGroups.parks);
}

function displayTrails(geojson) {
    if (!geojson || !geojson.features) return;
    layerGroups.trails.clearLayers();

    const colors = {
        beginner: '#10b981',
        intermediate: '#3b82f6',
        advanced: '#6b7280',
        expert: '#ef4444'
    };

    L.geoJSON(geojson, {
        style: f => ({
            color: colors[f.properties.difficulty] || '#3b82f6',
            weight: 4,
            opacity: 0.85
        }),
        onEachFeature: (feature, layer) => {
            const p = feature.properties || {};
            layer.trailId = p.id;
            layer.bindPopup(`
                <h5>🚵 ${p.name || 'Trail'}</h5>
                <p><strong>Difficulty:</strong> ${p.difficulty || 'N/A'}</p>
                <p><strong>Length:</strong> ${p.length_km ?? 'N/A'} km</p>
                <p><strong>Elevation:</strong> ${p.elevation_gain_m ?? 'N/A'} m</p>
            `);
        }
    }).addTo(layerGroups.trails);

    renderTrailCards(geojson.features);
}

function displayPOIs(geojson) {
    if (!geojson || !geojson.features) return;
    layerGroups.pois.clearLayers();

    const iconMap = {
        parking: '🅿️',
        trailhead: '🚩',
        water_source: '💧',
        viewpoint: '🔭',
        default: '📍'
    };

    L.geoJSON(geojson, {
        pointToLayer: (feature, latlng) => {
            const p = feature.properties || {};
            const icon = L.divIcon({
                html: iconMap[p.type] || iconMap.default,
                className: 'poi-icon',
                iconSize: [24, 24]
            });
            return L.marker(latlng, { icon });
        },
        onEachFeature: (feature, layer) => {
            const p = feature.properties || {};
            layer.bindPopup(`
                <h5>${p.name || 'POI'}</h5>
                <p><strong>Type:</strong> ${p.type_display || p.type || 'N/A'}</p>
            `);
        }
    }).addTo(layerGroups.pois);
}

// ============================================
// TRAIL CARDS
// ============================================

function renderTrailCards(trails) {
    const list = document.getElementById('trail-list');
    const results = document.getElementById('results-count');

    if (!trails || trails.length === 0) {
        list.innerHTML = `
            <div class="loading-state">
              <i class="fas fa-mountain"></i>
              <p>No trails found</p>
            </div>`;
        if (results) results.textContent = 'No trails found';
        return;
    }

    list.innerHTML = trails.map(f => {
        const p = f.properties || {};
        return `
        <div class="trail-card" data-trail-id="${p.id}" onclick="focusOnTrail(${p.id})">
          <div class="trail-card-header">
            <h6 class="trail-card-title">${p.name}</h6>
            <span class="difficulty-badge difficulty-${p.difficulty}">
              ${p.difficulty}
            </span>
          </div>
          <div class="trail-card-meta">
            <span><i class="fas fa-ruler"></i> ${p.length_km ?? 'N/A'} km</span>
            <span><i class="fas fa-mountain"></i> ${p.elevation_gain_m ?? 'N/A'} m</span>
          </div>
        </div>`;
    }).join('');

    if (results) {
        results.textContent = `Showing ${trails.length} trail${trails.length === 1 ? '' : 's'}`;
    }
}

window.focusOnTrail = function(trailId) {
    layerGroups.trails.eachLayer(layer => {
        if (layer.trailId === trailId) {
            map.fitBounds(layer.getBounds(), { padding: [40, 40] });
            layer.openPopup();
        }
    });
};

// ============================================
// DRAWING MODE (CLICK TO ADD, ESC / BUTTON TO FINISH)
// ============================================

function initDrawingControls() {
    const startBtn = document.getElementById('start-drawing-btn');
    const undoBtn = document.getElementById('undo-point-btn');
    const clearBtn = document.getElementById('clear-path-btn');
    const finishBtn = document.getElementById('finish-drawing-btn');
    const saveBtn = document.getElementById('save-trail-btn');
    const manualToggle = document.getElementById('manual-wkt-toggle');
    const pathTextarea = document.getElementById('modal-trail-path');

    if (startBtn) startBtn.addEventListener('click', startDrawingMode);
    if (undoBtn) undoBtn.addEventListener('click', undoLastPoint);
    if (clearBtn) clearBtn.addEventListener('click', clearDrawing);
    if (finishBtn) finishBtn.addEventListener('click', finishDrawing);
    if (saveBtn) saveBtn.addEventListener('click', handleSaveTrail);

    if (manualToggle && pathTextarea) {
        manualToggle.addEventListener('change', function() {
            if (this.checked) {
                pathTextarea.removeAttribute('readonly');
                pathTextarea.style.background = 'white';
                clearDrawing();
            } else {
                pathTextarea.setAttribute('readonly', true);
                pathTextarea.style.background = '#f8f9fa';
            }
        });
    }

    // ESC to finish drawing
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && drawingMode) {
            finishDrawing();
        }
    });
}

function startDrawingMode() {
    drawingMode = true;
    drawingPoints = [];
    drawingMarkers = [];
    if (drawingLine) {
        drawingLayer.removeLayer(drawingLine);
        drawingLine = null;
    }
    drawingLayer.clearLayers();

    // UI updates
    document.getElementById('start-drawing-btn').style.display = 'none';
    document.getElementById('undo-point-btn').style.display = 'inline-block';
    document.getElementById('clear-path-btn').style.display = 'inline-block';
    document.getElementById('finish-drawing-btn').style.display = 'inline-block';
    document.getElementById('drawing-status').style.display = 'block';
    document.getElementById('map').classList.add('drawing-active');

    // Listen to map clicks
    map.on('click', onMapClickForDrawing);

    console.log('✓ Drawing mode started – click points on map');
}

function onMapClickForDrawing(e) {
    if (!drawingMode) return;
    const latlng = e.latlng;
    drawingPoints.push([latlng.lng, latlng.lat]);  // store as [lng, lat]

    // Marker
    const isStart = drawingPoints.length === 1;
    const marker = L.circleMarker(latlng, {
        radius: 6,
        color: 'white',
        weight: 2,
        fillColor: isStart ? '#10b981' : '#2563eb', // green start, blue others
        fillOpacity: 1
    }).addTo(drawingLayer);
    drawingMarkers.push(marker);

    // Line
    if (drawingPoints.length > 1) {
        if (drawingLine) drawingLayer.removeLayer(drawingLine);
        const latlngs = drawingPoints.map(p => [p[1], p[0]]); // [lat, lng]
        drawingLine = L.polyline(latlngs, {
            color: '#2563eb',
            weight: 4,
            opacity: 0.8,
            dashArray: '6, 8'
        }).addTo(drawingLayer);
    }

    updateDrawingStatus();
    generateWKT();
}

function undoLastPoint() {
    if (!drawingMode || drawingPoints.length === 0) return;

    drawingPoints.pop();
    const m = drawingMarkers.pop();
    if (m) drawingLayer.removeLayer(m);

    if (drawingLine) {
        drawingLayer.removeLayer(drawingLine);
        drawingLine = null;
    }
    if (drawingPoints.length > 1) {
        const latlngs = drawingPoints.map(p => [p[1], p[0]]);
        drawingLine = L.polyline(latlngs, {
            color: '#2563eb',
            weight: 4,
            opacity: 0.8,
            dashArray: '6, 8'
        }).addTo(drawingLayer);
    }

    updateDrawingStatus();
    generateWKT();
}

function clearDrawing() {
    drawingPoints = [];
    drawingMarkers = [];
    drawingLayer.clearLayers();
    drawingLine = null;
    document.getElementById('modal-trail-path').value = '';
    document.getElementById('trail-distance').textContent = '0 km';
    document.getElementById('point-count').textContent = '0 points';
    document.getElementById('modal-trail-length').value = '';
    console.log('✓ Drawing cleared');
}

function finishDrawing() {
    if (!drawingMode) return;

    if (drawingPoints.length < 2) {
        alert('Please add at least 2 points to create a trail');
        return;
    }

    drawingMode = false;

    // Solid line (remove dash)
    if (drawingLine) {
        drawingLine.setStyle({ dashArray: null });
    }

    // Color last marker red (end)
    if (drawingMarkers.length > 0) {
        const last = drawingMarkers[drawingMarkers.length - 1];
        last.setStyle({ fillColor: '#ef4444' });
    }

    // Remove listener
    map.off('click', onMapClickForDrawing);
    document.getElementById('map').classList.remove('drawing-active');
    document.getElementById('drawing-status').style.display = 'none';
    document.getElementById('start-drawing-btn').style.display = 'inline-block';
    document.getElementById('undo-point-btn').style.display = 'none';
    document.getElementById('finish-drawing-btn').style.display = 'none';

    console.log('✓ Drawing finished');
}

function updateDrawingStatus() {
    const points = drawingPoints.length;
    const pointLabel = document.getElementById('point-count');
    const distLabel = document.getElementById('trail-distance');

    if (pointLabel) {
        pointLabel.textContent = `${points} point${points === 1 ? '' : 's'}`;
    }

    if (distLabel && points > 1) {
        let dist = 0;
        for (let i = 0; i < points - 1; i++) {
            const p1 = L.latLng(drawingPoints[i][1], drawingPoints[i][0]);
            const p2 = L.latLng(drawingPoints[i + 1][1], drawingPoints[i + 1][0]);
            dist += p1.distanceTo(p2);
        }
        const km = dist / 1000;
        distLabel.textContent = `${km.toFixed(2)} km`;

        // Auto-fill length field
        const lenInput = document.getElementById('modal-trail-length');
        if (lenInput) lenInput.value = km.toFixed(1);
    }
}

function generateWKT() {
    const pathEl = document.getElementById('modal-trail-path');
    if (!pathEl) return;

    if (drawingPoints.length < 2) {
        pathEl.value = '';
        return;
    }

    // Build LINESTRING(lng lat, lng lat, ...)
    const coords = drawingPoints.map(p => `${p[0]} ${p[1]}`).join(', ');
    const wkt = `LINESTRING(${coords})`;
    pathEl.value = wkt;

    console.log('Generated WKT:', wkt);
}

// ============================================
// SAVE TRAIL (POST /api/trails/)
// ============================================

async function handleSaveTrail() {
    const name = document.getElementById('modal-trail-name').value.trim();
    const difficulty = document.getElementById('modal-trail-difficulty').value;
    const lengthVal = document.getElementById('modal-trail-length').value;
    const elevationVal = document.getElementById('modal-trail-elevation').value;
    const description = document.getElementById('modal-trail-description').value.trim();
    const pathWKT = document.getElementById('modal-trail-path').value.trim();
    const parkVal = document.getElementById('modal-trail-park').value;

    if (!name || !difficulty || !lengthVal || !elevationVal || !pathWKT) {
        alert('Please fill in all required fields and draw a trail path.');
        return;
    }

    if (!pathWKT.startsWith('LINESTRING(')) {
        alert('Path must be a valid WKT LINESTRING. Use the map to draw the trail.');
        return;
    }

    const payload = {
        name: name,
        difficulty: difficulty,
        length_km: parseFloat(lengthVal),
        elevation_gain_m: parseInt(elevationVal),
        description: description,
        path: pathWKT,
        park: parkVal ? parseInt(parkVal) : null
    };

    console.log('📤 Sending payload:', payload);

    try {
        showLoading(true);
        const res = await fetch('/api/trails/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            console.error('❌ Error response:', errData);
            alert('Error saving trail: ' + (errData.detail || JSON.stringify(errData)));
            return;
        }

        const data = await res.json();
        console.log('✅ Trail created:', data);

        // Close modal
        const modalEl = document.getElementById('addTrailModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();

        // Reset form & drawing
        document.getElementById('add-trail-form').reset();
        clearDrawing();

        // Reload trails
        await fetchTrails();
        alert(`Trail "${name}" created successfully!`);
    } catch (err) {
        console.error('❌ Error creating trail:', err);
        alert('Unexpected error creating trail');
    } finally {
        showLoading(false);
    }
}

// CSRF helper
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let c of cookies) {
            c = c.trim();
            if (c.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(c.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// ============================================
// FILTER & SEARCH (unchanged, minimal)
// ============================================

function setupFilterAndSearchListeners() {
    const searchInput = document.getElementById('trail-search');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const difficultyFilter = document.getElementById('difficulty-filter');
    const lengthFilter = document.getElementById('length-filter');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const nearMeBtn = document.getElementById('near-me-btn'); 

    if (searchInput && clearSearchBtn) {
        searchInput.addEventListener('input', () => {
            clearSearchBtn.style.display = searchInput.value ? 'block' : 'none';
            filterTrails();
        });
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearSearchBtn.style.display = 'none';
            filterTrails();
        });
    }

    if (difficultyFilter) difficultyFilter.addEventListener('change', filterTrails);
    if (lengthFilter) {
        lengthFilter.addEventListener('input', () => {
            const label = document.getElementById('length-value');
            if (label) label.textContent = `${lengthFilter.value} km`;
            filterTrails();
        });
    }

    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (clearSearchBtn) clearSearchBtn.style.display = 'none';
            if (difficultyFilter) difficultyFilter.value = '';
            if (lengthFilter) {
                lengthFilter.value = 50;
                const label = document.getElementById('length-value');
                if (label) label.textContent = '50 km';
            }
            filterTrails();
        });
    }

    if (nearMeBtn) {
        nearMeBtn.addEventListener('click', findTrailsNearMe);
    }
}

function filterTrails() {
    let filtered = allTrailsData.slice();
    const searchTerm = (document.getElementById('trail-search')?.value || '').toLowerCase();
    const difficulty = document.getElementById('difficulty-filter')?.value || '';
    const maxLength = parseFloat(document.getElementById('length-filter')?.value || '50');

    filtered = filtered.filter(f => {
        const p = f.properties || {};
        if (searchTerm && !p.name.toLowerCase().includes(searchTerm)) return false;
        if (difficulty && p.difficulty !== difficulty) return false;
        if (p.length_km && p.length_km > maxLength) return false;
        return true;
    });

    renderTrailCards(filtered);
    displayTrails({ type: 'FeatureCollection', features: filtered });
}

// ============================================
// NEARBY TRAILS (GEOLOCATION + SPATIAL QUERY)
// ============================================

let nearMeMarker = null;
let nearMeCircle = null;

function findTrailsNearMe() {
    const statusEl = document.getElementById('near-me-status');
    if (!navigator.geolocation) {
        if (statusEl) statusEl.textContent = 'Geolocation is not supported by your browser.';
        alert('Geolocation is not supported by your browser.');
        return;
    }

    if (statusEl) statusEl.textContent = 'Requesting your location...';

    navigator.geolocation.getCurrentPosition(
        async position => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const radiusKm = 10;  // you can tweak this

            if (statusEl) {
                statusEl.textContent = `Searching for trails within ${radiusKm} km of your location...`;
            }

            try {
                showLoading(true);

                // OPTIONAL: show marker + circle on map
                showNearMeMarker(lat, lng, radiusKm);

                // Call your spatial endpoint
                const url = `/api/trails/within-radius/?lat=${lat}&lng=${lng}&radius_km=${radiusKm}`;
                const res = await fetch(url);
                if (!res.ok) {
                    throw new Error(`Server error: ${res.status}`);
                }
                const data = await res.json();

                // Expecting GeoJSON FeatureCollection
                const features = data.features || data.results || [];

                if (features.length === 0) {
                    if (statusEl) statusEl.textContent = `No trails found within ${radiusKm} km.`;
                    // Clear trails on map and sidebar
                    renderTrailCards([]);
                    displayTrails({ type: 'FeatureCollection', features: [] });
                    return;
                }

                // Update map and cards with only these trails
                displayTrails({ type: 'FeatureCollection', features: features });
                renderTrailCards(features);

                // Zoom to bounds
                zoomToFeaturesBounds(features);

                if (statusEl) {
                    statusEl.textContent = `Showing ${features.length} trail${features.length !== 1 ? 's' : ''} within ${radiusKm} km of your location.`;
                }
            } catch (err) {
                console.error('❌ Error finding nearby trails:', err);
                alert('Error finding nearby trails. Please try again.');
                if (statusEl) statusEl.textContent = 'Something went wrong. Please try again.';
            } finally {
                showLoading(false);
            }
        },
        error => {
            console.error('Geolocation error:', error);
            if (statusEl) {
                if (error.code === error.PERMISSION_DENIED) {
                    statusEl.textContent = 'Location permission denied. Cannot find nearby trails.';
                } else {
                    statusEl.textContent = 'Unable to get your location.';
                }
            }
            alert('Could not access your location.');
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

function showNearMeMarker(lat, lng, radiusKm) {
    const center = [lat, lng];

    if (nearMeMarker) {
        map.removeLayer(nearMeMarker);
    }
    if (nearMeCircle) {
        map.removeLayer(nearMeCircle);
    }

    nearMeMarker = L.marker(center, {
        icon: L.divIcon({
            html: '📍',
            className: 'poi-icon',
            iconSize: [24, 24]
        })
    }).addTo(map);

    nearMeCircle = L.circle(center, {
        radius: radiusKm * 1000,
        color: '#2563eb',
        weight: 2,
        fillColor: '#3b82f6',
        fillOpacity: 0.1
    }).addTo(map);
}

function zoomToFeaturesBounds(features) {
    try {
        const latlngs = [];

        features.forEach(f => {
            const geom = f.geometry;
            if (!geom) return;

            if (geom.type === 'LineString') {
                geom.coordinates.forEach(c => {
                    latlngs.push([c[1], c[0]]);
                });
            } else if (geom.type === 'MultiLineString') {
                geom.coordinates.forEach(line => {
                    line.forEach(c => latlngs.push([c[1], c[0]]));
                });
            } else if (geom.type === 'Point') {
                latlngs.push([geom.coordinates[1], geom.coordinates[0]]);
            }
        });

        if (latlngs.length > 0) {
            const bounds = L.latLngBounds(latlngs);
            map.fitBounds(bounds, { padding: [40, 40] });
        }
    } catch (err) {
        console.warn('Could not zoom to nearby trails bounds:', err);
    }
}


function populateParkFilter() {
    const parkFilter = document.getElementById('park-filter');
    const modalPark = document.getElementById('modal-trail-park');
    if (!parkFilter || !modalPark) return;

    const uniqueParks = [...new Set(allParksData.map(f => f.properties.name))].sort();
    for (const name of uniqueParks) {
        const parkFeature = allParksData.find(f => f.properties.name === name);
        const id = parkFeature?.properties.id;

        const optFilter = document.createElement('option');
        optFilter.value = name;
        optFilter.textContent = name;
        parkFilter.appendChild(optFilter);

        if (id != null) {
            const optModal = document.createElement('option');
            optModal.value = id;
            optModal.textContent = name;
            modalPark.appendChild(optModal);
        }
    }
}

// ============================================
// UTILS
// ============================================

function updateDataCounts() {
    const count = allTrailsData.length;
    const sidebar = document.getElementById('sidebar-trail-count');
    const nav = document.getElementById('nav-trail-count');
    if (sidebar) sidebar.textContent = count;
    if (nav) nav.textContent = count;
}

function showLoading(show) {
    const el = document.getElementById('map-loading');
    if (!el) return;
    el.classList.toggle('active', show);
}

console.log('✓ MTB Trails Map script loaded');
