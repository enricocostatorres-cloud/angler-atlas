// Profile page state
let currentUser = null;
let userCatches = [];
let editMode = false;

// Initialize profile page
document.addEventListener('DOMContentLoaded', async () => {
    if (!isLoggedIn()) {
        window.location.href = '/';
        return;
    }
    await loadProfile();
    setupProfileListeners();
    initDarkMode();
});

// Load all profile data
async function loadProfile() {
    try {
        currentUser = await getCurrentUser();
        if (!currentUser) {
            window.location.href = '/';
            return;
        }
        renderProfileHeader(currentUser);

        userCatches = await getUserCatches(currentUser._id);
        if (!Array.isArray(userCatches)) userCatches = [];

        renderStats(currentUser, userCatches);
        renderCatches(userCatches);
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Render profile header
function renderProfileHeader(user) {
    const initials = user.username ? user.username.slice(0, 2).toUpperCase() : '??';
    const avatarEl = document.getElementById('profileAvatar');
    const initialsEl = document.getElementById('profileInitials');

    if (user.profilePicture) {
        avatarEl.innerHTML = '';
        const img = document.createElement('img');
        img.src = user.profilePicture;
        img.alt = user.username;
        avatarEl.appendChild(img);
    } else {
        initialsEl.textContent = initials;
    }

    document.getElementById('profileUsername').textContent = user.username;
    document.getElementById('profileBio').textContent = user.bio || 'No bio yet.';

    const rankEl = document.getElementById('profileRank');
    rankEl.innerHTML = '';
    const rankIcon = document.createElement('i');
    rankIcon.className = 'fa-solid fa-trophy';
    rankEl.appendChild(rankIcon);
    rankEl.appendChild(document.createTextNode(' ' + (user.rank || 'Novice Angler')));

    const pointsEl = document.getElementById('profilePoints');
    pointsEl.innerHTML = '';
    const pointsIcon = document.createElement('i');
    pointsIcon.className = 'fa-solid fa-star';
    pointsEl.appendChild(pointsIcon);
    pointsEl.appendChild(document.createTextNode(' ' + (user.points || 0) + ' pts'));

    const planEl = document.getElementById('profilePlan');
    const tier = user.preferences?.subscriptionTier || 'free';
    planEl.innerHTML = '';
    const planIcon = document.createElement('i');
    planIcon.className = 'fa-solid fa-crown';
    planEl.appendChild(planIcon);
    planEl.appendChild(document.createTextNode(' ' + (tier === 'premium' ? 'Premium' : 'Free')));
    if (tier === 'premium') {
        planEl.classList.add('premium');
    }

    document.getElementById('followerCount').textContent = user.followers ? user.followers.length : 0;
    document.getElementById('followingCount').textContent = user.following ? user.following.length : 0;
}

// Render stats dashboard
function renderStats(user, catches) {
    document.getElementById('statTotalCatches').textContent = catches.length;

    // Most caught species
    if (catches.length > 0) {
        const speciesCount = {};
        catches.forEach(c => {
            const s = c.species || 'Unknown';
            speciesCount[s] = (speciesCount[s] || 0) + 1;
        });
        const topSpecies = Object.entries(speciesCount).sort((a, b) => b[1] - a[1])[0];
        document.getElementById('statTopSpecies').textContent = topSpecies[0];
    }

    // Average weight
    const weightsArr = catches.filter(c => c.weight).map(c => c.weight);
    if (weightsArr.length > 0) {
        const avg = weightsArr.reduce((a, b) => a + b, 0) / weightsArr.length;
        document.getElementById('statAvgWeight').textContent = avg.toFixed(1) + ' lbs';
    }

    // Total likes
    const totalLikes = catches.reduce((sum, c) => sum + (c.likes ? c.likes.length : 0), 0);
    document.getElementById('statTotalLikes').textContent = totalLikes;

    // Most used lure
    const lures = catches.filter(c => c.lureUsed).map(c => c.lureUsed);
    if (lures.length > 0) {
        const lureCount = {};
        lures.forEach(l => { lureCount[l] = (lureCount[l] || 0) + 1; });
        const topLure = Object.entries(lureCount).sort((a, b) => b[1] - a[1])[0];
        document.getElementById('statTopLure').textContent = topLure[0];
    }

    // Favorite location
    const locations = catches.filter(c => c.location?.address).map(c => c.location.address);
    if (locations.length > 0) {
        const locCount = {};
        locations.forEach(l => { locCount[l] = (locCount[l] || 0) + 1; });
        const topLoc = Object.entries(locCount).sort((a, b) => b[1] - a[1])[0];
        document.getElementById('statTopLocation').textContent = topLoc[0];
    }

    // Member since
    if (user.createdAt) {
        const date = new Date(user.createdAt);
        document.getElementById('statMemberSince').textContent = date.toLocaleDateString(undefined, {
            year: 'numeric', month: 'short',
        });
    }

    // Followers stat
    document.getElementById('statFollowers').textContent = user.followers ? user.followers.length : 0;
}

// Render catches grid
function renderCatches(catches) {
    const grid = document.getElementById('catchesGrid');
    grid.innerHTML = '';

    if (catches.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-catches';
        empty.innerHTML = '<i class="fa-solid fa-fish"></i>';
        const p = document.createElement('p');
        p.textContent = 'No catches yet. Head to the Feed to log your first catch!';
        empty.appendChild(p);
        grid.appendChild(empty);
        return;
    }

    catches.forEach(catchData => {
        grid.appendChild(createCatchCard(catchData));
    });
}

// Create a single catch card
function createCatchCard(catchData) {
    const card = document.createElement('div');
    card.className = 'catch-card';
    card.dataset.catchId = catchData._id;

    // Image
    const img = document.createElement('img');
    img.className = 'catch-card-image';
    if (catchData.images && catchData.images.length > 0) {
        img.src = catchData.images[0];
    } else {
        img.src = `https://placehold.co/400x180/002f4b/ffffff?text=${encodeURIComponent(catchData.species)}`;
    }
    img.alt = catchData.species;
    img.loading = 'lazy';
    card.appendChild(img);

    // Body
    const body = document.createElement('div');
    body.className = 'catch-card-body';

    const speciesTag = document.createElement('span');
    speciesTag.className = 'catch-card-species';
    speciesTag.textContent = catchData.species;
    body.appendChild(speciesTag);

    const details = document.createElement('div');
    details.className = 'catch-card-details';
    const parts = [];
    if (catchData.weight) parts.push(catchData.weight + ' lbs');
    if (catchData.location?.address) parts.push(catchData.location.address);
    const date = new Date(catchData.createdAt).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
    });
    parts.push(date);
    details.textContent = parts.join(' \u00B7 ');
    body.appendChild(details);
    card.appendChild(body);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'catch-card-footer';

    const likes = document.createElement('span');
    likes.className = 'catch-card-likes';
    const heartIcon = document.createElement('i');
    heartIcon.className = 'fa-solid fa-heart';
    likes.appendChild(heartIcon);
    likes.appendChild(document.createTextNode(' ' + (catchData.likes ? catchData.likes.length : 0)));
    footer.appendChild(likes);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.dataset.catchId = catchData._id;
    const trashIcon = document.createElement('i');
    trashIcon.className = 'fa-solid fa-trash';
    deleteBtn.appendChild(trashIcon);
    deleteBtn.appendChild(document.createTextNode(' Delete'));
    footer.appendChild(deleteBtn);

    card.appendChild(footer);
    return card;
}

// Setup event listeners
function setupProfileListeners() {
    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        logout();
        window.location.href = '/';
    });

    // Edit profile toggle
    document.getElementById('editProfileBtn')?.addEventListener('click', () => {
        toggleEditMode(true);
    });

    document.getElementById('cancelEditBtn')?.addEventListener('click', () => {
        toggleEditMode(false);
    });

    // Save profile
    document.getElementById('saveProfileBtn')?.addEventListener('click', handleSaveProfile);

    // Bio char count
    document.getElementById('editBio')?.addEventListener('input', function () {
        document.getElementById('bioCharCount').textContent = this.value.length;
    });

    // Profile picture upload
    document.getElementById('profilePicInput')?.addEventListener('change', handleProfilePicUpload);

    // Delete catch (event delegation)
    document.getElementById('catchesGrid')?.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.btn-delete');
        if (!deleteBtn) return;

        const catchId = deleteBtn.dataset.catchId;
        if (!confirm('Are you sure you want to delete this catch?')) return;

        try {
            await deleteCatch(catchId);
            const card = deleteBtn.closest('.catch-card');
            if (card) card.remove();

            // Update catches array and re-render stats
            userCatches = userCatches.filter(c => c._id !== catchId);
            renderStats(currentUser, userCatches);

            // Show empty state if no catches left
            if (userCatches.length === 0) {
                renderCatches([]);
            }
        } catch (error) {
            alert('Error deleting catch: ' + error.message);
        }
    });
}

// Toggle edit mode
function toggleEditMode(show) {
    const form = document.getElementById('editProfileForm');
    editMode = show;

    if (show) {
        document.getElementById('editUsername').value = currentUser.username || '';
        document.getElementById('editBio').value = currentUser.bio || '';
        document.getElementById('editLocation').value = currentUser.location || '';
        document.getElementById('bioCharCount').textContent = (currentUser.bio || '').length;
        form.style.display = 'block';
    } else {
        form.style.display = 'none';
    }
}

// Save profile changes
async function handleSaveProfile() {
    const username = document.getElementById('editUsername').value.trim();
    const bio = document.getElementById('editBio').value.trim();
    const location = document.getElementById('editLocation').value.trim();

    if (!username || username.length < 3) {
        alert('Username must be at least 3 characters.');
        return;
    }

    try {
        const updated = await updateUserProfile(currentUser._id, {
            bio,
            location,
        });
        currentUser = { ...currentUser, ...updated };
        renderProfileHeader(currentUser);
        toggleEditMode(false);
    } catch (error) {
        alert('Error saving profile: ' + error.message);
    }
}

// Handle profile picture upload
async function handleProfilePicUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const uploadResult = await uploadImage(file);
        const updated = await updateUserProfile(currentUser._id, {
            profilePicture: uploadResult.url,
        });
        currentUser = { ...currentUser, ...updated };
        renderProfileHeader(currentUser);
    } catch (error) {
        alert('Error uploading photo: ' + error.message);
    }

    // Reset input so the same file can be re-selected
    e.target.value = '';
}

// Dark mode (same logic as script.js)
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
