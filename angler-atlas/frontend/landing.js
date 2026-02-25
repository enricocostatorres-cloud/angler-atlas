// Check if user is already logged in
document.addEventListener('DOMContentLoaded', () => {
    if (isLoggedIn()) {
        // Redirect to dashboard
        window.location.href = 'index.html';
    }

    // Setup event listeners
    setupEventListeners();
});

// Setup all event listeners
function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginFormElement');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Register form
    const registerForm = document.getElementById('registerFormElement');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Close modal when clicking outside
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeAuthModal();
            }
        });
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const result = await login(email, password);
        
        if (result) {
            // Clear form
            document.getElementById('loginFormElement').reset();
            
            // Close modal
            closeAuthModal();
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 500);
        }
    } catch (error) {
        alert('❌ Login failed: ' + error.message);
    }
}

// Handle register
async function handleRegister(e) {
    e.preventDefault();

    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;

    // Validation
    if (password !== confirmPassword) {
        alert('❌ Passwords do not match');
        return;
    }

    if (password.length < 6) {
        alert('❌ Password must be at least 6 characters');
        return;
    }

    try {
        const result = await register(username, email, password, confirmPassword);
        
        if (result) {
            // Clear form
            document.getElementById('registerFormElement').reset();
            
            // Show success message
            alert('✅ Account created successfully! Redirecting to dashboard...');
            
            // Close modal
            closeAuthModal();
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 500);
        }
    } catch (error) {
        alert('❌ Registration failed: ' + error.message);
    }
}

// Show auth modal
function showAuthModal(formType) {
    const modal = document.getElementById('authModal');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    modal.classList.add('show');

    if (formType === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    } else if (formType === 'register') {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    }
}

// Close auth modal
function closeAuthModal() {
    const modal = document.getElementById('authModal');
    modal.classList.remove('show');
}

// Toggle between login and register
function toggleAuthForm(e) {
    e.preventDefault();

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm.style.display === 'none') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    }
}

// Scroll to features section
function scrollToFeatures() {
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
        featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Scroll to auth
function scrollToAuth() {
    showAuthModal('login');
}

// API Integration - Use the same functions from api.js
async function login(email, password) {
    try {
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await response.json();
        
        if (response.ok) {
            const token = data.token;
            const userId = data.user._id;
            
            localStorage.setItem('authToken', token);
            localStorage.setItem('userId', userId);
            
            return data;
        } else {
            throw new Error(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

async function register(username, email, password, confirmPassword) {
    try {
        const response = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, confirmPassword }),
        });
        const data = await response.json();
        
        if (response.ok) {
            const token = data.token;
            const userId = data.user._id;
            
            localStorage.setItem('authToken', token);
            localStorage.setItem('userId', userId);
            
            return data;
        } else {
            throw new Error(data.error || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

function isLoggedIn() {
    return !!localStorage.getItem('authToken');
}
