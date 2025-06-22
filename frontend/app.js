document.addEventListener('DOMContentLoaded', () => {
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskList = document.getElementById('task-list');
    const logoutBtn = document.getElementById('logout-btn');
    const authError = document.getElementById('auth-error');

    const API_URL = '/api';

    // --- UI Toggling ---
    const showLoginView = () => {
        authContainer.style.display = 'block';
        appContainer.style.display = 'none';
        loginView.style.display = 'block';
        registerView.style.display = 'none';
        authError.textContent = '';
    };

    const showRegisterView = () => {
        authContainer.style.display = 'block';
        appContainer.style.display = 'none';
        loginView.style.display = 'none';
        registerView.style.display = 'block';
        authError.textContent = '';
    };

    const showAppView = () => {
        authContainer.style.display = 'none';
        appContainer.style.display = 'block';
        loadTasks();
    };

    // --- Event Listeners ---
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        showRegisterView();
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginView();
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            if (res.ok) {
                showAppView();
            } else {
                const data = await res.json();
                authError.textContent = data.message || 'Login failed.';
            }
        } catch (error) {
            authError.textContent = 'An error occurred. Please try again.';
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        try {
            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            if (res.ok) {
                showAppView();
            } else {
                const data = await res.json();
                authError.textContent = data.message || 'Registration failed.';
            }
        } catch (error) {
            authError.textContent = 'An error occurred. Please try again.';
        }
    });

    logoutBtn.addEventListener('click', async () => {
        try {
            const res = await fetch(`${API_URL}/logout`);
            // Only switch views if the logout was successful on the server
            if (res.ok) {
                showLoginView();
            }
        } catch (error) {
            console.error('Logout failed:', error);
        }
    });

    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = taskInput.value.trim();
        if (title) {
            const success = await addTask(title);
            if (success) {
                taskInput.value = '';
                loadTasks();
            }
        }
    });

    // --- Event Delegation for Task List ---
    taskList.addEventListener('click', (e) => {
        const li = e.target.closest('li[data-id]');
        if (!li) {
            return;
        }

        const id = li.dataset.id;
        const isCompleted = li.classList.contains('completed');

        // Check if the delete button was clicked
        if (e.target.tagName === 'BUTTON') {
            deleteTask(id);
        } else { // Otherwise, the click was on the task item itself
            toggleTask(id, !isCompleted);
        }
    });

    // --- API Calls ---
    async function checkAuthStatus() {
        try {
            const res = await fetch(`${API_URL}/user`);
            if (res.ok) {
                showAppView();
            } else {
                showLoginView();
            }
        } catch (error) {
            showLoginView();
        }
    }

    async function loadTasks() {
        try {
            const res = await fetch(`${API_URL}/tasks`);
            if (!res.ok) {
                if (res.status === 401) showLoginView();
                return;
            }
            const tasks = await res.json();
            taskList.innerHTML = '';
            tasks.forEach(task => {
                const li = document.createElement('li');
                li.textContent = task.title;
                li.className = task.completed ? 'completed' : '';
                li.dataset.id = task._id;

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Delete';
                li.appendChild(deleteBtn);
                taskList.appendChild(li);
            });
        } catch (error) {
            console.error('Error loading tasks:', error);
        }
    }

    async function addTask(title) {
        try {
            const res = await fetch(`${API_URL}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title }),
            });
            if (!res.ok) {
                const errorData = await res.json();
                alert(`Error: ${errorData.message || 'Could not add task.'}`);
                return false;
            }
            return true;
        } catch (error) {
            console.error('Error adding task:', error);
            alert('A network error occurred. Please try again.');
            return false;
        }
    }

    async function deleteTask(id) {
        const taskElement = taskList.querySelector(`li[data-id="${id}"]`);
        if (taskElement) {
            taskElement.remove(); // Optimistically remove from UI
        }

        try {
            const res = await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                console.error('Failed to delete task. Server responded with ' + res.status);
                loadTasks(); // Re-load list to revert the change on error
            }
        } catch (error) {
            console.error('Error deleting task:', error);
            loadTasks(); // Re-load list to revert the change on error
        }
    }

    async function toggleTask(id, completed) {
        const taskElement = taskList.querySelector(`li[data-id="${id}"]`);
        if (taskElement) {
            taskElement.classList.toggle('completed', completed); // Optimistically update style
        }

        try {
            const res = await fetch(`${API_URL}/tasks/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed }),
            });
            if (!res.ok) {
                console.error('Failed to update task. Server responded with ' + res.status);
                // Revert the optimistic change on error
                if (taskElement) taskElement.classList.toggle('completed', !completed);
            }
        } catch (error) {
            console.error('Error updating task:', error);
            // Revert the optimistic change on error
            if (taskElement) taskElement.classList.toggle('completed', !completed);
        }
    }

    // Initial check
    checkAuthStatus();
});
