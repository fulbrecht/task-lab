// --- Element References ---
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

// --- UI Toggling ---
function hideAllViews() {
    elements.authContainer.style.display = 'none';
    elements.appContainer.style.display = 'none';
    elements.browseContainer.style.display = 'none';
    elements.settingsContainer.style.display = 'none';
    elements.addTaskContainer.style.display = 'none';
    elements.editTaskContainer.style.display = 'none';
    elements.showTaskFormBtn.style.display = 'none';
    elements.mainMenu.classList.remove('open');
    elements.hamburgerMenuBtn.classList.remove('open');
}""

export function showLoginView() {
    hideAllViews();
    elements.mainNav.style.display = 'none';
    elements.authContainer.style.display = 'block';
    elements.loginView.style.display = 'block';
    elements.registerView.style.display = 'none';
    elements.authError.textContent = '';
}

export function showRegisterView() {
    hideAllViews();
    elements.mainNav.style.display = 'none';
    elements.authContainer.style.display = 'block';
    elements.loginView.style.display = 'none';
    elements.registerView.style.display = 'block';
    elements.authError.textContent = '';
}

export function showAppView(username) {
    hideAllViews();
    elements.mainNav.style.display = 'flex';
    if (username) elements.usernameDisplay.textContent = `Hello, ${username}`;
    elements.appContainer.style.display = 'block';
    elements.showTaskFormBtn.style.display = 'block';
}

export function showBrowseView(username) {
    hideAllViews();
    elements.mainNav.style.display = 'flex';
    if (username) elements.usernameDisplay.textContent = `Hello, ${username}`;
    elements.browseContainer.style.display = 'block';
}

export function showSettingsView(username) {
    hideAllViews();
    elements.mainNav.style.display = 'flex';
    if (username) elements.usernameDisplay.textContent = `Hello, ${username}`;
    elements.settingsContainer.style.display = 'block';
    const savedCount = localStorage.getItem('dashboardTaskCount') || 3;
    elements.dashboardTaskCountInput.value = savedCount;

    const swipeEnabled = localStorage.getItem('swipeToSnoozeEnabled') !== 'false';
    elements.enableSwipeSnooze.checked = swipeEnabled;

    applyTheme();
    populateListSelects();
    renderUserLists(state.getUserLists());
}

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

import * as state from './state.js';

export function populateListSelects() {
    const lists = state.getUserLists();

    // Populate dashboard list select
    elements.taskListSelect.innerHTML = '';
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All Tasks';
    elements.taskListSelect.appendChild(allOption);
    lists.forEach(list => {
        const option = document.createElement('option');
        option.value = list;
        option.textContent = list.charAt(0).toUpperCase() + list.slice(1);
        elements.taskListSelect.appendChild(option);
    });
    const currentList = localStorage.getItem('currentTaskList') || 'all';
    elements.taskListSelect.value = currentList;

    // Populate add task list select
    elements.taskListInput.innerHTML = '';
    const noneOption = document.createElement('option');
    noneOption.value = '';
    noneOption.textContent = 'None';
    elements.taskListInput.appendChild(noneOption);
    lists.forEach(list => {
        const option = document.createElement('option');
        option.value = list;
        option.textContent = list.charAt(0).toUpperCase() + list.slice(1);
        elements.taskListInput.appendChild(option);
    });
    elements.taskListInput.value = localStorage.getItem('currentTaskList') || '';

    // Populate edit task list select
    elements.editTaskList.innerHTML = '';
    const editNoneOption = document.createElement('option');
    editNoneOption.value = '';
    editNoneOption.textContent = 'None';
    elements.editTaskList.appendChild(editNoneOption);
    lists.forEach(list => {
        const option = document.createElement('option');
        option.value = list;
        option.textContent = list.charAt(0).toUpperCase() + list.slice(1);
        elements.editTaskList.appendChild(option);
    });
}

export function renderUserLists(lists) {
    elements.userLists.innerHTML = '';
    lists.forEach(list => {
        const li = document.createElement('li');
        li.textContent = list;
        if (list !== 'home' && list !== 'work') { // Allow deleting only custom lists
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-list-btn';
            deleteBtn.dataset.listName = list;
            deleteBtn.textContent = 'Delete';
            li.appendChild(deleteBtn);
        }
        elements.userLists.appendChild(li);
    });
}

export function applyTheme() {
    const darkModeEnabled = localStorage.getItem('darkModeEnabled') === 'true';
    if (darkModeEnabled) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    if (elements.themeToggle) {
        elements.themeToggle.checked = darkModeEnabled;
    }
}