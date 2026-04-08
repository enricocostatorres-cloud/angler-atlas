// Map page state
let map = null;
let userLocation = { latitude: 53.3498, longitude: -6.2603 }; // Default: Dublin
let catchMarkers = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!isLoggedIn()) {
        window.location.href = '/';
        return;
    }
    getUserLocation().then(() => {
        initMap();
        loadNearbyCatches();
        loadMapWeather();
    });
    setupMapListeners();
    initDarkMode();
});

// Get user location
function getUserLocation() {
    return new Promise((resolve) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    userLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    };
                    resolve();
                },
                () => resolve() // Fall back to Dublin default
            );
        } else {
            resolve();
        }
    });
}

// Initialize Leaflet map
function initMap() {
    map = L.map('fullMap').setView([userLocation.latitude, userLocation.longitude], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
    }).addTo(map);

    // User location marker (blue)
    const userIcon = L.divIcon({
        html: '<i class="fa-solid fa-location-crosshairs" style="color:#3b82f6;font-size:1.5rem;"></i>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        className: '',
    });

    L.marker([userLocation.latitude, userLocation.longitude], { icon: userIcon })
        .addTo(map)
        .bindPopup('<strong>Your Location</strong>');
}

// Load nearby catches and add markers
async function loadNearbyCatches() {
    try {
        const catches = await getNearby(userLocation.longitude, userLocation.latitude, 50000);

        // Clear old markers
        catchMarkers.forEach(m => map.removeLayer(m));
        catchMarkers = [];

        catches.forEach(catchData => {
            const lat = catchData.location.coordinates[1];
            const lng = catchData.location.coordinates[0];

            const marker = L.marker([lat, lng])
                .addTo(map)
                .bindPopup(buildCatchPopup(catchData));

            catchMarkers.push(marker);
        });

        document.getElementById('catchCount').textContent = catches.length;
    } catch (error) {
        console.error('Error loading nearby catches:', error);
    }
}

// Build popup HTML — uses escapeHtml for user content
function buildCatchPopup(catchData) {
    const species = escapeHtml(catchData.species);
    const username = escapeHtml(catchData.userId?.username || 'Unknown');
    const date = new Date(catchData.createdAt).toLocaleDateString();
    const weightLine = catchData.weight ? `Weight: ${escapeHtml(String(catchData.weight))} lbs<br>` : '';

    let imgHtml = '';
    if (catchData.images && catchData.images.length > 0) {
        imgHtml = `<img src="${escapeHtml(catchData.images[0])}" class="catch-popup-img" alt="${species}">`;
    }

    return `<div class="catch-popup">
        ${imgHtml}
        <strong>${species}</strong>
        <div class="popup-details">
            By: ${username}<br>
            ${weightLine}
            ${date}
        </div>
    </div>`;
}

// Escape HTML for safe popup insertion
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Search location using Nominatim
async function searchLocation(query) {
    if (!query.trim()) return;

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
            { headers: { 'Accept': 'application/json' } }
        );
        const results = await response.json();

        if (results && results.length > 0) {
            const { lat, lon } = results[0];
            userLocation = { latitude: parseFloat(lat), longitude: parseFloat(lon) };
            map.setView([userLocation.latitude, userLocation.longitude], 12);
            loadNearbyCatches();
            loadMapWeather();
        } else {
            alert('Location not found. Try a different search term.');
        }
    } catch (error) {
        console.error('Search error:', error);
        alert('Error searching location. Please try again.');
    }
}

// Weather code to description and icon
function getWeatherInfo(code) {
    const weatherMap = {
        0:  { desc: 'Clear sky',       icon: 'fa-sun' },
        1:  { desc: 'Mainly clear',    icon: 'fa-sun' },
        2:  { desc: 'Partly cloudy',   icon: 'fa-cloud-sun' },
        3:  { desc: 'Overcast',        icon: 'fa-cloud' },
        45: { desc: 'Foggy',           icon: 'fa-smog' },
        48: { desc: 'Icy fog',         icon: 'fa-smog' },
        51: { desc: 'Light drizzle',   icon: 'fa-cloud-rain' },
        53: { desc: 'Drizzle',         icon: 'fa-cloud-rain' },
        55: { desc: 'Heavy drizzle',   icon: 'fa-cloud-rain' },
        61: { desc: 'Light rain',      icon: 'fa-cloud-rain' },
        63: { desc: 'Rain',            icon: 'fa-cloud-showers-heavy' },
        65: { desc: 'Heavy rain',      icon: 'fa-cloud-showers-heavy' },
        71: { desc: 'Light snow',      icon: 'fa-snowflake' },
        73: { desc: 'Snow',            icon: 'fa-snowflake' },
        75: { desc: 'Heavy snow',      icon: 'fa-snowflake' },
        80: { desc: 'Rain showers',    icon: 'fa-cloud-showers-heavy' },
        81: { desc: 'Moderate showers', icon: 'fa-cloud-showers-heavy' },
        82: { desc: 'Heavy showers',   icon: 'fa-cloud-showers-heavy' },
        95: { desc: 'Thunderstorm',    icon: 'fa-cloud-bolt' },
        96: { desc: 'Thunderstorm w/ hail', icon: 'fa-cloud-bolt' },
        99: { desc: 'Severe thunderstorm',  icon: 'fa-cloud-bolt' },
    };
    return weatherMap[code] || { desc: 'Unknown', icon: 'fa-cloud' };
}

// Load weather for map card
async function loadMapWeather() {
    try {
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&current=temperature_2m,weather_code&timezone=auto`
        );
        const data = await response.json();

        if (data.current) {
            const temp = Math.round(data.current.temperature_2m);
            const weatherInfo = getWeatherInfo(data.current.weather_code);

            document.getElementById('mapWeatherTemp').textContent = temp + '°C';
            document.getElementById('mapWeatherCond').textContent = weatherInfo.desc;
            document.getElementById('mapWeatherIcon').innerHTML = `<i class="fa-solid ${weatherInfo.icon}"></i>`;
            document.getElementById('mapWeatherCard').style.display = 'flex';
        }
    } catch (error) {
        console.error('Error loading weather:', error);
    }
}

// Setup event listeners
function setupMapListeners() {
    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        logout();
        window.location.href = '/';
    });

    // Search
    document.getElementById('mapSearchBtn')?.addEventListener('click', () => {
        searchLocation(document.getElementById('mapSearchInput').value);
    });

    document.getElementById('mapSearchInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchLocation(e.target.value);
        }
    });
}

// Dark mode
function initDarkMode() {
    const toggle = document.getElementById('darkModeToggle');
    if (!toggle) return;

    function applyTheme(dark) {
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
        toggle.innerHTML = dark
            ? '<i class="fa-solid fa-sun"></i>'
            : '<i class="fa-solid fa-moon"></i>';
        toggle.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
        localStorage.setItem('theme', dark ? 'dark' : 'light');
    }

    const saved = localStorage.getItem('theme');
    applyTheme(saved === 'dark');

    toggle.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        applyTheme(!isDark);
    });
}
