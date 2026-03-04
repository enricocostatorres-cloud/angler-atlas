// Redirect authenticated users straight to the app
document.addEventListener('DOMContentLoaded', () => {
    if (isLoggedIn()) {
        window.location.href = '/dashboard';
        return;
    }
    setupEventListeners();
    initHamburger();
    initScrollNav();
});

// ── Event listeners ──────────────────────────────────────────────
function setupEventListeners() {
    const loginForm    = document.getElementById('loginFormElement');
    const registerForm = document.getElementById('registerFormElement');

    if (loginForm)    loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleRegister);

    // Close modal on backdrop click
    const overlay = document.getElementById('authModal');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeAuthModal();
        });
    }

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAuthModal();
    });
}

// ── Auth modal ────────────────────────────────────────────────────
function showAuthModal(formType) {
    const overlay      = document.getElementById('authModal');
    const loginForm    = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (!overlay) return;

    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';

    if (formType === 'login') {
        loginForm.style.display    = 'block';
        registerForm.style.display = 'none';
    } else {
        loginForm.style.display    = 'none';
        registerForm.style.display = 'block';
    }
}

function closeAuthModal() {
    const overlay = document.getElementById('authModal');
    if (overlay) overlay.classList.remove('show');
    document.body.style.overflow = '';
}

function toggleAuthForm(e) {
    e.preventDefault();
    const loginForm    = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showingLogin = loginForm.style.display !== 'none';
    loginForm.style.display    = showingLogin ? 'none'  : 'block';
    registerForm.style.display = showingLogin ? 'block' : 'none';
}

// ── Handle login ──────────────────────────────────────────────────
async function handleLogin(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.textContent = 'Signing in…';
    btn.disabled = true;

    try {
        const result = await login(
            document.getElementById('loginEmail').value,
            document.getElementById('loginPassword').value
        );

        if (result) {
            e.target.reset();
            closeAuthModal();
            setTimeout(() => { window.location.href = '/dashboard'; }, 300);
        }
    } catch (error) {
        alert('Login failed: ' + error.message);
    } finally {
        btn.textContent = 'Sign In';
        btn.disabled = false;
    }
}

// ── Handle register ───────────────────────────────────────────────
async function handleRegister(e) {
    e.preventDefault();

    const password        = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;

    if (password !== confirmPassword) { alert('Passwords do not match'); return; }
    if (password.length < 6)          { alert('Password must be at least 6 characters'); return; }

    const btn = e.target.querySelector('button[type="submit"]');
    btn.textContent = 'Creating account…';
    btn.disabled = true;

    try {
        const result = await register(
            document.getElementById('regUsername').value,
            document.getElementById('regEmail').value,
            password,
            confirmPassword
        );

        if (result) {
            e.target.reset();
            closeAuthModal();
            setTimeout(() => { window.location.href = '/dashboard'; }, 300);
        }
    } catch (error) {
        alert('Registration failed: ' + error.message);
    } finally {
        btn.textContent = 'Create Account';
        btn.disabled = false;
    }
}

// ── Hamburger menu ────────────────────────────────────────────────
function initHamburger() {
    const hamburger = document.getElementById('hamburger');
    const navLinks  = document.getElementById('navLinks');
    if (!hamburger || !navLinks) return;

    hamburger.addEventListener('click', () => {
        const open = navLinks.classList.toggle('open');
        hamburger.classList.toggle('open', open);
        hamburger.setAttribute('aria-expanded', String(open));
    });

    // Close on nav-link click (mobile)
    navLinks.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('open');
            hamburger.classList.remove('open');
            hamburger.setAttribute('aria-expanded', 'false');
        });
    });
}

// ── Scroll shadow on nav ──────────────────────────────────────────
function initScrollNav() {
    const nav = document.getElementById('landingNav');
    if (!nav) return;
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
}

// ── API ───────────────────────────────────────────────────────────
async function login(email, password) {
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('userId',    data.user._id);
    return data;
}

async function register(username, email, password, confirmPassword) {
    const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, confirmPassword }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Registration failed');
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('userId',    data.user._id);
    return data;
}

function isLoggedIn() {
    return !!localStorage.getItem('authToken');
}
