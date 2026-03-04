// API Helper Module
const API_BASE_URL = '/api';

let authToken = localStorage.getItem('authToken');

// Shared response handler — throws on non-2xx
async function handleResponse(response) {
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'An unexpected error occurred');
    }
    return data;
}

// Auth Functions
async function register(username, email, password, confirmPassword) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, confirmPassword }),
    });
    const data = await handleResponse(response);
    authToken = data.token;
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('userId', data.user._id);
    return data;
}

async function login(email, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse(response);
    authToken = data.token;
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('userId', data.user._id);
    return data;
}

function logout() {
    authToken = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
}

function isLoggedIn() {
    return !!authToken;
}

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
    };
}

// User Functions
async function getCurrentUser() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/me`, {
            headers: getAuthHeaders(),
        });
        return await handleResponse(response);
    } catch (error) {
        console.error('Error fetching current user:', error);
        return null;
    }
}

async function getUserProfile(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`);
        return await handleResponse(response);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
}

async function updateUserProfile(userId, profileData) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(profileData),
    });
    return handleResponse(response);
}

// Catch Functions
async function logCatch(catchData) {
    const response = await fetch(`${API_BASE_URL}/catches/log`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(catchData),
    });
    return handleResponse(response);
}

// Log catch with photo (uses FormData / multipart)
async function logCatchWithPhoto(formData) {
    const response = await fetch(`${API_BASE_URL}/catches/log`, {
        method: 'POST',
        headers: {
            ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
            // Do NOT set Content-Type — browser sets it with boundary for multipart
        },
        body: formData,
    });
    return handleResponse(response);
}

async function getFeed(page = 1) {
    try {
        const response = await fetch(`${API_BASE_URL}/catches/feed?page=${page}`);
        return await handleResponse(response);
    } catch (error) {
        console.error('Error fetching feed:', error);
        return { catches: [], pagination: {} };
    }
}

async function getNearby(longitude, latitude, maxDistance = 5000) {
    try {
        const response = await fetch(
            `${API_BASE_URL}/catches/nearby?longitude=${longitude}&latitude=${latitude}&maxDistance=${maxDistance}`
        );
        return await handleResponse(response);
    } catch (error) {
        console.error('Error fetching nearby catches:', error);
        return [];
    }
}

async function getUserCatches(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/catches/user/${userId}`);
        return await handleResponse(response);
    } catch (error) {
        console.error('Error fetching user catches:', error);
        return [];
    }
}

async function likeCatch(catchId) {
    const response = await fetch(`${API_BASE_URL}/catches/${catchId}/like`, {
        method: 'POST',
        headers: getAuthHeaders(),
    });
    return handleResponse(response);
}

async function addComment(catchId, text) {
    const response = await fetch(`${API_BASE_URL}/catches/${catchId}/comment`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ text }),
    });
    return handleResponse(response);
}

// Leaderboard Functions
async function getLeaderboard(timeframe = 'all') {
    try {
        const response = await fetch(`${API_BASE_URL}/leaderboard?timeframe=${timeframe}`);
        return await handleResponse(response);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
    }
}

async function getUserRank(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/leaderboard/user/${userId}`);
        return await handleResponse(response);
    } catch (error) {
        console.error('Error fetching user rank:', error);
        return null;
    }
}

// Store Functions
async function getStoreProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/store/products`);
        return await handleResponse(response);
    } catch (error) {
        console.error('Error fetching products:', error);
        return { products: [] };
    }
}

// Follow Functions
async function followUser(userId) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/follow`, {
        method: 'POST',
        headers: getAuthHeaders(),
    });
    return handleResponse(response);
}
