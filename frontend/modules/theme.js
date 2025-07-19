import { elements } from './ui.js';

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