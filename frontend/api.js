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
    const res = await fetch(`${API_BASE_URL}/logout`);
    return handleResponse(res);
}

export async function checkAuthStatus() {
    const res = await fetch(`${API_BASE_URL}/user`);
    return handleResponse(res);
}

export async function loadDashboardTasks() {
    const res = await fetch(`${API_BASE_URL}/tasks/dashboard`);
    return handleResponse(res);
}

export async function loadTasks() {
    const res = await fetch(`${API_BASE_URL}/tasks`);
    return handleResponse(res);
}

export async function addTask(title, priority) {
    const res = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority }),
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