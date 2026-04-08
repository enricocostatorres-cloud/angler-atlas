// Global state
let currentPage = 1;
let map = null;
let userLocation = { latitude: 53.3498, longitude: -6.2603 }; // Default: Dublin, Ireland
let userMarkers = [];

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    if (!isLoggedIn()) {
        showAuthModal();
    } else {
        await initializeApp();
    }
    setupEventListeners();
    initDarkMode();
});

// Initialize main app
async function initializeApp() {
    try {
        // Fetch current user
        const user = await getCurrentUser();
        if (user) {
            await updateUserDashboard(user);
        }

        // Get user location
        await new Promise((resolve) => {
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

        // Load initial data
        await loadFeed();
        await loadLeaderboard();
        await loadGearSpotlight();
        loadWeather();
        loadMarine();
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

// Update user dashboard
async function updateUserDashboard(user) {
    document.getElementById('userRank').textContent = user.rank || 'Novice Angler';
    document.getElementById('userPoints').textContent = user.points || 0;

    // Get user's catch count
    const catches = await getUserCatches(user._id);
    document.getElementById('userCatches').textContent = Array.isArray(catches) ? catches.length : 0;
}

// Load feed
async function loadFeed(page = 1) {
    try {
        const data = await getFeed(page);
        const feedContainer = document.getElementById('feedContainer');

        if (page === 1) {
            feedContainer.innerHTML = '';
        }

        if (data.catches && data.catches.length > 0) {
            data.catches.forEach(catchData => {
                feedContainer.appendChild(createPostCard(catchData));
            });

            const loadMoreBtn = document.getElementById('loadMoreBtn');
            loadMoreBtn.innerHTML = '';
            if (data.pagination.pages > page) {
                const btn = document.createElement('button');
                btn.className = 'btn-primary';
                btn.textContent = 'Load More';
                btn.addEventListener('click', () => loadFeed(page + 1));
                loadMoreBtn.appendChild(btn);
            } else {
                loadMoreBtn.textContent = 'No more posts';
            }
        } else {
            if (page === 1) {
                const msg = document.createElement('p');
                msg.style.cssText = 'text-align: center; padding: 2rem;';
                msg.textContent = 'No catches yet. Be the first to log one!';
                feedContainer.appendChild(msg);
            }
        }
    } catch (error) {
        console.error('Error loading feed:', error);
    }
}

// Create post card as a DOM element (safe against XSS — all user text via textContent)
function createPostCard(catchData) {
    const user = catchData.userId;
    const likes = catchData.likes ? catchData.likes.length : 0;
    const timestamp = new Date(catchData.createdAt).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
    });
    const initials = user.username ? user.username.slice(0, 2).toUpperCase() : '??';

    const article = document.createElement('article');
    article.className = 'post-card';
    article.dataset.catchId = catchData._id;

    // Header
    const header = document.createElement('div');
    header.className = 'post-header';

    const avatar = document.createElement('div');
    avatar.className = 'user-avatar';
    if (user.profilePicture) {
        const avatarImg = document.createElement('img');
        avatarImg.src = user.profilePicture;
        avatarImg.alt = user.username;
        avatarImg.style.width = '100%';
        avatarImg.style.height = '100%';
        avatarImg.style.objectFit = 'cover';
        avatarImg.style.borderRadius = '50%';
        avatar.appendChild(avatarImg);
    } else {
        avatar.textContent = initials;
    }

    const userInfo = document.createElement('div');
    userInfo.style.flex = '1';

    const usernameEl = document.createElement('div');
    usernameEl.className = 'username';
    usernameEl.textContent = user.username;

    const timeEl = document.createElement('div');
    timeEl.className = 'post-time';
    timeEl.textContent = timestamp;

    userInfo.appendChild(usernameEl);
    userInfo.appendChild(timeEl);
    header.appendChild(avatar);
    header.appendChild(userInfo);

    // Image
    const imgContainer = document.createElement('div');
    imgContainer.className = 'post-image-container';
    const img = document.createElement('img');
    if (catchData.images && catchData.images.length > 0) {
        img.src = catchData.images[0];
    } else {
        img.src = `https://placehold.co/600x360/002f4b/ffffff?text=${encodeURIComponent(catchData.species)}`;
    }
    img.alt = catchData.species;
    img.className = 'post-image';
    img.loading = 'lazy';
    imgContainer.appendChild(img);

    // Data
    const postData = document.createElement('div');
    postData.className = 'post-data';

    const speciesTag = document.createElement('div');
    speciesTag.className = 'species-tag';
    speciesTag.textContent = catchData.species;
    postData.appendChild(speciesTag);

    const detailLine = document.createElement('div');
    const parts = [];
    if (catchData.weight) parts.push(`${catchData.weight} lbs`);
    if (catchData.length) parts.push(`${catchData.length} in`);
    if (catchData.depth)  parts.push(`${catchData.depth} ft depth`);
    detailLine.textContent = parts.length ? parts.join(' · ') : '';
    if (parts.length) postData.appendChild(detailLine);

    const locLine = document.createElement('div');
    locLine.textContent = catchData.location.address
        ? `📍 ${catchData.location.address}`
        : '📍 GPS Location';
    postData.appendChild(locLine);

    if (catchData.lureUsed) {
        const lureEl = document.createElement('div');
        lureEl.textContent = `🪝 ${catchData.lureUsed}`;
        postData.appendChild(lureEl);
    }

    if (catchData.releaseInfo?.wasReleased) {
        const releasedEl = document.createElement('div');
        releasedEl.textContent = '↩ Released';
        releasedEl.style.color = 'var(--success)';
        releasedEl.style.fontWeight = '600';
        postData.appendChild(releasedEl);
    }

    // Actions
    const actions = document.createElement('div');
    actions.className = 'post-actions';

    const likeBtn = document.createElement('button');
    likeBtn.className = 'action-btn like-btn';
    likeBtn.dataset.catchId = catchData._id;
    likeBtn.innerHTML = '<i class="fa-solid fa-heart"></i>';
    const likeCountEl = document.createElement('span');
    likeCountEl.className = 'like-count';
    likeCountEl.textContent = likes;
    likeBtn.appendChild(likeCountEl);

    const shareBtn = document.createElement('button');
    shareBtn.className = 'action-btn share-btn';
    shareBtn.innerHTML = '<i class="fa-solid fa-share-nodes"></i> Share';

    const commentBtn = document.createElement('button');
    commentBtn.className = 'action-btn comment-btn';
    commentBtn.innerHTML = '<i class="fa-regular fa-comment"></i> Comment';

    actions.appendChild(likeBtn);
    actions.appendChild(shareBtn);
    actions.appendChild(commentBtn);

    article.appendChild(header);
    article.appendChild(imgContainer);
    article.appendChild(postData);
    article.appendChild(actions);

    return article;
}

// Load leaderboard
async function loadLeaderboard() {
    try {
        const leaderboard = await getLeaderboard();
        const leaderboardList = document.getElementById('leaderboardList');
        leaderboardList.innerHTML = '';

        const medals = ['🥇', '🥈', '🥉'];

        leaderboard.slice(0, 10).forEach((user, index) => {
            const li = document.createElement('li');

            const rankEl = document.createElement('span');
            rankEl.className = 'lb-rank';
            rankEl.textContent = medals[index] || `${index + 1}`;

            const nameEl = document.createElement('span');
            nameEl.className = 'lb-name';
            nameEl.textContent = user.username;

            const ptsEl = document.createElement('span');
            ptsEl.className = 'lb-pts';
            ptsEl.textContent = `${user.calculatedPoints || user.points || 0} pts`;

            li.appendChild(rankEl);
            li.appendChild(nameEl);
            li.appendChild(ptsEl);
            leaderboardList.appendChild(li);
        });
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

// Load gear spotlight
async function loadGearSpotlight() {
    try {
        const result = await getStoreProducts();
        const spotlight = document.getElementById('gearSpotlight');

        if (result.products && result.products.length > 0) {
            const random = result.products[Math.floor(Math.random() * result.products.length)];

            spotlight.innerHTML = '';

            const nameEl = document.createElement('p');
            nameEl.className = 'gear-name';
            nameEl.textContent = random.name;

            const priceEl = document.createElement('p');
            priceEl.className = 'gear-price';
            priceEl.textContent = `$${random.price}`;

            const buyBtn = document.createElement('button');
            buyBtn.className = 'purchase-btn';
            buyBtn.textContent = 'View Deal';

            spotlight.appendChild(nameEl);
            spotlight.appendChild(priceEl);
            spotlight.appendChild(buyBtn);
        }
    } catch (error) {
        console.error('Error loading gear spotlight:', error);
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

// Load real weather data from Open-Meteo
async function loadWeather() {
    try {
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
        );
        const data = await response.json();

        if (data.current) {
            const temp = Math.round(data.current.temperature_2m);
            const weatherInfo = getWeatherInfo(data.current.weather_code);
            const wind = data.current.wind_speed_10m;
            const humidity = data.current.relative_humidity_2m;

            document.getElementById('weatherTemp').textContent = temp + '°C';
            document.getElementById('weatherCondition').innerHTML = '';
            const icon = document.createElement('i');
            icon.className = `fa-solid ${weatherInfo.icon}`;
            document.getElementById('weatherCondition').appendChild(icon);
            document.getElementById('weatherCondition').appendChild(document.createTextNode(' ' + weatherInfo.desc));

            document.getElementById('weatherWind').innerHTML = '';
            const windIcon = document.createElement('i');
            windIcon.className = 'fa-solid fa-wind';
            document.getElementById('weatherWind').appendChild(windIcon);
            document.getElementById('weatherWind').appendChild(document.createTextNode(` ${wind} km/h`));

            document.getElementById('weatherHumidity').innerHTML = '';
            const humIcon = document.createElement('i');
            humIcon.className = 'fa-solid fa-droplet';
            document.getElementById('weatherHumidity').appendChild(humIcon);
            document.getElementById('weatherHumidity').appendChild(document.createTextNode(` ${humidity}%`));

            document.getElementById('weatherExtra').style.display = 'flex';
        }
    } catch (error) {
        console.error('Error loading weather:', error);
    }
}

// Load marine/tide data from Open-Meteo Marine API
async function loadMarine() {
    try {
        const response = await fetch(
            `https://marine-api.open-meteo.com/v1/marine?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&current=wave_height,wave_direction,wave_period&daily=wave_height_max&timezone=auto`
        );
        const data = await response.json();

        const marineWidget = document.getElementById('marineWidget');
        if (!marineWidget) return;

        if (data.current && data.current.wave_height !== null && data.current.wave_height !== undefined) {
            document.getElementById('marineWaveHeight').textContent = data.current.wave_height + ' m';
            document.getElementById('marineWavePeriod').textContent = data.current.wave_period + ' s';
            document.getElementById('marineWaveDir').textContent = data.current.wave_direction + '°';

            const maxWave = data.daily?.wave_height_max?.[0];
            document.getElementById('marineMaxWave').textContent = maxWave != null ? maxWave + ' m' : '--';

            marineWidget.style.display = 'block';
        } else {
            document.getElementById('marineContent').innerHTML = '';
            const msg = document.createElement('p');
            msg.className = 'marine-unavailable';
            msg.textContent = 'No marine data available for this location';
            document.getElementById('marineContent').appendChild(msg);
            marineWidget.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading marine data:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    const postModal = document.getElementById('postModal');
    const authModal = document.getElementById('authModal');

    document.getElementById('openPostModalBtn')?.addEventListener('click', () => {
        if (!isLoggedIn()) {
            alert('Please log in first');
            return;
        }
        postModal.classList.add('show');
    });

    // Close modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.remove('show');
        });
    });

    // Close on background click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    });

    // Catch logging form
    document.getElementById('createPostForm')?.addEventListener('submit', handlePostSubmit);
    setupImagePreview();

    // Auth forms
    document.getElementById('loginFormElement')?.addEventListener('submit', handleLogin);
    document.getElementById('registerFormElement')?.addEventListener('submit', handleRegister);

    // Navigation — links are now plain <a> tags with href, no JS needed
    // Map modal still works as a fallback if someone triggers it directly

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        logout();
        window.location.href = '/';
    });

    // Event delegation for feed actions (like, share)
    const feedContainer = document.getElementById('feedContainer');
    feedContainer?.addEventListener('click', async (e) => {
        const likeBtn = e.target.closest('.like-btn');
        const shareBtn = e.target.closest('.share-btn');

        if (likeBtn) {
            e.preventDefault();
            const catchId = likeBtn.dataset.catchId;
            try {
                const result = await likeCatch(catchId);
                const likeCountEl = likeBtn.querySelector('.like-count');
                if (likeCountEl) likeCountEl.textContent = result.likes;
                likeBtn.classList.toggle('liked', result.liked);
            } catch (error) {
                alert('Error liking catch: ' + error.message);
            }
        }

        if (shareBtn) {
            e.preventDefault();
            alert('🎣 Link copied to clipboard!');
        }
    });
}

// Handle post submit
async function handlePostSubmit(e) {
    e.preventDefault();

    const catchData = {
        species: document.getElementById('speciesInput').value,
        weight: parseFloat(document.getElementById('weightInput').value) || null,
        length: parseFloat(document.getElementById('lengthInput').value) || null,
        depth: parseFloat(document.getElementById('depthInput').value) || null,
        longitude: userLocation.longitude,
        latitude: userLocation.latitude,
        address: document.getElementById('locationInput').value,
        lureUsed: document.getElementById('lureInput').value,
        waterConditions: {
            temperature: parseFloat(document.getElementById('tempInput').value) || null,
        },
        notes: document.getElementById('notesInput').value,
        visibility: document.getElementById('visibilitySelect').value,
        releaseInfo: {
            wasReleased: document.getElementById('releaseCheckbox').checked,
        },
    };

    try {
        // Upload image first if one is selected
        const fileInput = document.getElementById('catchImageInput');
        if (fileInput.files && fileInput.files[0]) {
            const uploadResult = await uploadCatchImage(fileInput.files[0]);
            catchData.images = [uploadResult.filePath];
        }

        await logCatch(catchData);
        alert('Catch logged successfully!');
        document.getElementById('postModal').classList.remove('show');
        document.getElementById('createPostForm').reset();
        clearImagePreview();
        currentPage = 1;
        await loadFeed();
    } catch (error) {
        alert('Error logging catch: ' + error.message);
    }
}

// Image preview handling
function setupImagePreview() {
    const fileInput = document.getElementById('catchImageInput');
    const removeBtn = document.getElementById('removeImageBtn');

    fileInput?.addEventListener('change', function () {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                document.getElementById('previewImg').src = e.target.result;
                document.getElementById('imagePreview').style.display = 'inline-block';
            };
            reader.readAsDataURL(file);
        } else {
            clearImagePreview();
        }
    });

    removeBtn?.addEventListener('click', function () {
        clearImagePreview();
    });
}

function clearImagePreview() {
    const fileInput = document.getElementById('catchImageInput');
    const preview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');

    if (fileInput) fileInput.value = '';
    if (previewImg) previewImg.src = '';
    if (preview) preview.style.display = 'none';
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        await login(email, password);
        document.getElementById('authModal').classList.remove('show');
        await initializeApp();
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
}

// Handle register
async function handleRegister(e) {
    e.preventDefault();

    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;

    if (password !== confirmPassword) { alert('Passwords do not match'); return; }
    if (password.length < 8) { alert('Password must be at least 8 characters'); return; }
    if (!/[A-Z]/.test(password)) { alert('Password must contain at least one uppercase letter'); return; }
    if (!/[0-9]/.test(password)) { alert('Password must contain at least one number'); return; }

    try {
        await register(username, email, password, confirmPassword);
        document.getElementById('authModal').classList.remove('show');
        await initializeApp();
    } catch (error) {
        alert('Registration failed: ' + error.message);
    }
}

// Toggle auth form
function toggleAuthForm(e) {
    e.preventDefault();
    document.getElementById('loginForm').style.display =
        document.getElementById('loginForm').style.display === 'none' ? 'block' : 'none';
    document.getElementById('registerForm').style.display =
        document.getElementById('registerForm').style.display === 'none' ? 'block' : 'none';
}

// Show auth modal
function showAuthModal() {
    document.getElementById('authModal').classList.add('show');
}

// Initialize Leaflet map (no API key required — uses OpenStreetMap tiles)
function initializeMap() {
    if (map) return; // Already initialized

    map = L.map('map').setView([userLocation.latitude, userLocation.longitude], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
    }).addTo(map);

    // User location marker
    L.marker([userLocation.latitude, userLocation.longitude])
        .addTo(map)
        .bindPopup('<strong>Your Location</strong>');

    // Load nearby catches
    loadNearbyOnMap();
}

// Escape user-supplied text for safe insertion into HTML strings
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Build popup HTML — all user values are HTML-escaped to prevent XSS
function buildPopupContent(catchData) {
    const species = escapeHtml(catchData.species);
    const username = escapeHtml(catchData.userId?.username || 'Unknown');
    const date = new Date(catchData.createdAt).toLocaleDateString();
    const weightLine = catchData.weight
        ? `Weight: ${escapeHtml(String(catchData.weight))} lbs<br>`
        : '';
    return `<div style="min-width:140px;">
        <strong>${species}</strong><br>
        By: ${username}<br>
        ${weightLine}
        ${date}
    </div>`;
}

// Load nearby catches on map
async function loadNearbyOnMap() {
    try {
        const catches = await getNearby(userLocation.longitude, userLocation.latitude);

        catches.forEach(catchData => {
            const lat = catchData.location.coordinates[1];
            const lng = catchData.location.coordinates[0];
            L.marker([lat, lng])
                .addTo(map)
                .bindPopup(buildPopupContent(catchData));
        });
    } catch (error) {
        console.error('Error loading nearby catches:', error);
    }
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

    // Initialise from saved preference
    const saved = localStorage.getItem('theme');
    applyTheme(saved === 'dark');

    toggle.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        applyTheme(!isDark);
    });
}
