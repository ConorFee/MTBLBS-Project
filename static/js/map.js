// ==================================================
// MTB Trails Ireland - Interactive Map Application
// CA2 - Advanced Web Mapping
// ==================================================

// Global variables
let map;
let layerGroups = {
    parks: L.featureGroup(),
    trails: L.featureGroup(),
    pois: L.featureGroup()
};
let layerControl;
let allTrailsData = [];

// WKT Builder state
let wktPoints = [];
let tempLineLayer = null;
let wktBuilderActive = false;

// ==================================================
// INITIALIZATION
// ==================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('MTB Trails Map Initializing...');
    initializeMap();
    loadAllData();
    setupEventListeners();
});

// ==================================================
// MAP SETUP
// ==================================================

function initializeMap() {
    // Create map centered on Ireland (Dublin/Wicklow region)
    map = L.map('map', {
        zoomControl: true,
        attributionControl: true
    }).setView([53.20, -6.30], 10); // Centered on Wicklow/Dublin MTB areas

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors | MTB Trails Ireland',
        maxZoom: 18,
        minZoom: 7
    }).addTo(map);

    // Add scale control
    L.control.scale({ 
        position: 'bottomleft',
        imperial: false 
    }).addTo(map);

    // Add all layer groups to map
    layerGroups.parks.addTo(map);
    layerGroups.trails.addTo(map);
    layerGroups.pois.addTo(map);

    // Setup layer control (will be populated after data loads)
    setupLayerControl();

    // Optional: Show coordinates on mouse move
    map.on('mousemove', (e) => {
        const hud = document.getElementById('map-coordinates');
        if (hud) {
            hud.textContent = `Coords: ${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
        }
    });

    console.log(' Map initialized');
}

// ==================================================
// DATA LOADING
// ==================================================

async function loadAllData() {
    showLoading(true);
    
    try {
        // Load all data in parallel
        const [parksData, trailsData, poisData] = await Promise.all([
            fetchParks(),
            fetchTrails(),
            fetchPOIs()
        ]);

        // Display each layer
        if (parksData) displayParks(parksData);
        if (trailsData) {
            allTrailsData = trailsData.features || [];
            displayTrails(trailsData);
        }
        if (poisData) displayPOIs(poisData);

        // Fit map to show all data
        fitMapToBounds();

        // Update UI counts
        updateDataCounts();

        console.log('✓ All data loaded successfully');
        showAlert('Map data loaded successfully!', 'success', 3000);

    } catch (error) {
        console.error('❌ Error loading data:', error);
        showAlert(`Error loading map data: ${error.message}`, 'danger');
    } finally {
        showLoading(false);
    }
}

// Fetch Parks data
async function fetchParks() {
    try {
        const response = await fetch('/api/parks/geojson/');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        console.log('Parks loaded:', data.features?.length || 0);
        return data;
    } catch (error) {
        console.error('Error fetching parks:', error);
        return null;
    }
}

// Fetch Trails data
async function fetchTrails() {
    try {
        const response = await fetch('/api/trails/geojson/');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        console.log('Trails loaded:', data.features?.length || 0);
        return data;
    } catch (error) {
        console.error('Error fetching trails:', error);
        return null;
    }
}

// Fetch POIs data
async function fetchPOIs() {
    try {
        const response = await fetch('/api/pois/geojson/');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        console.log('POIs loaded:', data.features?.length || 0);
        return data;
    } catch (error) {
        console.error('Error fetching POIs:', error);
        return null;
    }
}

// ==================================================
// DISPLAY FUNCTIONS
// ==================================================

// Parks (Polygons)
function displayParks(geojson) {
    if (!geojson || !geojson.features) return;

    L.geoJSON(geojson, {
        style: () => ({
            color: '#FF6B35',
            weight: 2,
            opacity: 0.8,
            fillColor: '#FF6B35',
            fillOpacity: 0.1
        }),
        onEachFeature: (feature, layer) => {
            const props = feature.properties || {};
            const popup = `
                <div class="park-popup">
                    <h5>${props.name || 'Park'}</h5>
                    <p><strong>Source:</strong> ${props.source || 'manual'}</p>
                    ${props.description ? `<p>${props.description}</p>` : ''}
                </div>
            `;
            layer.bindPopup(popup);
            layer.addTo(layerGroups.parks);
        }
    });

    console.log(` ${geojson.features.length} parks added to map`);
}

// Trails (LineStrings)
function displayTrails(geojson) {
    if (!geojson || !geojson.features) return;

    // Clear existing trail layer if reloading
    layerGroups.trails.clearLayers();

    L.geoJSON(geojson, {
        style: (feature) => {
            const difficulty = feature.properties?.difficulty?.toLowerCase() || 'intermediate';
            return {
                color: getTrailColor(difficulty),
                weight: 4,
                opacity: 0.8,
                className: 'trail-line'
            };
        },
        onEachFeature: (feature, layer) => {
            const props = feature.properties || {};
            const popup = `
                <div class="trail-popup">
                    <h5>${props.name || 'Trail'}</h5>
                    <p><strong>Park:</strong> ${props.park_name || 'Not assigned'}</p>
                    <p><strong>Difficulty:</strong> ${props.difficulty || 'Unknown'}</p>
                    <p><strong>Length:</strong> ${props.length_km ?? 'N/A'} km</p>
                    <p><strong>Elevation Gain:</strong> ${props.elevation_gain_m ?? 'N/A'} m</p>
                    ${props.description ? `<p>${props.description}</p>` : ''}
                </div>
            `;
            layer.bindPopup(popup);
            layer.bindTooltip(props.name || 'Trail', { sticky: true });
            layer.addTo(layerGroups.trails);
        }
    });

    console.log(` ${geojson.features.length} trails added to map`);
}

// POIs (Points)
function displayPOIs(geojson) {
    if (!geojson || !geojson.features) return;

    // Clear existing POI layer if reloading
    layerGroups.pois.clearLayers();

    L.geoJSON(geojson, {
        pointToLayer: (feature, latlng) => {
            const icon = getPOIIcon(feature.properties?.type);
            return L.marker(latlng, { icon });
        },
        onEachFeature: (feature, layer) => {
            const props = feature.properties || {};
            const popup = `
                <div class="poi-popup">
                    <h5>${props.name || 'POI'}</h5>
                    <p><strong>Type:</strong> ${props.type_display || props.type || 'Unknown'}</p>
                    <p><strong>Park:</strong> ${props.park_name || 'Not assigned'}</p>
                    ${props.description ? `<p>${props.description}</p>` : ''}
                </div>
            `;
            layer.bindPopup(popup);
            layer.bindTooltip(props.name || 'POI');
            layer.addTo(layerGroups.pois);
        }
    });

    console.log(`✓ ${geojson.features.length} POIs added to map`);
}


// ==================================================
// STYLING HELPERS
// ==================================================

function getTrailColor(difficulty) {
    const colors = {
        'beginner': '#28a745',    // Green
        'intermediate': '#007bff', // Blue
        'expert': '#dc3545'        // Red
    };
    return colors[difficulty] || '#6c757d'; // Grey default
}

function getDifficultyBadge(difficulty) {
    const badges = {
        'beginner': 'success',
        'intermediate': 'primary',
        'expert': 'danger'
    };
    return badges[difficulty?.toLowerCase()] || 'secondary';
}

function getPOIIcon(type) {
    const iconConfig = {
        'parking': { icon: '🅿️', color: '#007bff' },
        'trailhead': { icon: '🚩', color: '#28a745' },
        'bike_shop': { icon: '🚲', color: '#fd7e14' },
        'viewpoint': { icon: '👁️', color: '#6f42c1' },
        'water': { icon: '💧', color: '#17a2b8' }
    };

    const config = iconConfig[type] || { icon: '📍', color: '#6c757d' };

    return L.divIcon({
        html: `<div style="font-size: 24px;">${config.icon}</div>`,
        className: 'poi-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
}

// ==================================================
// LAYER CONTROL
// ==================================================

function setupLayerControl() {
    const overlays = {
        '<span style="color: #FF6B35;">🏞️ Parks</span>': layerGroups.parks,
        '<span style="color: #007bff;">🚵 Trails</span>': layerGroups.trails,
        '<span style="color: #28a745;">📍 Points of Interest</span>': layerGroups.pois
    };

    layerControl = L.control.layers(null, overlays, {
        collapsed: false,
        position: 'topright'
    }).addTo(map);
}

// ==================================================
// UI HELPERS
// ==================================================

function updateDataCounts() {
    // Update trail count in sidebar
    const trailCount = document.getElementById('sidebar-trail-count');
    if (trailCount) {
        trailCount.textContent = allTrailsData.length;
        console.log(`✓ Trail count updated in sidebar: ${allTrailsData.length}`);
    } else {
        console.warn('⚠️ Could not find sidebar-trail-count element');
    }
}

function showLoading(show) {
    const loader = document.getElementById('loading-spinner');
    if (loader) {
        loader.style.display = show ? 'block' : 'none';
    }
}

function showAlert(message, type = 'info', duration = 5000) {
    console.log(`[${type.toUpperCase()}]`, message);
    
    // Optional: Display toast notification if you have a notification system
    const alertDiv = document.getElementById('alert-container');
    if (alertDiv) {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        alertDiv.appendChild(alert);

        if (duration > 0) {
            setTimeout(() => alert.remove(), duration);
        }
    }
}

function fitMapToBounds() {
    const allLayers = [
        ...layerGroups.parks.getLayers(),
        ...layerGroups.trails.getLayers(),
        ...layerGroups.pois.getLayers()
    ];

    if (allLayers.length > 0) {
        const group = L.featureGroup(allLayers);
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

// ==================================================
// EVENT LISTENERS
// ==================================================

function setupEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            console.log('🔄 Refreshing data...');
            loadAllData();
        });
    }

    // Search functionality
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
    }

    // Find nearest button
    const nearestBtn = document.getElementById('find-nearest-btn');
    if (nearestBtn) {
        nearestBtn.addEventListener('click', findNearestTrails);
    }

    console.log('✓ Event listeners set up');
}

function handleSearch() {
    const query = document.getElementById('search-input')?.value.trim().toLowerCase();
    if (!query) return;

    const matches = allTrailsData.filter(trail => 
        trail.properties.name?.toLowerCase().includes(query) ||
        trail.properties.difficulty?.toLowerCase().includes(query)
    );

    if (matches.length > 0) {
        displayTrails({ type: 'FeatureCollection', features: matches });
        showAlert(`Found ${matches.length} trail(s) matching "${query}"`, 'success');
    } else {
        showAlert(`No trails found matching "${query}"`, 'warning');
    }
}

function findNearestTrails() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                fetch(`/api/trails/proximity/?lat=${lat}&lng=${lng}&radius=20`)
                    .then(r => r.json())
                    .then(data => {
                        displayTrails({ type: 'FeatureCollection', features: data });
                        map.setView([lat, lng], 12);
                        L.marker([lat, lng]).addTo(map).bindPopup('Your Location').openPopup();
                        showAlert(`Found ${data.length} nearby trails`, 'success');
                    });
            },
            () => showAlert('Unable to get your location', 'warning')
        );
    }
}

console.log('✓ MTB Trails Map script loaded');
