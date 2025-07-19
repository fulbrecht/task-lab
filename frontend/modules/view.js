import { elements } from './ui.js';
import { applyTheme } from './theme.js';
import { populateListSelects, renderUserLists } from './list.js';
import * as state from './state.js';

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
}

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