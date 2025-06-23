import * as api from './api.js';

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
        authError.textContent = '';
        try {
            await api.login(username, password);
            showAppView();
        } catch (error) {
            authError.textContent = error.message;
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authError.textContent = '';
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        try {
            await api.register(username, password);
            showAppView();
        } catch (error) {
            authError.textContent = error.message;
        }
    });

    logoutBtn.addEventListener('click', async () => {
        try {
            await api.logout();
            showLoginView();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    });

    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = taskInput.value.trim();
        if (title) {
            try {
                await api.addTask(title);
                taskInput.value = '';
                loadTasks();
            } catch (error) {
                alert(`Error: ${error.message}`);
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

    // --- UI Rendering and State ---
    async function initializeApp() {
        try {
            await api.checkAuthStatus();
            showAppView();
        } catch (error) {
            showLoginView();
        }
    }

    async function loadTasks() {
        try {
            const tasks = await api.loadTasks();
            renderTasks(tasks);
        } catch (error) {
            console.error('Error loading tasks:', error);
            showLoginView(); // If loading tasks fails, assume user is not logged in.
        }
    }

    function renderTasks(tasks) {
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
    }

    async function deleteTask(id) {
        const taskElement = taskList.querySelector(`li[data-id="${id}"]`);
        if (taskElement) {
            taskElement.remove(); // Optimistically remove from UI
        }

        try {
            await api.deleteTask(id);
        } catch (error) {
            console.error('Failed to delete task:', error);
            loadTasks(); // Re-load list to revert the change on error
        }
    }

    async function toggleTask(id, completed) {
        const taskElement = taskList.querySelector(`li[data-id="${id}"]`);
        if (taskElement) {
            taskElement.classList.toggle('completed', completed); // Optimistically update style
        }

        try {
            await api.toggleTask(id, completed);
        } catch (error) {
            console.error('Failed to update task:', error);
            // Revert the optimistic change on error
            if (taskElement) taskElement.classList.toggle('completed', !completed);
        }
    }

    // Initial check
    initializeApp();
});
