import * as api from '../api.js';
import { elements, showToast, hideAddTaskFormAndShowFab } from './ui.js';
import { renderTasks } from './taskRenderer.js';

// --- Task Data Loading ---
export async function loadDashboardTasks() {
    try {
        const limit = localStorage.getItem('dashboardTaskCount') || 3;
        const tasks = await api.loadDashboardTasks(limit);
        renderTasks(tasks, elements.dashboardTaskList, false);
        scheduleNotifications(tasks);
    } catch (error) {
        console.error('Error loading tasks:', error);
        throw error; // Re-throw for the main app to handle view changes
    }
}

export async function loadAllTasks() {
    try {
        const tasks = await api.loadTasks();
        renderTasks(tasks, elements.browseTaskList, true);
        scheduleNotifications(tasks);
    } catch (error) {
        console.error('Error loading all tasks:', error);
    }
}

export async function checkScheduledTasks() {
    try {
        if (elements.appContainer.style.display === 'block') {
            await loadDashboardTasks();
        } else if (elements.browseContainer.style.display === 'block') {
            await loadAllTasks();
        }
    } catch (error) {
        console.error('Error checking scheduled tasks:', error);
    }
}

export async function scheduleNotifications(tasks) {
    if (Notification.permission === 'granted') {
        tasks.forEach(task => {
            if (task.notificationDate) {
                const notificationTime = new Date(task.notificationDate).getTime();
                const now = new Date().getTime();
                if (notificationTime > now) {
                    const delay = notificationTime - now;
                    setTimeout(() => {
                        new Notification('Task Reminder', {
                            body: task.title,
                        });
                    }, delay);
                }
            }
        });
    }
}

// --- Task Actions ---
export async function deleteTask(id) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }
    const taskElements = document.querySelectorAll(`li[data-id="${id}"]`);
    if (taskElements.length > 0) {
        taskElements.forEach(el => el.remove());
    }
    try {
        await api.deleteTask(id);
        loadDashboardTasks();
    } catch (error) {
        console.error('Failed to delete task:', error);
        loadDashboardTasks();
        loadAllTasks();
    }
}

export async function toggleTaskCompletion(id, completed) {
    const taskElements = document.querySelectorAll(`li[data-id="${id}"]`);
    if (taskElements.length > 0) {
        taskElements.forEach(el => el.classList.toggle('completed', completed));
    }
    try {
        await api.updateTask(id, { completed });
        loadDashboardTasks();
    } catch (error) {
        console.error('Failed to update task:', error);
        if (taskElements.length > 0) taskElements.forEach(el => el.classList.toggle('completed', !completed));
    }
}

export async function updateTaskPriority(id, priority) {
    try {
        await api.updateTask(id, { priority: parseInt(priority, 10) });
        loadDashboardTasks();
        loadAllTasks();
    } catch (error) {
        console.error('Failed to update priority', error);
        loadAllTasks();
    }
}

// --- Task Editing ---
export function handleEditClick(event) {
    const li = event.target.closest('li[data-id]');
    if (!li) return;
    const taskId = li.dataset.id;
    const currentTitleSpan = li.querySelector('.task-title');
    if (currentTitleSpan.tagName === 'INPUT') return;
    const originalTitle = currentTitleSpan.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalTitle;
    input.className = 'task-title-edit-input';
    currentTitleSpan.replaceWith(input);
    input.focus();
    input.addEventListener('blur', () => saveOrCancelEdit(li, taskId, input, originalTitle));
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            input.blur();
        } else if (e.key === 'Escape') {
            cancelEdit(li, input, originalTitle);
        }
    });
}

async function saveOrCancelEdit(li, taskId, inputElement, originalTitle) {
    const newTitle = inputElement.value.trim();
    if (newTitle === originalTitle || newTitle === '') {
        cancelEdit(li, inputElement, originalTitle);
        return;
    }
    try {
        await api.updateTask(taskId, { title: newTitle });
        loadDashboardTasks();
        loadAllTasks();
    } catch (error) {
        console.error('Failed to update task title:', error);
        elements.authError.textContent = `Error updating task: ${error.message}`;
        cancelEdit(li, inputElement, originalTitle);
    }
}

function cancelEdit(li, inputElement, originalTitle) {
    const originalTitleSpan = document.createElement('span');
    originalTitleSpan.className = 'task-title';
    originalTitleSpan.textContent = originalTitle;
    inputElement.replaceWith(originalTitleSpan);
}

// --- Add Task Form Handler ---
export async function handleAddTask(e) {
    e.preventDefault();
    const title = elements.taskInput.value.trim();
    const priority = elements.taskPriorityInput.value;
    const prioritySchedule = elements.taskPriorityScheduleInput.value;
    const notificationDate = elements.taskNotificationDateInput.value;

    if (title) {
        try {
            await api.addTask(title, priority, prioritySchedule, notificationDate);
            elements.taskInput.value = '';
            elements.taskPriorityInput.value = '3';
            elements.taskPriorityScheduleInput.value = '';
            elements.taskNotificationDateInput.value = '';
            hideAddTaskFormAndShowFab();
            elements.taskInput.focus();
            loadDashboardTasks();
        } catch (error) {
            console.error('Failed to add task, attempting offline save.', error);
            if ('serviceWorker' in navigator && 'SyncManager' in window) {
                try {
                    const db = await idb.openDB('tasklab-db', 1);
                    await db.add('sync-tasks', { title, priority, prioritySchedule, notificationDate });
                    const registration = await navigator.serviceWorker.ready;
                    await registration.sync.register('sync-new-task');
                    showToast('You are offline. Task saved for syncing.');
                    hideAddTaskFormAndShowFab();
                } catch (dbError) {
                    console.error('Failed to save task for offline sync.', dbError);
                    elements.authError.textContent = 'Could not save task for offline sync.';
                }
            } else {
                elements.authError.textContent = `Error: ${error.message}`;
            }
        }
    }
}