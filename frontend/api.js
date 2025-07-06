const API_BASE_URL = '/api';

async function handleResponse(res) {
    if (res.ok) {
        // Handle responses that have no content, like a successful logout.
        if (res.status === 204 || res.headers.get('content-length') === '0') {
            return true;
        }
        // Check if the response is JSON before trying to parse it.
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return res.json();
        }
        return true;
    }
    // If the response is not ok, parse the JSON error message from the server.
    const errorData = await res.json();
    throw new Error(errorData.message || `Request failed with status ${res.status}`);
}

export async function login(username, password) {
    const res = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    return handleResponse(res);
}

export async function register(username, password) {
    const res = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    return handleResponse(res);
}

export async function logout() {
    const res = await fetch(`${API_BASE_URL}/logout`, { method: 'POST' });
    return handleResponse(res);
}

export async function sendTestNotification() {
    const res = await fetch(`${API_BASE_URL}/notifications/test`, { method: 'POST' });
    return handleResponse(res);
}

export async function checkAuthStatus() {
    const res = await fetch(`${API_BASE_URL}/user`); // Allow service worker to cache
    const data = await handleResponse(res);
    if (!data || !data.user) {
        throw new Error("Not authenticated"); // Explicitly throw if user is not found
    }
    return data;
}

export async function loadDashboardTasks(limit = 3, list = 'home') {
    const res = await fetch(`${API_BASE_URL}/tasks/dashboard?limit=${limit}&list=${list}`, { cache: 'no-store' });
    return handleResponse(res);
}

export async function loadTasks() {
    const res = await fetch(`${API_BASE_URL}/tasks`, { cache: 'no-store' });
    return handleResponse(res);
}

export async function addTask(title, priority, prioritySchedule, notificationDate, list) {
    const res = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority, prioritySchedule, notificationDate, list }),
    });
    return handleResponse(res);
}

export async function deleteTask(id) {
    const res = await fetch(`${API_BASE_URL}/tasks/${id}`, { method: 'DELETE' });
    return handleResponse(res);
}

export async function updateTask(id, updates) {
    const res = await fetch(`${API_BASE_URL}/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    return handleResponse(res);
}

export async function snoozeTask(id, duration) {
    const res = await fetch(`${API_BASE_URL}/tasks/${id}/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration })
    });
    return handleResponse(res);
}

export async function getTask(id) {
    const res = await fetch(`${API_BASE_URL}/tasks/${id}`);
    return handleResponse(res);
}