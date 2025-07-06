import * as api from '../api.js';
import { elements, showToast, hideAddTaskFormAndShowFab } from './ui.js';
import { renderTasks } from './taskRenderer.js';

/**
 * Reloads the data for the currently active view (Dashboard or Browse All).
 * This ensures the UI is always in sync with the database after an action.
 */
async function reloadCurrentView() {
    try {
        if (elements.appContainer.style.display === 'block') {
            await loadDashboardTasks();
        } else if (elements.browseContainer.style.display === 'block') {
            await loadAllTasks();
        }
    } catch (error) {
        console.error('Error reloading current view:', error);
    }
}

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

        // Sort tasks: uncompleted first, then completed by newest
        tasks.sort((a, b) => {
            if (a.completed && !b.completed) {
                return 1;
            }
            if (!a.completed && b.completed) {
                return -1;
            }
            if (a.completed && b.completed) {
                return new Date(b.completedTimestamp) - new Date(a.completedTimestamp);
            }
            return 0; // Keep original order for uncompleted tasks
        });

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
        await reloadCurrentView();
    } catch (error) {
        console.error('Failed to delete task:', error);
        await reloadCurrentView(); // Restore task if deletion fails
    }
}

export async function toggleTaskCompletion(id, completed) {
    const taskElements = document.querySelectorAll(`li[data-id="${id}"]`);
    if (taskElements.length > 0) {
        taskElements.forEach(el => el.classList.toggle('completed', completed));
    }
    try {
        const updatePayload = {
            completed,
            completedTimestamp: completed ? new Date() : null,
        };
        await api.updateTask(id, updatePayload);
        await reloadCurrentView();
    } catch (error) {
        console.error('Failed to update task:', error);
        if (taskElements.length > 0) taskElements.forEach(el => el.classList.toggle('completed', !completed));
    }
}



export async function snoozeTask(id, duration) {
    const taskElements = document.querySelectorAll(`li[data-id="${id}"]`);
    // No direct DOM manipulation here, reloadCurrentView will handle rendering based on updated data

    try {
        await api.snoozeTask(id, duration);
        await reloadCurrentView();
    } catch (error) {
        console.error('Failed to snooze task:', error);
        await reloadCurrentView(); // Restore task if snoozing failed
    }
}

/**
 * Formats a date into a string suitable for a datetime-local input.
 * The browser's `Date` object automatically handles the conversion from the UTC
 * string (from the server) to the user's local time.
 * @param {string | Date} date The date to format.
 * @returns {string} The formatted date string (YYYY-MM-DDTHH:mm).
 */
function toLocalDatetimeString(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return ''; // Invalid date

    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// --- Task Editing ---
export async function handleEditClick(event) {
    const li = event.target.closest('li[data-id]');
    if (!li) return;
    const taskId = li.dataset.id;

    try {
        const task = await api.getTask(taskId);
        elements.editTaskId.value = task._id;
        elements.editTaskTitle.value = task.title;
        elements.editTaskPriority.value = task.priority;
        elements.editTaskPrioritySchedule.value = toLocalDatetimeString(task.prioritySchedule);
        elements.editTaskNotificationDate.value = toLocalDatetimeString(task.notificationDate);
        elements.editTaskContainer.style.display = 'block';
        elements.showTaskFormBtn.style.display = 'none';
    } catch (error) {
        console.error('Failed to fetch task for editing:', error);
        showToast('Error fetching task details.');
    }
}

export async function handleUpdateTask(e) {
    e.preventDefault();
    const id = elements.editTaskId.value;
    const updatedTask = {
        title: elements.editTaskTitle.value.trim(),
        priority: parseInt(elements.editTaskPriority.value, 10),
        prioritySchedule: elements.editTaskPrioritySchedule.value ? new Date(elements.editTaskPrioritySchedule.value).toISOString() : null,
        notificationDate: elements.editTaskNotificationDate.value ? new Date(elements.editTaskNotificationDate.value).toISOString() : null,
    };

    if (updatedTask.title) {
        try {
            await api.updateTask(id, updatedTask);
            elements.editTaskContainer.style.display = 'none';
            elements.showTaskFormBtn.style.display = 'block';
            showToast('Task updated successfully!');
            await reloadCurrentView();
        } catch (error) {
            console.error('Failed to update task:', error);
            elements.authError.textContent = `Error: ${error.message}`;
        }
    }
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
            await reloadCurrentView();
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