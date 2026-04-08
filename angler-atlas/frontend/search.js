// Search functionality — included on all authenticated pages
(function () {
    let searchTimeout = null;
    let dropdownEl = null;

    function initSearch() {
        const input = document.querySelector('.search-input');
        if (!input) return;

        // Create dropdown
        dropdownEl = document.createElement('div');
        dropdownEl.className = 'search-dropdown';
        dropdownEl.style.display = 'none';
        input.closest('.search-bar-container').appendChild(dropdownEl);

        input.addEventListener('keyup', (e) => {
            if (e.key === 'Escape') { closeDropdown(); return; }
            const q = input.value.trim();
            clearTimeout(searchTimeout);
            if (!q) { closeDropdown(); return; }
            searchTimeout = setTimeout(() => runSearch(q), 300);
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-bar-container')) closeDropdown();
        });
    }

    function closeDropdown() {
        if (dropdownEl) dropdownEl.style.display = 'none';
    }

    function escapeText(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    async function runSearch(query) {
        try {
            const data = await searchAPI(query);
            renderResults(data);
        } catch (err) {
            console.error('Search error:', err);
        }
    }

    function renderResults(data) {
        if (!dropdownEl) return;
        const users = data.users || [];
        const catches = data.catches || [];

        if (users.length === 0 && catches.length === 0) {
            dropdownEl.innerHTML = '<div class="search-empty">No results found</div>';
            dropdownEl.style.display = 'block';
            return;
        }

        let html = '';

        if (users.length > 0) {
            html += '<div class="search-section-title">Users</div>';
            users.forEach(u => {
                const initials = (u.username || '??').slice(0, 2).toUpperCase();
                const avatarHtml = u.profilePicture
                    ? `<img src="${escapeText(u.profilePicture)}" alt="" class="search-result-avatar-img">`
                    : `<span>${escapeText(initials)}</span>`;
                html += `<div class="search-result-item search-user" data-userid="${escapeText(u._id)}">
                    <div class="search-result-avatar">${avatarHtml}</div>
                    <div class="search-result-info">
                        <span class="search-result-name">${escapeText(u.username)}</span>
                        <span class="search-result-meta">${escapeText(u.rank)} &middot; ${u.points || 0} pts</span>
                    </div>
                    <button class="search-follow-btn" data-userid="${escapeText(u._id)}">Follow</button>
                </div>`;
            });
        }

        if (catches.length > 0) {
            html += '<div class="search-section-title">Catches</div>';
            catches.forEach(c => {
                const weight = c.weight ? `${c.weight} lbs` : '';
                html += `<div class="search-result-item search-catch" data-catchid="${escapeText(c._id)}">
                    <div class="search-result-catch-icon"><i class="fa-solid fa-fish"></i></div>
                    <div class="search-result-info">
                        <span class="search-result-name">${escapeText(c.species)}</span>
                        <span class="search-result-meta">${escapeText(weight)}${weight ? ' &middot; ' : ''}by ${escapeText(c.username)}</span>
                    </div>
                </div>`;
            });
        }

        dropdownEl.innerHTML = html;
        dropdownEl.style.display = 'block';

        // Event delegation inside dropdown
        dropdownEl.addEventListener('click', handleResultClick);
    }

    async function handleResultClick(e) {
        const followBtn = e.target.closest('.search-follow-btn');
        if (followBtn) {
            e.stopPropagation();
            const userId = followBtn.dataset.userid;
            try {
                const result = await followUser(userId);
                followBtn.textContent = result.following ? 'Unfollow' : 'Follow';
            } catch (err) {
                alert('Error: ' + err.message);
            }
            return;
        }

        const userItem = e.target.closest('.search-user');
        if (userItem) {
            window.location.href = '/profile?user=' + userItem.dataset.userid;
            closeDropdown();
            return;
        }

        const catchItem = e.target.closest('.search-catch');
        if (catchItem) {
            const catchId = catchItem.dataset.catchid;
            const card = document.querySelector(`[data-catch-id="${catchId}"]`);
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                card.style.boxShadow = '0 0 0 3px var(--accent)';
                setTimeout(() => { card.style.boxShadow = ''; }, 2000);
            } else {
                window.location.href = '/dashboard';
            }
            closeDropdown();
        }
    }

    // Init when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSearch);
    } else {
        initSearch();
    }
})();
