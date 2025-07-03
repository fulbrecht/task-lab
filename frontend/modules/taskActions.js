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
    const taskElements = document.querySelectorAll(`li[data-id="${id}"]`);
    const oldPriorities = new Map();

    // Optimistically update the UI
    if (taskElements.length > 0) {
        taskElements.forEach(el => {
            const oldPriority = el.className.match(/priority-(\d)/)[1];
            oldPriorities.set(el, oldPriority);
            el.classList.remove(`priority-${oldPriority}`);
            el.classList.add(`priority-${priority}`);
        });
    }

    try {
        await api.updateTask(id, { priority: parseInt(priority, 10) });
        // A short delay to let the user see the change before the list reorders
        setTimeout(() => {
            loadDashboardTasks();
            loadAllTasks();
        }, 300); // 300ms delay
    } catch (error) {
        console.error('Failed to update priority', error);
        // Revert the UI changes on failure
        if (taskElements.length > 0) {
            taskElements.forEach(el => {
                el.classList.remove(`priority-${priority}`);
                el.classList.add(`priority-${oldPriorities.get(el)}`);
            });
        }
        loadAllTasks(); // Still try to reload to get the correct state from the server
    }
}

export async function snoozeTask(id) {
    const taskElements = document.querySelectorAll(`li[data-id="${id}"]`);
    if (taskElements.length > 0) {
        taskElements.forEach(el => {
            el.classList.add('snoozed');
            // Remove the element after the animation completes
            setTimeout(() => {
                el.remove();
            }, 500); // Match the animation duration
        });
    }

    try {
        await api.snoozeTask(id);
        // No need to reload here, as the task is visually removed
    } catch (error) {
        console.error('Failed to snooze task:', error);
        // If the API call fails, we should probably restore the task
        loadDashboardTasks(); 
        loadAllTasks();
    }
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
        elements.editTaskPrioritySchedule.value = task.prioritySchedule ? new Date(task.prioritySchedule).toISOString().slice(0, 16) : '';
        elements.editTaskNotificationDate.value = task.notificationDate ? new Date(task.notificationDate).toISOString().slice(0, 16) : '';
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
            loadDashboardTasks();
            loadAllTasks();
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