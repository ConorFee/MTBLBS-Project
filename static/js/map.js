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

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    initMap();
    loadAllData();
    setupEventListeners();
    console.log('✓ Event listeners set up');
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

    // Add layer control
    L.control.layers(null, {
        '🏞️ Parks': layerGroups.parks,
        '🚵 Trails': layerGroups.trails,
        '📍 Points of Interest': layerGroups.pois
    }, { position: 'topright' }).addTo(map);

    // Mouse coordinates display
    map.on('mousemove', function(e) {
        document.getElementById('map-coordinates').textContent = 
            `Lat: ${e.latlng.lat.toFixed(5)}, Lng: ${e.latlng.lng.toFixed(5)}`;
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
        console.log('✓ All data loaded successfully');
        populateParkFilter();
    } catch (error) {
        console.error('❌ Error loading data:', error);
    } finally {
        showLoading(false);
    }
}

async function fetchParks() {
    try {
        const response = await fetch('/api/parks/geojson/');
        const data = await response.json();
        allParksData = data.features;
        displayParks(data);
        console.log(`✓ Parks loaded: ${data.features.length}`);
    } catch (error) {
        console.error('❌ Error fetching parks:', error);
    }
}

async function fetchTrails() {
    try {
        const response = await fetch('/api/trails/geojson/');
        const data = await response.json();
        allTrailsData = data.features;
        displayTrails(data);
        updateDataCounts();
        console.log(`✓ Trails loaded: ${data.features.length}`);
    } catch (error) {
        console.error('❌ Error fetching trails:', error);
    }
}

async function fetchPOIs() {
    try {
        const response = await fetch('/api/pois/geojson/');
        const data = await response.json();
        allPOIsData = data.features;
        displayPOIs(data);
        console.log(`✓ POIs loaded: ${data.features.length}`);
    } catch (error) {
        console.error('❌ Error fetching POIs:', error);
    }
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
        onEachFeature: function(feature, layer) {
            const props = feature.properties;
            const popupContent = `
                <h5>🏞️ ${props.name}</h5>
                <p><strong>Location:</strong> ${props.location || 'N/A'}</p>
                <p><strong>Area:</strong> ${props.area_hectares || 'N/A'} hectares</p>
            `;
            layer.bindPopup(popupContent);
        }
    }).addTo(layerGroups.parks);
    
    console.log(`✓ ${geojson.features.length} parks added to map`);
}

function displayTrails(geojson) {
    if (!geojson || !geojson.features) return;
    
    layerGroups.trails.clearLayers();
    
    const difficultyColors = {
        'beginner': '#10b981',
        'intermediate': '#3b82f6',
        'advanced': '#6b7280',
        'expert': '#ef4444'
    };
    
    L.geoJSON(geojson, {
        style: function(feature) {
            return {
                color: difficultyColors[feature.properties.difficulty] || '#3b82f6',
                weight: 4,
                opacity: 0.8
            };
        },
        onEachFeature: function(feature, layer) {
            const props = feature.properties;
            const popupContent = `
                <h5> ${props.name}</h5>
                <p><strong>Difficulty:</strong> ${props.difficulty}</p>
                <p><strong>Length:</strong> ${props.length_km} km</p>
                <p><strong>Elevation Gain:</strong> ${props.elevation_gain_m} m</p>
                ${props.description ? `<p>${props.description}</p>` : ''}
            `;
            layer.bindPopup(popupContent);
            
            // Store trail ID for focusing
            layer.trailId = props.id;
        }
    }).addTo(layerGroups.trails);
    
    console.log(`✓ ${geojson.features.length} trails added to map`);
    
    // Render trail cards in sidebar
    renderTrailCards(geojson.features);
}

function displayPOIs(geojson) {
    if (!geojson || !geojson.features) return;
    
    layerGroups.pois.clearLayers();
    
    const poiIcons = {
        'parking': '🅿️',
        'viewpoint': '🔭',
        'rest_area': '🪑',
        'water_source': '💧',
        'bike_repair': '🔧',
        'default': '📍'
    };
    
    L.geoJSON(geojson, {
        pointToLayer: function(feature, latlng) {
            const props = feature.properties;
            const icon = L.divIcon({
                html: poiIcons[props.poi_type] || poiIcons.default,
                className: 'poi-icon',
                iconSize: [30, 30]
            });
            return L.marker(latlng, { icon: icon });
        },
        onEachFeature: function(feature, layer) {
            const props = feature.properties;
            const popupContent = `
                <h5>${poiIcons[props.poi_type] || '📍'} ${props.name}</h5>
                <p><strong>Type:</strong> ${props.poi_type}</p>
                ${props.description ? `<p>${props.description}</p>` : ''}
            `;
            layer.bindPopup(popupContent);
        }
    }).addTo(layerGroups.pois);
    
    console.log(`✓ ${geojson.features.length} POIs added to map`);
}

// ============================================
// TRAIL CARDS RENDERING
// ============================================

function renderTrailCards(trails) {
    const trailList = document.getElementById('trail-list');
    const resultsCount = document.getElementById('results-count');
    
    if (!trails || trails.length === 0) {
        trailList.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-mountain"></i>
                <p>No trails found</p>
            </div>
        `;
        resultsCount.textContent = 'No trails found';
        return;
    }
    
    resultsCount.textContent = `Showing ${trails.length} trail${trails.length !== 1 ? 's' : ''}`;
    
    trailList.innerHTML = trails.map(trail => {
        const props = trail.properties;
        return `
            <div class="trail-card" data-trail-id="${props.id}" onclick="focusOnTrail(${props.id})">
                <div class="trail-card-header">
                    <h6 class="trail-card-title">${props.name}</h6>
                    <span class="difficulty-badge difficulty-${props.difficulty}">
                        ${props.difficulty}
                    </span>
                </div>
                <div class="trail-card-meta">
                    <span><i class="fas fa-ruler"></i> ${props.length_km} km</span>
                    <span><i class="fas fa-mountain"></i> ${props.elevation_gain_m}m</span>
                </div>
            </div>
        `;
    }).join('');
}

// Focus on specific trail when card clicked
window.focusOnTrail = function(trailId) {
    layerGroups.trails.eachLayer(layer => {
        if (layer.trailId === trailId) {
            map.fitBounds(layer.getBounds(), { padding: [50, 50] });
            layer.openPopup();
            
            // Highlight active card
            document.querySelectorAll('.trail-card').forEach(card => {
                card.classList.remove('active');
            });
            const activeCard = document.querySelector(`[data-trail-id="${trailId}"]`);
            if (activeCard) {
                activeCard.classList.add('active');
            }
        }
    });
};

// ============================================
// FILTER & SEARCH
// ============================================

function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('trail-search');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            if (this.value.length > 0) {
                clearSearchBtn.style.display = 'block';
            } else {
                clearSearchBtn.style.display = 'none';
            }
            filterTrails();
        });
    }
    
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', function() {
            searchInput.value = '';
            this.style.display = 'none';
            filterTrails();
        });
    }
    
    // Filters
    const difficultyFilter = document.getElementById('difficulty-filter');
    const parkFilter = document.getElementById('park-filter');
    const lengthFilter = document.getElementById('length-filter');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    
    if (difficultyFilter) {
        difficultyFilter.addEventListener('change', filterTrails);
    }
    
    if (parkFilter) {
        parkFilter.addEventListener('change', filterTrails);
    }
    
    if (lengthFilter) {
        lengthFilter.addEventListener('input', function() {
            document.getElementById('length-value').textContent = `${this.value} km`;
            filterTrails();
        });
    }
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            searchInput.value = '';
            difficultyFilter.value = '';
            parkFilter.value = '';
            lengthFilter.value = 50;
            document.getElementById('length-value').textContent = '50 km';
            clearSearchBtn.style.display = 'none';
            filterTrails();
        });
    }
}

function filterTrails() {
    const searchTerm = document.getElementById('trail-search').value.toLowerCase();
    const difficulty = document.getElementById('difficulty-filter').value;
    const maxLength = parseFloat(document.getElementById('length-filter').value);
    
    let filtered = allTrailsData.filter(trail => {
        const props = trail.properties;
        
        // Search filter
        if (searchTerm && !props.name.toLowerCase().includes(searchTerm)) {
            return false;
        }
        
        // Difficulty filter
        if (difficulty && props.difficulty !== difficulty) {
            return false;
        }
        
        // Length filter
        if (props.length_km > maxLength) {
            return false;
        }
        
        return true;
    });
    
    renderTrailCards(filtered);
    
    // Update map display
    displayTrails({
        type: 'FeatureCollection',
        features: filtered
    });
}

function populateParkFilter() {
    const parkFilter = document.getElementById('park-filter');
    const modalParkSelect = document.getElementById('modal-trail-park');
    
    if (!parkFilter) return;
    
    // Extract unique park names
    const parkNames = [...new Set(allParksData.map(p => p.properties.name))].sort();
    
    parkNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        parkFilter.appendChild(option.cloneNode(true));
        
        if (modalParkSelect) {
            modalParkSelect.appendChild(option);
        }
    });
}

// ============================================
// UTILITIES
// ============================================

function updateDataCounts() {
    const sidebarCount = document.getElementById('sidebar-trail-count');
    const navCount = document.getElementById('nav-trail-count');
    const count = allTrailsData.length;
    
    if (sidebarCount) {
        sidebarCount.textContent = count;
    }
    
    if (navCount) {
        navCount.textContent = count;
    }
    
    console.log(`✓ Trail counts updated: ${count}`);
}

function showLoading(show) {
    const loadingEl = document.getElementById('map-loading');
    if (loadingEl) {
        if (show) {
            loadingEl.classList.add('active');
        } else {
            loadingEl.classList.remove('active');
        }
    }
}

console.log('✓ MTB Trails Map script loaded');
