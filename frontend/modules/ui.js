export const elements = {
    authContainer: document.getElementById('auth-container'),
    appContainer: document.getElementById('app-container'),
    browseContainer: document.getElementById('browse-container'),
    settingsContainer: document.getElementById('settings-container'),
    loginView: document.getElementById('login-view'),
    registerView: document.getElementById('register-view'),
    mainNav: document.getElementById('main-nav'),
    mainMenu: document.getElementById('main-menu'),
    hamburgerMenuBtn: document.getElementById('hamburger-menu-btn'),
    usernameDisplay: document.getElementById('username-display'),
    addTaskContainer: document.getElementById('add-task-container'),
    editTaskContainer: document.getElementById('edit-task-container'),
    showTaskFormBtn: document.getElementById('show-task-form-btn'),
    dashboardTaskList: document.getElementById('dashboard-task-list'),
    browseTaskList: document.getElementById('browse-task-list'),
    dashboardTaskCountInput: document.getElementById('dashboard-task-count'),
    newListInput: document.getElementById('new-list-name'),
    addNewListBtn: document.getElementById('add-new-list-btn'),
    taskListSelect: document.getElementById('task-list-select'),
    taskInput: document.getElementById('task-input'),
    taskPriorityInput: document.getElementById('task-priority'),
    taskPriorityScheduleInput: document.getElementById('task-priority-schedule'),
    taskNotificationDateInput: document.getElementById('task-notification-date'),
    taskListInput: document.getElementById('task-list'),
    authError: document.getElementById('auth-error'),
    toast: document.getElementById('toast-notification'),
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    taskForm: document.getElementById('task-form'),
    editTaskForm: document.getElementById('edit-task-form'),
    settingsForm: document.getElementById('settings-form'),
    showRegisterLink: document.getElementById('show-register'),
    showLoginLink: document.getElementById('show-login'),
    goToBrowseLink: document.getElementById('go-to-browse'),
    goToDashboardLink: document.getElementById('go-to-dashboard'),
    goToSettingsLink: document.getElementById('go-to-settings'),
    globalLogoutBtn: document.getElementById('global-logout-btn'),
    globalRefreshBtn: document.getElementById('global-refresh-btn'),
    cancelAddTaskBtn: document.getElementById('cancel-add-task-btn'),
    cancelEditTaskBtn: document.getElementById('cancel-edit-task-btn'),
    enableNotificationsBtn: document.getElementById('enable-notifications-btn'),
    testNotificationBtn: document.getElementById('test-notification-btn'),
    editTaskId: document.getElementById('edit-task-id'),
    editTaskTitle: document.getElementById('edit-task-title'),
    editTaskPriority: document.getElementById('edit-task-priority'),
    editTaskPrioritySchedule: document.getElementById('edit-task-priority-schedule'),
    editTaskNotificationDate: document.getElementById('edit-task-notification-date'),
    editTaskList: document.getElementById('edit-task-list'),
    snoozeFeedback: document.getElementById('snooze-feedback'),
    enableSwipeSnooze: document.getElementById('enable-swipe-snooze'),
    themeToggle: document.getElementById('theme-toggle'),
    userListsContainer: document.getElementById('user-lists-container'),
    userLists: document.getElementById('user-lists'),
};

export function showToast(message) {
    if (!elements.toast) return;
    elements.toast.textContent = message;
    elements.toast.classList.add('show');
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}

export function hideAddTaskFormAndShowFab() {
    elements.addTaskContainer.style.display = 'none';
    elements.showTaskFormBtn.style.display = 'block';
    elements.authError.textContent = '';
}