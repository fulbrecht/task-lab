import * as api from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => console.log('Service Worker registered:', registration))
                .catch(error => console.error('Service Worker registration failed:', error));
        });
    }

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
    const goToBrowseLink = document.getElementById('go-to-browse');
    const goToDashboardLink = document.getElementById('go-to-dashboard');
    // New global nav bar elements
    const mainNav = document.getElementById('main-nav');
    const usernameDisplay = document.getElementById('username-display');
    const globalRefreshBtn = document.getElementById('global-refresh-btn');
    const globalLogoutBtn = document.getElementById('global-logout-btn');
    const hamburgerMenuBtn = document.getElementById('hamburger-menu-btn');
    const mainMenu = document.getElementById('main-menu');
    // New add task elements
    const authError = document.getElementById('auth-error'); // Moved for better scope
    const addTaskContainer = document.getElementById('add-task-container');
    const showTaskFormBtn = document.getElementById('show-task-form-btn');
    const cancelAddTaskBtn = document.getElementById('cancel-add-task-btn');

    let currentUser = null;

    // --- UI Toggling ---
    const showLoginView = () => {
        mainNav.style.display = 'none'; // Hide nav on login screen
        authContainer.style.display = 'block';
        appContainer.style.display = 'none';
        loginView.style.display = 'block';
        registerView.style.display = 'none';
        browseContainer.style.display = 'none';
        mainMenu.classList.remove('open'); // Ensure menu is closed
        addTaskContainer.style.display = 'none'; // Ensure fixed form is hidden
        showTaskFormBtn.style.display = 'none'; // Hide FAB
        authError.textContent = '';
    };

    const showRegisterView = () => {
        mainNav.style.display = 'none'; // Hide nav on register screen
        authContainer.style.display = 'block';
        appContainer.style.display = 'none';
        loginView.style.display = 'none';
        registerView.style.display = 'block';
        browseContainer.style.display = 'none';
        mainMenu.classList.remove('open'); // Ensure menu is closed
        addTaskContainer.style.display = 'none'; // Ensure fixed form is hidden
        showTaskFormBtn.style.display = 'none'; // Hide FAB
        authError.textContent = '';
    };

    const showAppView = (username = null) => {
        mainNav.style.display = 'flex'; // Show nav when logged in
        if (username) usernameDisplay.textContent = `Hello, ${username}`;
        mainMenu.classList.remove('open'); // Ensure menu is closed
        showTaskFormBtn.style.display = 'block'; // Show FAB on dashboard
        authContainer.style.display = 'none';
        appContainer.style.display = 'block';
        browseContainer.style.display = 'none';
        addTaskContainer.style.display = 'none'; // Ensure form is hidden on view switch
        loadDashboardTasks();
    };

    const showBrowseView = (username = null) => {
        mainNav.style.display = 'flex'; // Show nav when logged in
        if (username) usernameDisplay.textContent = `Hello, ${username}`;
        mainMenu.classList.remove('open'); // Ensure menu is closed
        showTaskFormBtn.style.display = 'none'; // Hide FAB on browse page
        authContainer.style.display = 'none';
        appContainer.style.display = 'none';
        browseContainer.style.display = 'block';
        addTaskContainer.style.display = 'none'; // Ensure fixed form is hidden
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
        showBrowseView(currentUser);
        mainMenu.classList.remove('open'); // Close menu on navigation
    });

    goToDashboardLink.addEventListener('click', (e) => {
        e.preventDefault();
        showAppView(currentUser);
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        authError.textContent = '';
        try {
            const data = await api.login(username, password);
            currentUser = data.user.username;
            showAppView(currentUser); // Pass username to showAppView
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
            const data = await api.register(username, password);
            currentUser = data.user.username;
            showAppView(currentUser); // Pass username to showAppView
        } catch (error) {
            authError.textContent = error.message;
        }
    });

    globalLogoutBtn.addEventListener('click', async () => { // Use globalLogoutBtn
        try {
            await api.logout();
            currentUser = null;
            showLoginView();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    });

    // Helper function to hide the add task form and show the FAB
    const hideAddTaskFormAndShowFab = () => {
        addTaskContainer.style.display = 'none';
        showTaskFormBtn.style.display = 'block';
        authError.textContent = ''; // Clear any error messages
    };

    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = taskInput.value.trim();
        const priority = taskPriorityInput.value;
        if (title) {
            try {
                await api.addTask(title, priority);
                taskInput.value = '';
                taskPriorityInput.value = '3'; // Reset priority to default
                hideAddTaskFormAndShowFab(); // Use helper function
                taskInput.focus(); // Keep focus on input for quick re-add
                loadDashboardTasks();
            } catch (error) {
                authError.textContent = `Error: ${error.message}`; // Use authError for general messages
            }
        }
    });

    showTaskFormBtn.addEventListener('click', () => {
        // Toggle visibility of the fixed add task form
        const isVisible = addTaskContainer.style.display === 'block';
        addTaskContainer.style.display = isVisible ? 'none' : 'block';
        showTaskFormBtn.style.display = isVisible ? 'block' : 'none'; // Toggle FAB visibility
        if (!isVisible) taskInput.focus(); // Focus the input when the form appears
        authError.textContent = ''; // Clear any error messages when opening form
    });

    // Close hamburger menu when clicking outside
    document.addEventListener('click', (event) => {
        // Check if the menu is open
        if (mainMenu.classList.contains('open')) {
            // Check if the click target is NOT the hamburger button AND NOT inside the menu itself
            if (!hamburgerMenuBtn.contains(event.target) && !mainMenu.contains(event.target)) {
                mainMenu.classList.remove('open');
                hamburgerMenuBtn.classList.remove('open');
            }
        }
    });

    hamburgerMenuBtn.addEventListener('click', () => {
        mainMenu.classList.toggle('open');
        hamburgerMenuBtn.classList.toggle('open'); // Animate hamburger icon
    });

    cancelAddTaskBtn.addEventListener('click', hideAddTaskFormAndShowFab); // Hide form on cancel click

    // --- Refresh Button Event Listeners ---
    globalRefreshBtn.addEventListener('click', refreshCurrentView); // Use globalRefreshBtn

    // --- Event Delegation for both Task Lists ---
    // This listener is fine as it handles clicks on task items and delete buttons
    // It does not interfere with the new refresh buttons.
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
            if (!data || !data.user) throw new Error("Not authenticated"); // Ensure user data is present
            currentUser = data.user.username;
            showAppView(currentUser); // Pass username to showAppView
        } catch (error) {
            showLoginView(); // If checkAuthStatus fails, show login
        }
    }

    async function refreshCurrentView() {
        // No refresh indicator to reset text for, just trigger the load
        if (appContainer.style.display === 'block') {
            await loadDashboardTasks();
        } else if (browseContainer.style.display === 'block') {
            await loadAllTasks();
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
        }
        catch (error) {
            console.error('Error loading all tasks:', error);
        }
    }

    function renderTasks(tasks, listElement, showControls) {
        listElement.innerHTML = ''; // Clear the list
        const fragment = document.createDocumentFragment(); // Create a fragment to hold new elements
        const isDashboardView = (listElement === dashboardTaskList); // Determine if it's the dashboard
        tasks.forEach(task => fragment.appendChild(createTaskElement(task, showControls, isDashboardView)));
        listElement.appendChild(fragment); // Append all new elements at once
    }

    function createTaskElement(task, showControls, isDashboardView) {
        const li = document.createElement('li');
        li.className = task.completed ? 'completed' : '';
        li.dataset.id = task._id;

        const priorityIndicator = document.createElement('div');
        priorityIndicator.className = `priority-indicator priority-${task.priority}`;
        li.appendChild(priorityIndicator);

        if (isDashboardView) { // Apply priority sizing only for dashboard tasks
            li.classList.add(`priority-size-${task.priority}`);
        }

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
        return li;
    }

    async function deleteTask(id) {
        // Optimistically remove from all potential UI locations
        const taskElements = document.querySelectorAll(`li[data-id="${id}"]`);
        if (taskElements.length > 0) {
            taskElements.forEach(el => el.remove());
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
