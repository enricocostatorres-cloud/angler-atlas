// Redirect authenticated users straight to the app
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('authToken')) {
        window.location.href = '/app';
        return;
    }
    initHamburger();
    initScrollNav();
});

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
