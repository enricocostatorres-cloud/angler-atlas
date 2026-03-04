// Global state
let currentPage = 1;
let map = null;
let userLocation = { latitude: 40.7128, longitude: -74.0060 }; // Default: NYC
let userMarkers = [];

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in
    if (!isLoggedIn()) {
        showAuthModal();
    } else {
        await initializeApp();
    }

    setupEventListeners();
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
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    userLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    };
                },
                () => {
                    // Fall back to default location silently
                }
            );
        }

        // Load initial data
        await loadFeed();
        await loadLeaderboard();
        await loadGearSpotlight();
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

// Create post card as a DOM element (safe against XSS)
function createPostCard(catchData) {
    const user = catchData.userId;
    const likes = catchData.likes ? catchData.likes.length : 0;
    const timestamp = new Date(catchData.createdAt).toLocaleDateString();

    const article = document.createElement('article');
    article.className = 'post-card';
    article.dataset.catchId = catchData._id;

    // Header
    const header = document.createElement('div');
    header.className = 'post-header';

    const avatar = document.createElement('div');
    avatar.className = 'user-avatar';

    const userInfo = document.createElement('div');
    userInfo.style.flex = '1';

    const usernameEl = document.createElement('span');
    usernameEl.className = 'username';
    usernameEl.textContent = user.username;

    const timeEl = document.createElement('div');
    timeEl.style.cssText = 'font-size: 0.8rem; color: #999;';
    timeEl.textContent = timestamp;

    userInfo.appendChild(usernameEl);
    userInfo.appendChild(timeEl);
    header.appendChild(avatar);
    header.appendChild(userInfo);

    // Image
    const imgContainer = document.createElement('div');
    imgContainer.className = 'post-image-container';
    const img = document.createElement('img');
    img.src = `https://placehold.co/600x400/00578a/ffffff?text=${encodeURIComponent(catchData.species)}`;
    img.alt = catchData.species;
    img.className = 'post-image';
    imgContainer.appendChild(img);

    // Data
    const postData = document.createElement('div');
    postData.className = 'post-data';

    const catchLine = document.createElement('span');
    let catchText = `Catch: ${catchData.species}`;
    if (catchData.weight) catchText += ` | Weight: ${catchData.weight} lbs`;
    if (catchData.length) catchText += ` | Length: ${catchData.length} in`;
    if (catchData.depth) catchText += ` | Depth: ${catchData.depth} ft`;
    catchLine.textContent = catchText;
    postData.appendChild(catchLine);

    postData.appendChild(document.createElement('br'));

    const locLine = document.createElement('span');
    let locText = `Location: ${catchData.location.address || 'GPS Location'}`;
    if (catchData.lureUsed) locText += ` | Lure: ${catchData.lureUsed}`;
    locLine.textContent = locText;
    postData.appendChild(locLine);

    if (catchData.releaseInfo?.wasReleased) {
        postData.appendChild(document.createElement('br'));
        const releasedEl = document.createElement('strong');
        releasedEl.textContent = '✓ Released';
        postData.appendChild(releasedEl);
    }

    // Actions
    const actions = document.createElement('div');
    actions.className = 'post-actions';

    const likeBtn = document.createElement('button');
    likeBtn.className = 'action-btn like-btn';
    likeBtn.dataset.catchId = catchData._id;
    // Icon is hardcoded markup, not user content
    likeBtn.innerHTML = '<i class="fa-solid fa-fish"></i> ';
    const likeCountEl = document.createElement('span');
    likeCountEl.className = 'like-count';
    likeCountEl.textContent = likes;
    likeBtn.appendChild(likeCountEl);

    const shareBtn = document.createElement('button');
    shareBtn.className = 'action-btn share-btn';
    shareBtn.innerHTML = '<i class="fa-solid fa-anchor"></i> Share';

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

        leaderboard.slice(0, 10).forEach((user, index) => {
            const li = document.createElement('li');
            const nameSpan = document.createElement('span');
            nameSpan.textContent = `${index + 1}. ${user.username}`;
            const ptsSpan = document.createElement('span');
            ptsSpan.textContent = `${user.calculatedPoints || user.points || 0} pts`;
            li.appendChild(nameSpan);
            li.appendChild(ptsSpan);
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
            const nameStrong = document.createElement('strong');
            nameStrong.textContent = random.name;
            nameEl.appendChild(nameStrong);

            const priceEl = document.createElement('p');
            priceEl.style.cssText = 'color: var(--accent-copper); font-weight: bold;';
            priceEl.textContent = `$${random.price}`;

            const buyBtn = document.createElement('button');
            buyBtn.className = 'purchase-btn';
            buyBtn.textContent = 'Buy Now';

            spotlight.appendChild(nameEl);
            spotlight.appendChild(priceEl);
            spotlight.appendChild(buyBtn);
        }
    } catch (error) {
        console.error('Error loading gear spotlight:', error);
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

    // Auth forms
    document.getElementById('loginFormElement')?.addEventListener('submit', handleLogin);
    document.getElementById('registerFormElement')?.addEventListener('submit', handleRegister);

    // Navigation
    document.getElementById('mapLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('mapModal').classList.add('show');
        initializeMap();
        // Leaflet needs the container to be visible before it can calculate tile layout
        setTimeout(() => map && map.invalidateSize(), 100);
    });

    document.getElementById('profileLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Profile page coming soon!');
    });

    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
        window.location.reload();
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
        await logCatch(catchData);
        alert('Catch logged successfully!');
        document.getElementById('postModal').classList.remove('show');
        document.getElementById('createPostForm').reset();
        currentPage = 1;
        await loadFeed();
    } catch (error) {
        alert('Error logging catch: ' + error.message);
    }
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
