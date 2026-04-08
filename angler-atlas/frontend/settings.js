// Settings page logic
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!isLoggedIn()) {
        window.location.href = '/';
        return;
    }
    await loadSettings();
    setupSettingsListeners();
    initDarkMode();
});

async function loadSettings() {
    try {
        currentUser = await getCurrentUser();
        if (!currentUser) {
            window.location.href = '/';
            return;
        }

        // Language
        const savedLang = localStorage.getItem('preferredLanguage') || 'en';
        document.getElementById('languageSelect').value = savedLang;
        updateLanguageHint(savedLang);

        // Plan
        const tier = currentUser.preferences?.subscriptionTier || 'free';
        const badge = document.getElementById('planBadge');
        const actionEl = document.getElementById('planAction');

        if (tier === 'premium') {
            badge.textContent = 'Premium';
            badge.classList.add('premium');
            actionEl.innerHTML = '';
            const msg = document.createElement('span');
            msg.style.cssText = 'font-size:0.85rem; color:var(--success); font-weight:600;';
            msg.textContent = "You're on Premium!";
            actionEl.appendChild(msg);
        } else {
            badge.textContent = 'Free';
            actionEl.innerHTML = '';
            const btn = document.createElement('button');
            btn.className = 'btn-upgrade';
            btn.innerHTML = '<i class="fa-solid fa-crown"></i> Upgrade to Premium';
            btn.addEventListener('click', () => {
                alert('Premium coming soon!');
            });
            actionEl.appendChild(btn);
        }

        // Bio
        document.getElementById('bioTextarea').value = currentUser.bio || '';
        document.getElementById('bioCharCount').textContent = (currentUser.bio || '').length;

    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

function updateLanguageHint(lang) {
    const hint = document.getElementById('languageHint');
    if (lang !== 'en') {
        hint.textContent = 'Translation coming soon';
    } else {
        hint.textContent = '';
    }
}

function setupSettingsListeners() {
    // Language change
    document.getElementById('languageSelect').addEventListener('change', (e) => {
        const lang = e.target.value;
        localStorage.setItem('preferredLanguage', lang);
        updateLanguageHint(lang);
    });

    // Bio char count
    document.getElementById('bioTextarea').addEventListener('input', function () {
        document.getElementById('bioCharCount').textContent = this.value.length;
    });

    // Save bio
    document.getElementById('saveBioBtn').addEventListener('click', async () => {
        const bio = document.getElementById('bioTextarea').value.trim();
        try {
            await updateUserProfile(currentUser._id, { bio });
            currentUser.bio = bio;
            alert('Bio saved successfully!');
        } catch (error) {
            alert('Error saving bio: ' + error.message);
        }
    });

    // Delete account flow
    const deleteBtn = document.getElementById('deleteAccountBtn');
    const confirmRow = document.getElementById('deleteConfirmRow');
    const confirmInput = document.getElementById('deleteConfirmInput');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

    deleteBtn.addEventListener('click', () => {
        confirmRow.style.display = 'flex';
        deleteBtn.style.display = 'none';
        confirmInput.focus();
    });

    confirmInput.addEventListener('input', () => {
        confirmDeleteBtn.disabled = confirmInput.value !== 'DELETE';
    });

    confirmDeleteBtn.addEventListener('click', async () => {
        if (confirmInput.value !== 'DELETE') return;

        try {
            confirmDeleteBtn.disabled = true;
            confirmDeleteBtn.textContent = 'Deleting...';
            await deleteAccount(currentUser._id);
            localStorage.removeItem('authToken');
            localStorage.removeItem('userId');
            localStorage.removeItem('theme');
            localStorage.removeItem('preferredLanguage');
            localStorage.removeItem('anglerCart');
            window.location.href = '/';
        } catch (error) {
            alert('Error deleting account: ' + error.message);
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Confirm Delete';
        }
    });

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        logout();
        window.location.href = '/';
    });
}

// Dark mode (same as other pages)
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
