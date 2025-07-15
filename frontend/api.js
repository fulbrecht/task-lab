const API_BASE_URL = '/api';

// A wrapper for fetch that includes credentials by default
async function apiFetch(url, options = {}) {
    const defaultOptions = {
        credentials: 'include', // Ensure cookies are sent with every request
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    };

    const config = {
        ...options,
        ...defaultOptions,
    };

    return fetch(url, config);
}


async function handleResponse(res) {
    if (res.ok) {
        if (res.status === 204 || res.headers.get('content-length') === '0') {
            return true;
        }
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return res.json();
        }
        return true;
    }
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed with status ${res.status}`);
}

// --- API Functions ---

export async function login(username, password) {
    const res = await apiFetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
    return handleResponse(res);
}

export async function register(username, password) {
    const res = await apiFetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
    return handleResponse(res);
}

export async function logout() {
    const res = await apiFetch(`${API_BASE_URL}/logout`, { method: 'POST' });
    return handleResponse(res);
}

export async function sendTestNotification() {
    const res = await apiFetch(`${API_BASE_URL}/notifications/test`, { method: 'POST' });
    return handleResponse(res);
}

export async function checkAuthStatus() {
    const res = await apiFetch(`${API_BASE_URL}/user`);
    return handleResponse(res);
}

export async function loadDashboardTasks(limit = 3, list = 'home') {
    const res = await apiFetch(`${API_BASE_URL}/tasks/dashboard?limit=${limit}&list=${list}`);
    return handleResponse(res);
}

export async function loadTasks() {
    const res = await apiFetch(`${API_BASE_URL}/tasks`);
    return handleResponse(res);
}

export async function addTask(title, priority, prioritySchedule, notificationDate, list) {
    const url = `${API_BASE_URL}/tasks`;
    const method = 'POST';
    const body = { title, priority, prioritySchedule, notificationDate, list };
    const res = await apiFetch(url, {
        method,
        body: JSON.stringify(body),
    });
    return await handleResponse(res);
}

export async function deleteTask(id) {
    const url = `${API_BASE_URL}/tasks/${id}`;
    const method = 'DELETE';
    const res = await apiFetch(url, { method });
    return await handleResponse(res);
}

export async function updateTask(id, updates) {
    const url = `${API_BASE_URL}/tasks/${id}`;
    const method = 'PUT';
    const res = await apiFetch(url, {
        method,
        body: JSON.stringify(updates),
    });
    return await handleResponse(res);
}

export async function snoozeTask(id, duration) {
    const url = `${API_BASE_URL}/tasks/${id}/snooze`;
    const method = 'POST';
    const body = { duration };
    const res = await apiFetch(url, {
        method,
        body: JSON.stringify(body)
    });
    return await handleResponse(res);
}

export async function getTask(id) {
    const res = await apiFetch(`${API_BASE_URL}/tasks/${id}`);
    return handleResponse(res);
}

export async function getLists() {
    const res = await apiFetch(`${API_BASE_URL}/lists`);
    return handleResponse(res);
}

export async function addList(listName) {
    const res = await apiFetch(`${API_BASE_URL}/lists`, {
        method: 'POST',
        body: JSON.stringify({ listName }),
    });
    return handleResponse(res);
}

export async function deleteList(listName) {
    const res = await apiFetch(`${API_BASE_URL}/lists/${listName}`, {
        method: 'DELETE',
    });
    return handleResponse(res);
}