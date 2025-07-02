import * as api from '/api.js';
import * as state from '/modules/state.js';
import * as ui from '/modules/ui.js';
import * as taskActions from '/modules/taskActions.js';
import { initializePushNotifications } from '/pushNotifications.js';

document.addEventListener('DOMContentLoaded', () => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => console.log('Service Worker registered:', registration))
                .catch(error => console.error('Service Worker registration failed:', error));
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
            taskActions.loadDashboardTasks();
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
            ui.showAppView(state.getCurrentUser());
            taskActions.loadDashboardTasks();
        } catch (error) {
            ui.elements.authError.textContent = error.message;
        }
    }

    async function handleLogout() {
        try {
            await api.logout();
            state.clearCurrentUser();
            ui.showLoginView();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }

    // --- Settings Handler ---
    function handleSaveSettings(e) {
        e.preventDefault();
        const newCount = ui.elements.dashboardTaskCountInput.value;
        localStorage.setItem('dashboardTaskCount', newCount);
        ui.showToast('Settings saved!');
        ui.showAppView(state.getCurrentUser());
        taskActions.loadDashboardTasks();
    }

    // --- Event Delegation for Task List ---
    function handleTaskListClick(e) {
        const li = e.target.closest('li[data-id]');
        if (!li) return;
        if (e.target.closest('.task-controls')) {
            if (e.target.matches('.delete-task-btn')) {
                taskActions.deleteTask(li.dataset.id);
            } else if (e.target.matches('.edit-task-btn')) {
                taskActions.handleEditClick(e);
            }
            return;
        }
        const isCompleted = li.classList.contains('completed');
        taskActions.toggleTaskCompletion(li.dataset.id, !isCompleted);
    }

    function handleTaskPriorityChange(e) {
        if (!e.target.matches('.task-controls select')) return;
        const li = e.target.closest('li[data-id]');
        if (!li) return;
        taskActions.updateTaskPriority(li.dataset.id, e.target.value);
    }

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
                taskActions.loadAllTasks();
            } else if (e.target.matches('#go-to-dashboard, #go-to-dashboard-from-browse, #go-to-dashboard-from-settings')) {
                e.preventDefault();
                ui.showAppView(state.getCurrentUser());
                taskActions.loadDashboardTasks();
            } else if (e.target.matches('#go-to-settings')) {
                e.preventDefault();
                ui.showSettingsView(state.getCurrentUser());
            }
        });

        // Auth
        ui.elements.loginForm.addEventListener('submit', handleLogin);
        ui.elements.registerForm.addEventListener('submit', handleRegister);
        ui.elements.globalLogoutBtn.addEventListener('click', handleLogout);

        // Task Form
        ui.elements.taskForm.addEventListener('submit', taskActions.handleAddTask);
        ui.elements.showTaskFormBtn.addEventListener('click', () => {
            const isVisible = ui.elements.addTaskContainer.style.display === 'block';
            ui.elements.addTaskContainer.style.display = isVisible ? 'none' : 'block';
            ui.elements.showTaskFormBtn.style.display = isVisible ? 'block' : 'none';
            if (!isVisible) ui.elements.taskInput.focus();
            ui.elements.authError.textContent = '';
        });
        ui.elements.cancelAddTaskBtn.addEventListener('click', ui.hideAddTaskFormAndShowFab);

        // Settings
        ui.elements.settingsForm.addEventListener('submit', handleSaveSettings);
        if (ui.elements.enableNotificationsBtn) {
            ui.elements.enableNotificationsBtn.addEventListener('click', () => {
                initializePushNotifications();
                ui.elements.enableNotificationsBtn.textContent = 'Notifications Enabled';
                ui.elements.enableNotificationsBtn.disabled = true;
            });
        }
        const testNotificationBtn = document.getElementById('test-notification-btn');
        if (testNotificationBtn) {
            testNotificationBtn.addEventListener('click', async () => {
                try {
                    await api.sendTestNotification();
                    ui.showToast('Test notification sent!');
                } catch (error) {
                    console.error('Failed to send test notification:', error);
                    ui.showToast(`Error: ${error.message}`);
                }
            });
        }

        // Global
        ui.elements.globalRefreshBtn.addEventListener('click', () => window.location.reload(true));
        document.body.addEventListener('click', handleTaskListClick);
        document.body.addEventListener('change', handleTaskPriorityChange);
        document.addEventListener('click', (event) => {
            if (ui.elements.mainMenu.classList.contains('open') && !ui.elements.hamburgerMenuBtn.contains(event.target) && !ui.elements.mainMenu.contains(event.target)) {
                ui.elements.mainMenu.classList.remove('open');
                ui.elements.hamburgerMenuBtn.classList.remove('open');
            }
            if (ui.elements.addTaskContainer.style.display === 'block' && !ui.elements.showTaskFormBtn.contains(event.target) && !ui.elements.addTaskContainer.contains(event.target)) {
                ui.hideAddTaskFormAndShowFab();
            }
        });
        ui.elements.hamburgerMenuBtn.addEventListener('click', () => {
            ui.elements.mainMenu.classList.toggle('open');
            ui.elements.hamburgerMenuBtn.classList.toggle('open');
        });
    }

    // --- Event Delegation for both Task Lists ---
    // --- UI Rendering and State ---
    async function initializeApp() {
        try {
            const data = await api.checkAuthStatus();
            state.setCurrentUser(data.user.username);
            ui.showAppView(state.getCurrentUser());
            taskActions.loadDashboardTasks();
            setInterval(taskActions.checkScheduledTasks, 60000); // Check every minute
        } catch (error) {
            ui.showLoginView();
        }
        initializeEventListeners();
    }

    // Initial check
    initializeApp();
});