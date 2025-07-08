import * as api from '/api.js';
import * as state from '/modules/state.js';
import * as ui from '/modules/ui.js';
import * as taskActions from '/modules/taskActions.js';
import { replaceTaskInUI } from '/modules/taskRenderer.js';
import * as pushNotifications from '/pushNotifications.js';
import * as db from '/modules/localDb.js';

document.addEventListener('DOMContentLoaded', () => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => console.log('Service Worker registered:', registration))
                .catch(error => console.error('Service Worker registration failed:', error));
        });

        navigator.serviceWorker.addEventListener('message', event => {
            if (event.data && event.data.type === 'SYNC_SUCCESS') {
                const { tempId, finalTask } = event.data.payload;
                replaceTaskInUI(tempId, finalTask);
            }
        });
    }

    // --- Authentication Handlers ---
    async function handleLogin(e) {
        e.preventDefault();
        const username = ui.elements.loginForm.querySelector('#login-username').value;
        const password = ui.elements.loginForm.querySelector('#login-password').value;
        ui.elements.authError.textContent = '';
        try {
            const data = await api.login(username, password);
            state.setCurrentUser(data.user.username);
            ui.showAppView(state.getCurrentUser());
            taskActions.syncAndLoadTasks(); // Use new sync function
        } catch (error) {
            ui.elements.authError.textContent = error.message;
        }
    }

    async function handleRegister(e) {
        e.preventDefault();
        const username = ui.elements.registerForm.querySelector('#register-username').value;
        const password = ui.elements.registerForm.querySelector('#register-password').value;
        ui.elements.authError.textContent = '';
        try {
            const data = await api.register(username, password);
            state.setCurrentUser(data.user.username);
            state.setUserLists(data.user.lists);
            await db.saveListsToDb(data.user.lists);
            ui.showAppView(state.getCurrentUser());
            taskActions.syncAndLoadTasks(); // Use new sync function
        } catch (error) {
            ui.elements.authError.textContent = error.message;
        }
    }

    async function handleLogout() {
        try {
            await api.logout();
            state.clearCurrentUser();
            state.clearUserLists();
            await db.saveListsToDb([]); // Clear local lists on logout
            ui.showLoginView();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }

    // --- Main Task List Click Handler ---
    // Moved to taskActions.js

    // --- Setup All Event Listeners ---
    function initializeEventListeners() {
        // View Switching
        document.body.addEventListener('click', (e) => {
            if (e.target.matches('#show-register')) {
                e.preventDefault();
                ui.showRegisterView();
            } else if (e.target.matches('#show-login')) {
                e.preventDefault();
                ui.showLoginView();
            } else if (e.target.matches('#go-to-browse')) {
                e.preventDefault();
                ui.showBrowseView(state.getCurrentUser());
                taskActions.syncAndLoadTasks(); // Use new sync function
            } else if (e.target.matches('#go-to-dashboard, #go-to-dashboard-from-browse, #go-to-dashboard-from-settings')) {
                e.preventDefault();
                ui.showAppView(state.getCurrentUser());
                taskActions.syncAndLoadTasks(); // Use new sync function
            } else if (e.target.matches('#go-to-settings')) {
                e.preventDefault();
                ui.showSettingsView(state.getCurrentUser());
            }
        });

        // Auth
        ui.elements.loginForm.addEventListener('submit', handleLogin);
        ui.elements.registerForm.addEventListener('submit', handleRegister);
        ui.elements.globalLogoutBtn.addEventListener('click', handleLogout);

        // Task Forms
        taskActions.setupTaskEventListeners();

        // Other UI elements
        ui.elements.showTaskFormBtn.addEventListener('click', () => {
            const isVisible = ui.elements.addTaskContainer.style.display === 'block';
            ui.elements.addTaskContainer.style.display = isVisible ? 'none' : 'block';
            ui.elements.showTaskFormBtn.style.display = isVisible ? 'block' : 'none';
            if (!isVisible) ui.elements.taskInput.focus();
        });
        ui.elements.cancelAddTaskBtn.addEventListener('click', ui.hideAddTaskFormAndShowFab);
        ui.elements.cancelEditTaskBtn.addEventListener('click', () => {
            ui.elements.editTaskContainer.style.display = 'none';
            ui.elements.showTaskFormBtn.style.display = 'block';
        });

        // Settings
        ui.elements.dashboardTaskCountInput.addEventListener('change', (e) => {
            localStorage.setItem('dashboardTaskCount', e.target.value);
            taskActions.syncAndLoadTasks();
        });

        ui.elements.enableSwipeSnooze.addEventListener('change', (e) => {
            localStorage.setItem('swipeToSnoozeEnabled', e.target.checked);
        });

        ui.elements.themeToggle.addEventListener('change', (e) => {
            localStorage.setItem('darkModeEnabled', e.target.checked);
            ui.applyTheme();
        });

        // Notifications
        ui.elements.enableNotificationsBtn.addEventListener('click', pushNotifications.initializePushNotifications);
        ui.elements.testNotificationBtn.addEventListener('click', api.sendTestNotification);

        ui.elements.addNewListBtn.addEventListener('click', async () => {
            const listName = ui.elements.newListInput.value.trim();
            if (listName) {
                try {
                    // Add to local DB first
                    await db.addList(listName);
                    const updatedLocalLists = await db.getAllLists();
                    state.setUserLists(updatedLocalLists);
                    ui.populateListSelects();
                    ui.renderUserLists(state.getUserLists());
                    ui.elements.newListInput.value = '';

                    // Then try to sync with server
                    try {
                        const response = await api.addList(listName);
                        state.setUserLists(response.lists);
                        await db.saveListsToDb(response.lists); // Ensure local DB is in sync with server
                        ui.populateListSelects();
                        ui.renderUserLists(state.getUserLists());
                    } catch (error) {
                        ui.showToast('List added locally. It will sync with the server when you\'re back online.');
                        console.error('Failed to add list to server:', error);
                    }
                } catch (error) {
                    ui.showToast(`Error adding list: ${error.message}`);
                }
            }
        });

        ui.elements.userLists.addEventListener('click', async (e) => {
            if (e.target.classList.contains('delete-list-btn')) {
                e.preventDefault(); // Prevent default form submission immediately
                const listName = e.target.dataset.listName;
                if (confirm(`Are you sure you want to delete the list "${listName}"?`)) {
                    try {
                        const response = await api.deleteList(listName);
                        state.setUserLists(response.lists);
                        await db.saveListsToDb(response.lists); // Ensure local DB is in sync with server
                        ui.populateListSelects();
                        ui.renderUserLists(state.getUserLists());
                    } catch (error) {
                        ui.showToast('List deleted locally. It will sync with the server later.');
                        console.error('Failed to delete list on server:', error);
                    }
                }
            }
        });

        // Global
        ui.elements.hamburgerMenuBtn.addEventListener('click', () => {
            ui.elements.mainMenu.classList.toggle('open');
            ui.elements.hamburgerMenuBtn.classList.toggle('open');
        });
        ui.elements.taskListSelect.addEventListener('change', (e) => {
            localStorage.setItem('currentTaskList', e.target.value);
            taskActions.syncAndLoadTasks();
        });
        // Task list click handlers moved to taskActions.js
    }

    // --- App Initialization ---
    async function initializeApp() {
        ui.applyTheme();
        try {
            const data = await api.checkAuthStatus();
            state.setCurrentUser(data.user.username);
            state.setUserLists(data.user.lists);
            await db.saveListsToDb(data.user.lists); // Save server lists to local DB
            ui.showAppView(state.getCurrentUser());
            ui.populateListSelects();
            ui.renderUserLists(state.getUserLists());
            await taskActions.syncAndLoadTasks(); // Initial data load
        } catch (error) {
            // If auth check fails, try to load from local DB
            console.warn('Authentication failed, attempting to load lists from local DB.', error);
            const localLists = await db.getAllLists();
            state.setUserLists(localLists);
            ui.populateListSelects();
            ui.renderUserLists(state.getUserLists());
            ui.showLoginView();
        }
        initializeEventListeners();
    }

    initializeApp();
});
