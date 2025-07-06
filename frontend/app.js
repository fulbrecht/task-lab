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

    // --- Event Delegation for Task List (Swipe for Touch and Mouse) ---
    let startX = 0;
    let isMouseDown = false;
    let targetLi = null;
    let currentX = 0;
    let isSwiping = false;

    function handleGestureStart(e) {
        // Ignore swipes on controls like buttons or select dropdowns
        if (e.target.closest('.task-controls')) {
            return;
        }
        
        targetLi = e.target.closest('li[data-id]');
        if (!targetLi) return;

        // Disable swiping for completed tasks
        if (targetLi.classList.contains('completed')) {
            targetLi = null; // Clear targetLi to prevent further processing
            return;
        }

        if (e.type === 'touchstart') {
            startX = e.changedTouches[0].screenX;
        } else if (e.type === 'mousedown') {
            isMouseDown = true;
            startX = e.screenX;
            e.preventDefault(); // Prevents text selection
        }
        currentX = startX;
        isSwiping = false;
        if (targetLi) {
            targetLi.style.transition = 'transform 0s';
        }
    }

    function handleGestureMove(e) {
        if (!targetLi || (e.type === 'mousemove' && !isMouseDown)) return;

        if (e.type === 'touchmove') {
            currentX = e.changedTouches[0].screenX;
        } else { // mousemove
            currentX = e.screenX;
        }

        const diffX = currentX - startX;
        if (Math.abs(diffX) > 10) {
            isSwiping = true;
        }

        if (diffX < 0) { // Only visualize left swipe
            targetLi.style.transform = `translateX(${diffX}px)`;
            const snoozeFeedback = targetLi.querySelector('.snooze-feedback');
            if (snoozeFeedback) {
                snoozeFeedback.classList.add('visible');
                if (targetLi.classList.contains('snoozed')) {
                    snoozeFeedback.textContent = 'Unsnooze';
                    snoozeFeedback.className = 'snooze-feedback visible snooze-unsnooze';
                } else if (diffX < -100) {
                    snoozeFeedback.textContent = 'Snooze 1 Day';
                    snoozeFeedback.className = 'snooze-feedback visible snooze-1d';
                } else if (diffX < -50) {
                    snoozeFeedback.textContent = 'Snooze 1 Hour';
                    snoozeFeedback.className = 'snooze-feedback visible snooze-1h';
                } else {
                    snoozeFeedback.textContent = '';
                    snoozeFeedback.className = 'snooze-feedback';
                }
            }
        } else {
            targetLi.style.transform = 'translateX(0)';
            const snoozeFeedback = targetLi.querySelector('.snooze-feedback');
            if (snoozeFeedback) {
                snoozeFeedback.classList.remove('visible');
            }
        }
    }

    function handleGestureEnd(e) {
        if (!targetLi) return;

        if (e.type === 'touchend') {
            currentX = e.changedTouches[0].screenX;
        }
        
        isMouseDown = false;

        const diffX = currentX - startX;

        if (diffX < -50) { // Swipe threshold
            handleSwipe(targetLi, diffX);
        } else {
            // Not a swipe, or not far enough, animate back
            targetLi.style.transition = 'transform 0.3s ease';
            targetLi.style.transform = 'translateX(0)';
            targetLi.addEventListener('transitionend', () => {
                if (targetLi) {
                    targetLi.style.transition = '';
                }
            }, { once: true });
        }
        const snoozeFeedback = targetLi ? targetLi.querySelector('.snooze-feedback') : null;
        if (snoozeFeedback) {
            snoozeFeedback.classList.remove('visible');
        }
        targetLi = null;
    }

    function handleMouseLeave(e) {
        // If mouse leaves the document while dragging, cancel the swipe
        if (isMouseDown) {
            handleGestureEnd(e);
        }
    }

    function handleSwipe(li, diffX) {
        const taskId = li.dataset.id;
        let duration = '1h'; // Default to 1 hour
        if (diffX < -100) {
            duration = '1d';
        } else if (diffX < -50) {
            duration = '1h';
        }
        taskActions.snoozeTask(taskId, duration);
    }

    function handleTaskListClick(e) {
        if (isSwiping) {
            isSwiping = false;
            return;
        }
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

        // Edit Task Form
        ui.elements.editTaskForm.addEventListener('submit', taskActions.handleUpdateTask);
        ui.elements.cancelEditTaskBtn.addEventListener('click', () => {
            ui.elements.editTaskContainer.style.display = 'none';
            ui.elements.showTaskFormBtn.style.display = 'block';
        });

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
        
        document.body.addEventListener('touchstart', handleGestureStart, { passive: true });
        document.body.addEventListener('touchmove', handleGestureMove, { passive: true });
        document.body.addEventListener('touchend', handleGestureEnd);
        document.body.addEventListener('mousedown', handleGestureStart);
        document.body.addEventListener('mousemove', handleGestureMove);
        document.body.addEventListener('mouseup', handleGestureEnd);
        document.body.addEventListener('mouseleave', handleMouseLeave);
        document.addEventListener('click', (event) => {
            if (ui.elements.mainMenu.classList.contains('open') && !ui.elements.hamburgerMenuBtn.contains(event.target) && !ui.elements.mainMenu.contains(event.target)) {
                ui.elements.mainMenu.classList.remove('open');
                ui.elements.hamburgerMenuBtn.classList.remove('open');
            }
            if (ui.elements.addTaskContainer.style.display === 'block' && !ui.elements.showTaskFormBtn.contains(event.target) && !ui.elements.addTaskContainer.contains(event.target)) {
                ui.hideAddTaskFormAndShowFab();
            }
            if (ui.elements.editTaskContainer.style.display === 'block' && !event.target.closest('.edit-task-btn') && !ui.elements.editTaskContainer.contains(event.target)) {
                ui.elements.editTaskContainer.style.display = 'none';
                ui.elements.showTaskFormBtn.style.display = 'block';
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