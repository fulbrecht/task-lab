import * as api from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    const browseContainer = document.getElementById('browse-container');
    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskPriorityInput = document.getElementById('task-priority');
    const dashboardTaskList = document.getElementById('dashboard-task-list');
    const browseTaskList = document.getElementById('browse-task-list');
    const logoutBtn = document.getElementById('logout-btn');
    const authError = document.getElementById('auth-error');
    const goToBrowseLink = document.getElementById('go-to-browse');
    const goToDashboardLink = document.getElementById('go-to-dashboard');

    // --- UI Toggling ---
    const showLoginView = () => {
        authContainer.style.display = 'block';
        appContainer.style.display = 'none';
        loginView.style.display = 'block';
        registerView.style.display = 'none';
        browseContainer.style.display = 'none';
        authError.textContent = '';
    };

    const showRegisterView = () => {
        authContainer.style.display = 'block';
        appContainer.style.display = 'none';
        loginView.style.display = 'none';
        registerView.style.display = 'block';
        browseContainer.style.display = 'none';
        authError.textContent = '';
    };

    const showAppView = () => {
        authContainer.style.display = 'none';
        appContainer.style.display = 'block';
        browseContainer.style.display = 'none';
        loadDashboardTasks();
    };

    const showBrowseView = () => {
        authContainer.style.display = 'none';
        appContainer.style.display = 'none';
        browseContainer.style.display = 'block';
        loadAllTasks();
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

    goToBrowseLink.addEventListener('click', (e) => {
        e.preventDefault();
        showBrowseView();
    });

    goToDashboardLink.addEventListener('click', (e) => {
        e.preventDefault();
        showAppView();
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
        const priority = taskPriorityInput.value;
        if (title) {
            try {
                await api.addTask(title, priority);
                taskInput.value = '';
                loadDashboardTasks();
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        }
    });

    // --- Event Delegation for both Task Lists ---
    document.body.addEventListener('click', (e) => {
        const li = e.target.closest('li[data-id]');
        if (!li) return;

        const id = li.dataset.id;

        // Handle delete button click
        if (e.target.matches('.task-controls button')) {
            deleteTask(id);
        } 
        // Handle completion toggle (clicking on the title)
        else if (e.target.matches('.task-title')) {
            const isCompleted = li.classList.contains('completed');
            toggleTaskCompletion(id, !isCompleted);
        }
    });

    // Separate listener for 'change' events on priority dropdowns
    document.body.addEventListener('change', (e) => {
        if (!e.target.matches('.task-controls select')) return;
        
        const li = e.target.closest('li[data-id]');
        if (!li) return;

        const id = li.dataset.id;
        const newPriority = e.target.value;
        updateTaskPriority(id, newPriority);
    });

    // --- UI Rendering and State ---
    async function initializeApp() {
        try {
            const data = await api.checkAuthStatus();
            if (!data || !data.user) throw new Error("Not authenticated");
            showAppView();
        } catch (error) {
            showLoginView();
        }
    }

    async function loadDashboardTasks() {
        try {
            const tasks = await api.loadDashboardTasks();
            renderTasks(tasks, dashboardTaskList, false);
        } catch (error) {
            console.error('Error loading tasks:', error);
            showLoginView(); // If loading tasks fails, assume user is not logged in.
        }
    }

    async function loadAllTasks() {
        try {
            const tasks = await api.loadTasks();
            renderTasks(tasks, browseTaskList, true);
        } catch (error) {
            console.error('Error loading all tasks:', error);
        }
    }

    function renderTasks(tasks, listElement, showControls) {
        listElement.innerHTML = '';
        tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = task.completed ? 'completed' : '';
            li.dataset.id = task._id;

            const priorityIndicator = document.createElement('div');
            priorityIndicator.className = `priority-indicator priority-${task.priority}`;
            li.appendChild(priorityIndicator);

            const titleSpan = document.createElement('span');
            titleSpan.className = 'task-title';
            titleSpan.textContent = task.title;
            li.appendChild(titleSpan);

            const controlsContainer = document.createElement('div');
            controlsContainer.className = 'task-controls';

            if (showControls) {
                const prioritySelect = document.createElement('select');
                prioritySelect.title = "Change task priority";
                prioritySelect.innerHTML = `
                    <option value="1" ${task.priority === 1 ? 'selected' : ''}>High</option>
                    <option value="2" ${task.priority === 2 ? 'selected' : ''}>Medium</option>
                    <option value="3" ${task.priority === 3 ? 'selected' : ''}>Low</option>
                `;
                controlsContainer.appendChild(prioritySelect);
            }

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            controlsContainer.appendChild(deleteBtn);
            
            li.appendChild(controlsContainer);
            listElement.appendChild(li);
        });
    }

    async function deleteTask(id) {
        const taskElement = document.querySelector(`li[data-id="${id}"]`);
        if (taskElement) {
            taskElement.remove(); // Optimistically remove from UI
        }

        try {
            await api.deleteTask(id);
            // Refresh dashboard to pull in a new task if available
            loadDashboardTasks();
        } catch (error) {
            console.error('Failed to delete task:', error);
            // On error, a full reload is the safest way to restore state
            loadDashboardTasks();
            loadAllTasks();
        }
    }

    async function toggleTaskCompletion(id, completed) {
        // A task might be visible on both the dashboard and browse page, so we update all instances.
        const taskElements = document.querySelectorAll(`li[data-id="${id}"]`);
        if (taskElements.length > 0) {
            taskElements.forEach(el => el.classList.toggle('completed', completed)); // Optimistically update style
        }

        try {
            await api.updateTask(id, { completed });
            // Refresh dashboard as completed tasks are removed from it
            loadDashboardTasks();
        } catch (error) {
            console.error('Failed to update task:', error);
            // Revert the optimistic change on error
            if (taskElements.length > 0) taskElements.forEach(el => el.classList.toggle('completed', !completed));
        }
    }

    async function updateTaskPriority(id, priority) {
        try {
            await api.updateTask(id, { priority: parseInt(priority, 10) });
            loadDashboardTasks();
            loadAllTasks();
        } catch (error) {
            console.error('Failed to update priority', error);
            loadAllTasks(); // Revert browse view
        }
    }

    // Initial check
    initializeApp();
});
