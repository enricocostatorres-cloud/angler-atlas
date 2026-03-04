// Global state
let currentPage = 1;
let map = null;
let userLocation = { latitude: 40.7128, longitude: -74.0060 }; // Default: NYC
let userMarkers = [];

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    // Check for ?modal= query param from landing page
    const urlParams = new URLSearchParams(window.location.search);
    const modalParam = urlParams.get('modal');

    if (!isLoggedIn()) {
        showAuthModal(modalParam || 'login');
    } else {
        // Clean URL if query param present
        if (modalParam) {
            window.history.replaceState({}, '', '/app');
        }
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

// Create post card as a DOM element (safe against XSS — all user text via textContent)
function createPostCard(catchData) {
    const user = catchData.userId;
    const likes = catchData.likes ? catchData.likes.length : 0;
    const commentCount = catchData.comments ? catchData.comments.length : 0;
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
    avatar.textContent = initials;

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

    // Image — show uploaded photo if available, otherwise placeholder
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

    // Data (metric units)
    const postData = document.createElement('div');
    postData.className = 'post-data';

    const speciesTag = document.createElement('div');
    speciesTag.className = 'species-tag';
    speciesTag.textContent = catchData.species;
    postData.appendChild(speciesTag);

    const detailLine = document.createElement('div');
    const parts = [];
    if (catchData.weight) parts.push(`${catchData.weight} kg`);
    if (catchData.length) parts.push(`${catchData.length} cm`);
    if (catchData.depth)  parts.push(`${catchData.depth} m depth`);
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
    commentBtn.dataset.catchId = catchData._id;
    commentBtn.innerHTML = '<i class="fa-regular fa-comment"></i> ';
    const commentCountEl = document.createElement('span');
    commentCountEl.className = 'comment-count';
    commentCountEl.textContent = commentCount > 0 ? commentCount : 'Comment';
    commentBtn.appendChild(commentCountEl);

    actions.appendChild(likeBtn);
    actions.appendChild(shareBtn);
    actions.appendChild(commentBtn);

    // Comment section (hidden by default)
    const commentSection = document.createElement('div');
    commentSection.className = 'comment-section';
    commentSection.style.display = 'none';
    commentSection.dataset.catchId = catchData._id;

    // Existing comments
    const commentList = document.createElement('div');
    commentList.className = 'comment-list';
    if (catchData.comments && catchData.comments.length > 0) {
        catchData.comments.forEach(comment => {
            commentList.appendChild(createCommentElement(comment));
        });
    }

    // Comment input
    const commentForm = document.createElement('div');
    commentForm.className = 'comment-form';
    const commentInput = document.createElement('input');
    commentInput.type = 'text';
    commentInput.className = 'comment-input';
    commentInput.placeholder = 'Write a comment…';
    const commentSubmit = document.createElement('button');
    commentSubmit.className = 'comment-submit';
    commentSubmit.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
    commentSubmit.dataset.catchId = catchData._id;
    commentForm.appendChild(commentInput);
    commentForm.appendChild(commentSubmit);

    commentSection.appendChild(commentList);
    commentSection.appendChild(commentForm);

    article.appendChild(header);
    article.appendChild(imgContainer);
    article.appendChild(postData);
    article.appendChild(actions);
    article.appendChild(commentSection);

    return article;
}

// Create a single comment DOM element
function createCommentElement(comment) {
    const el = document.createElement('div');
    el.className = 'comment-item';

    const user = comment.userId;
    const nameEl = document.createElement('strong');
    nameEl.className = 'comment-author';
    nameEl.textContent = (user && user.username) || comment.username || 'Angler';

    const textEl = document.createElement('span');
    textEl.className = 'comment-text';
    textEl.textContent = ' ' + comment.text;

    const timeEl = document.createElement('span');
    timeEl.className = 'comment-time';
    timeEl.textContent = new Date(comment.createdAt).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric',
    });

    el.appendChild(nameEl);
    el.appendChild(textEl);
    el.appendChild(timeEl);
    return el;
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

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        logout();
        window.location.href = '/';
    });

    // Photo file name display
    document.getElementById('photoInput')?.addEventListener('change', (e) => {
        const label = document.getElementById('photoFileName');
        label.textContent = e.target.files.length > 0
            ? e.target.files[0].name
            : 'Add a photo of your catch';
    });

    // Event delegation for feed actions (like, share, comment)
    const feedContainer = document.getElementById('feedContainer');
    feedContainer?.addEventListener('click', async (e) => {
        const likeBtn = e.target.closest('.like-btn');
        const shareBtn = e.target.closest('.share-btn');
        const commentBtn = e.target.closest('.comment-btn');
        const commentSubmitBtn = e.target.closest('.comment-submit');

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
            alert('Link copied to clipboard!');
        }

        // Toggle comment section
        if (commentBtn) {
            e.preventDefault();
            const card = commentBtn.closest('.post-card');
            const section = card.querySelector('.comment-section');
            if (section) {
                const isOpen = section.style.display !== 'none';
                section.style.display = isOpen ? 'none' : 'block';
                if (!isOpen) {
                    section.querySelector('.comment-input')?.focus();
                }
            }
        }

        // Submit comment
        if (commentSubmitBtn) {
            e.preventDefault();
            const catchId = commentSubmitBtn.dataset.catchId;
            const form = commentSubmitBtn.closest('.comment-form');
            const input = form.querySelector('.comment-input');
            const text = input.value.trim();
            if (!text) return;

            try {
                const comments = await addComment(catchId, text);
                input.value = '';

                // Re-render comment list
                const commentList = commentSubmitBtn.closest('.comment-section').querySelector('.comment-list');
                commentList.innerHTML = '';
                comments.forEach(c => commentList.appendChild(createCommentElement(c)));

                // Update comment count on button
                const card = commentSubmitBtn.closest('.post-card');
                const countEl = card.querySelector('.comment-count');
                if (countEl) countEl.textContent = comments.length;
            } catch (error) {
                alert('Error posting comment: ' + error.message);
            }
        }
    });

    // Submit comment on Enter key
    feedContainer?.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter' && e.target.classList.contains('comment-input')) {
            e.preventDefault();
            const submitBtn = e.target.closest('.comment-form').querySelector('.comment-submit');
            submitBtn?.click();
        }
    });
}

// Handle post submit (with optional photo upload)
async function handlePostSubmit(e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append('species', document.getElementById('speciesInput').value);
    formData.append('latitude', userLocation.latitude);
    formData.append('longitude', userLocation.longitude);
    formData.append('address', document.getElementById('locationInput').value);
    formData.append('visibility', document.getElementById('visibilitySelect').value);

    const weight = parseFloat(document.getElementById('weightInput').value);
    if (weight) formData.append('weight', weight);
    const length = parseFloat(document.getElementById('lengthInput').value);
    if (length) formData.append('length', length);
    const depth = parseFloat(document.getElementById('depthInput').value);
    if (depth) formData.append('depth', depth);

    const lure = document.getElementById('lureInput').value;
    if (lure) formData.append('lureUsed', lure);
    const notes = document.getElementById('notesInput').value;
    if (notes) formData.append('notes', notes);

    const temp = parseFloat(document.getElementById('tempInput').value);
    if (temp) formData.append('waterTemperature', temp);

    if (document.getElementById('releaseCheckbox').checked) {
        formData.append('wasReleased', 'true');
    }

    // Photo
    const photoInput = document.getElementById('photoInput');
    if (photoInput.files.length > 0) {
        formData.append('photo', photoInput.files[0]);
    }

    try {
        await logCatchWithPhoto(formData);
        alert('Catch logged successfully!');
        document.getElementById('postModal').classList.remove('show');
        document.getElementById('createPostForm').reset();
        document.getElementById('photoFileName').textContent = 'Add a photo of your catch';
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
        // Clean URL query params and load app
        window.history.replaceState({}, '', '/app');
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
        window.history.replaceState({}, '', '/app');
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

// Show auth modal with optional form type
function showAuthModal(formType) {
    document.getElementById('authModal').classList.add('show');
    if (formType === 'register') {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
    } else {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
    }
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
        ? `Weight: ${escapeHtml(String(catchData.weight))} kg<br>`
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
