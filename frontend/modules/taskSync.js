import * as api from '../api.js';
import * as db from './localDb.js';
import { showToast } from './ui.js';
import { renderTasks } from './taskRenderer.js';
import { scheduleNotifications } from './taskActions.js';
import { elements } from './ui.js';

export async function syncAndLoadTasks() {
    try {
        const serverTasks = await api.loadTasks();
        await db.saveTasksToDb(serverTasks);
        showToast('Tasks synced with server.');
    } catch (error) {
        console.warn('Could not sync with server. Loading from local database.', error);
        showToast('You are offline. Displaying local tasks.');
    }
    // Always render from the local DB
    await loadTasksFromDb();
}

export async function loadTasksFromDb() {
    let tasks = await db.getAllTasks();
    tasks.sort((a, b) => {
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        if (a.completed && b.completed) return new Date(b.completedTimestamp) - new Date(a.completedTimestamp);
        return 0;
    });

    // Decide which view to render based on what's visible
    if (elements.browseContainer.style.display === 'block') {
        renderTasks(tasks, elements.browseTaskList, true);
    } else { // Dashboard view
        const limit = localStorage.getItem('dashboardTaskCount') || 3;
        const currentList = localStorage.getItem('currentTaskList') || 'home';
        
        // Filter out snoozed tasks for the dashboard view
        let filteredTasks = tasks.filter(t => !t.snoozed && !t.completed && (currentList === 'all' || t.list === currentList));
        
        renderTasks(filteredTasks.slice(0, limit), elements.dashboardTaskList, false);
    }

    scheduleNotifications(tasks);
}