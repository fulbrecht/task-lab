import * as api from '../api.js';
import * as db from './localDb.js';
import { elements, showToast, hideAddTaskFormAndShowFab } from './ui.js';
import { renderTasks } from './taskRenderer.js';

// --- Data Sync and Loading ---

/**
 * Fetches tasks from the server and syncs them with the local IndexedDB.
 * Renders the UI from the local database afterwards.
 */
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

/**
 * Loads all tasks from the local IndexedDB and renders them to the UI.
 */
async function loadTasksFromDb() {
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

// --- Task Actions (Local First) ---

export async function handleAddTask(e) {
    e.preventDefault();
    const title = elements.taskInput.value.trim();
    if (!title) return;

    const newTask = {
        _id: `temp-${Date.now()}`,
        title,
        priority: parseInt(elements.taskPriorityInput.value, 10),
        prioritySchedule: elements.taskPriorityScheduleInput.value ? new Date(elements.taskPriorityScheduleInput.value).toISOString() : null,
        notificationDate: elements.taskNotificationDateInput.value ? new Date(elements.taskNotificationDateInput.value).toISOString() : null,
        list: elements.taskListInput.value,
        completed: false,
        snoozed: false,
    };

    await db.addTask(newTask);
    await loadTasksFromDb(); // Re-render from DB
    elements.taskInput.value = ''; // Clear the task input
    elements.taskPriorityInput.value = '3'; // Reset priority to default
    elements.taskPriorityScheduleInput.value = ''; // Clear schedule date
    elements.taskNotificationDateInput.value = ''; // Clear notification date
    elements.taskListInput.value = localStorage.getItem('currentTaskList') || ''; // Reset list to current list
    hideAddTaskFormAndShowFab();

    // Now, try to sync with the server in the background
    try {
        const serverTask = await api.addTask(newTask.title, newTask.priority, newTask.prioritySchedule, newTask.notificationDate, newTask.list);
        // Replace temporary task with server-confirmed task
        await db.deleteTask(newTask._id);
        await db.addTask(serverTask);
        await loadTasksFromDb(); // Re-render with final data
    } catch (error) {
        showToast('Task saved locally. It will sync with the server when you\'re back online.');
        console.error('Failed to add task to server:', error);
        // Add to request queue for background sync
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            await db.addToRequestQueue({
                url: '/api/tasks',
                method: 'POST',
                body: newTask, // Use newTask directly, as it contains all necessary data
                _id: newTask._id // Store the temporary ID for later reconciliation
            });
            navigator.serviceWorker.ready.then(reg => {
                reg.sync.register('sync-new-task');
            });
        }
    }
}

export async function handleDeleteTask(id) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    await db.deleteTask(id);
    await loadTasksFromDb();

    try {
        await api.deleteTask(id);
    } catch (error) {
        showToast('Task deleted locally. It will sync with the server later.');
        console.error('Failed to delete task on server:', error);
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            await db.addToRequestQueue({
                url: `/api/tasks/${id}`,
                method: 'DELETE',
                _id: id // Store the ID for later reconciliation
            });
            navigator.serviceWorker.ready.then(reg => {
                reg.sync.register('sync-delete-task');
            });
        }
    }
}

export async function handleUpdateTask(e) {
    e.preventDefault();
    const id = elements.editTaskId.value;
    const updatedTaskData = {
        title: elements.editTaskTitle.value.trim(),
        priority: parseInt(elements.editTaskPriority.value, 10),
        prioritySchedule: elements.editTaskPrioritySchedule.value ? new Date(elements.editTaskPrioritySchedule.value).toISOString() : null,
        notificationDate: elements.editTaskNotificationDate.value ? new Date(elements.editTaskNotificationDate.value).toISOString() : null,
        list: elements.editTaskList.value,
    };

    const existingTask = await db.getTask(id);
    const updatedTask = { ...existingTask, ...updatedTaskData };

    await db.updateTask(updatedTask);
    await loadTasksFromDb();
    elements.editTaskContainer.style.display = 'none';
    elements.showTaskFormBtn.style.display = 'block';

    try {
        await api.updateTask(id, updatedTaskData);
    } catch (error) {
        showToast('Task updated locally. It will sync with the server later.');
        console.error('Failed to update task on server:', error);
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            await db.addToRequestQueue({
                url: `/api/tasks/${id}`,
                method: 'PUT',
                body: updatedTaskData,
                _id: id // Store the ID for later reconciliation
            });
            navigator.serviceWorker.ready.then(reg => {
                reg.sync.register('sync-update-task');
            });
        }
    }
}

export async function handleToggleTaskCompletion(id, completed) {
    const task = await db.getTask(id);
    const updatedTask = {
        ...task,
        completed,
        completedTimestamp: completed ? new Date().toISOString() : null,
    };
    await db.updateTask(updatedTask);
    await loadTasksFromDb();

    try {
        await api.updateTask(id, { completed, completedTimestamp: updatedTask.completedTimestamp });
    } catch (error) {
        showToast('Completion status saved locally. It will sync later.');
        console.error('Failed to update task completion on server:', error);
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            await db.addToRequestQueue({
                url: `/api/tasks/${id}`,
                method: 'PUT',
                body: { completed, completedTimestamp: updatedTask.completedTimestamp },
                _id: id // Store the ID for later reconciliation
            });
            navigator.serviceWorker.ready.then(reg => {
                reg.sync.register('sync-update-task');
            });
        }
    }
}

export async function handleSnoozeTask(id, duration) {
    const task = await db.getTask(id);
    let snoozeUntil = null;
    let snoozed = true;

    if (duration === 'unsnooze') {
        snoozed = false;
    } else {
        const now = new Date();
        if (duration === 60 || duration === '1h') { // 1 hour
            snoozeUntil = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
        } else if (duration === 1440 || duration === '1d') { // 1 day
            snoozeUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
        } else if (typeof duration === 'number' && duration > 0) {
             snoozeUntil = new Date(now.getTime() + duration * 60 * 1000).toISOString();
        } else {
            // Invalid duration, so don't snooze
            snoozed = false;
        }
    }

    const updatedTask = {
        ...task,
        snoozed,
        snoozeUntil,
    };

    await db.updateTask(updatedTask);
    await loadTasksFromDb();

    try {
        await api.snoozeTask(id, duration);
    } catch (error) {
        showToast('Snooze status saved locally. It will sync later.');
        console.error('Failed to snooze task on server:', error);
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            await db.addToRequestQueue({
                url: `/api/tasks/${id}/snooze`,
                method: 'POST',
                body: { duration },
                _id: id // Store the ID for later reconciliation
            });
            navigator.serviceWorker.ready.then(reg => {
                reg.sync.register('sync-snooze-task');
            });
        }
    }
}

// --- UI Event Handlers ---

export async function handleEditClick(event) {
    const li = event.target.closest('li[data-id]');
    if (!li) return;
    const taskId = li.dataset.id;

    const task = await db.getTask(taskId);
    if (!task) {
        showToast('Could not find task details locally.');
        return;
    }

    elements.editTaskId.value = task._id;
    elements.editTaskTitle.value = task.title;
    elements.editTaskPriority.value = task.priority;
    elements.editTaskPrioritySchedule.value = toLocalDatetimeString(task.prioritySchedule);
    elements.editTaskNotificationDate.value = toLocalDatetimeString(task.notificationDate);
    elements.editTaskList.value = task.list || 'home';
    elements.editTaskContainer.style.display = 'block';
    elements.showTaskFormBtn.style.display = 'none';
}

function toLocalDatetimeString(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

let startX = 0;
let isMouseDown = false;
let targetLi = null;
let currentX = 0;
let isSwiping = false;

function handleGestureStart(e) {
    const swipeEnabled = localStorage.getItem('swipeToSnoozeEnabled') !== 'false';
    if (!swipeEnabled) return;

    if (e.target.closest('.task-controls')) {
        return;
    }
    
    targetLi = e.target.closest('li[data-id]');
    if (!targetLi) return;

    if (targetLi.classList.contains('completed')) {
        targetLi = null;
        return;
    }

    if (e.type === 'touchstart') {
        startX = e.changedTouches[0].screenX;
    } else if (e.type === 'mousedown') {
        isMouseDown = true;
        startX = e.screenX;
        e.preventDefault();
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
    } else {
        currentX = e.screenX;
    }

    const diffX = currentX - startX;
    if (Math.abs(diffX) > 10) {
        isSwiping = true;
    }

    if (diffX < 0) {
        targetLi.style.transform = `translateX(${diffX}px)`;
        const snoozeFeedback = targetLi.querySelector('.snooze-feedback');
        if (snoozeFeedback) {
            snoozeFeedback.classList.add('visible');
            if (targetLi.classList.contains('snoozed')) {
                snoozeFeedback.textContent = 'Unsnooze';
                snoozeFeedback.className = 'snooze-feedback visible snooze-unsnooze';
            } else if (diffX < -150) {
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

    if (diffX < -50) {
        handleSwipe(targetLi, diffX);
    } else {
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
    if (isMouseDown) {
        handleGestureEnd(e);
    }
}

function handleSwipe(li, diffX) {
    const taskId = li.dataset.id;
    if (li.classList.contains('snoozed')) {
        handleSnoozeTask(taskId, 'unsnooze');
        return;
    }
    let duration = '1h';
    if (diffX < -150) {
        duration = '1d';
    } else if (diffX < -50) {
        duration = '1h';
    }
    handleSnoozeTask(taskId, duration);
}

function handleTaskListClick(e) {
    if (isSwiping) {
        isSwiping = false;
        return;
    }
    const li = e.target.closest('li[data-id]');
    if (!li) return;

    const id = li.dataset.id;

    if (e.target.matches('.delete-task-btn')) {
        handleDeleteTask(id);
    } else if (e.target.matches('.edit-task-btn')) {
        handleEditClick(e);
    } else if (e.target.matches('.snooze-btn')) {
        const duration = prompt("Snooze for how many minutes?", "60");
        if (duration) {
            handleSnoozeTask(id, parseInt(duration, 10));
        }
    } else if (e.target.type === 'checkbox') {
        handleToggleTaskCompletion(id, e.target.checked);
    } else if (!e.target.closest('.task-controls')) { // Click on the task item itself, not a control
        const isCompleted = li.classList.contains('completed');
        handleToggleTaskCompletion(id, !isCompleted);
    }
}

export function setupTaskEventListeners() {
    elements.taskForm.addEventListener('submit', handleAddTask);
    elements.editTaskForm.addEventListener('submit', handleUpdateTask);
    elements.dashboardTaskList.addEventListener('click', handleTaskListClick);
    elements.browseTaskList.addEventListener('click', handleTaskListClick);

    // Gesture listeners
    elements.dashboardTaskList.addEventListener('touchstart', handleGestureStart, { passive: true });
    elements.dashboardTaskList.addEventListener('touchmove', handleGestureMove, { passive: true });
    elements.dashboardTaskList.addEventListener('touchend', handleGestureEnd);
    elements.dashboardTaskList.addEventListener('mousedown', handleGestureStart);
    elements.dashboardTaskList.addEventListener('mousemove', handleGestureMove);
    elements.dashboardTaskList.addEventListener('mouseup', handleGestureEnd);
    elements.dashboardTaskList.addEventListener('mouseleave', handleMouseLeave);

    elements.browseTaskList.addEventListener('touchstart', handleGestureStart, { passive: true });
    elements.browseTaskList.addEventListener('touchmove', handleGestureMove, { passive: true });
    elements.browseTaskList.addEventListener('touchend', handleGestureEnd);
    elements.browseTaskList.addEventListener('mousedown', handleGestureStart);
    elements.browseTaskList.addEventListener('mousemove', handleGestureMove);
    elements.browseTaskList.addEventListener('mouseup', handleGestureEnd);
    elements.browseTaskList.addEventListener('mouseleave', handleMouseLeave);
}

export function scheduleNotifications(tasks) {
    if (Notification.permission === 'granted') {
        tasks.forEach(task => {
            if (task.notificationDate) {
                const notificationTime = new Date(task.notificationDate).getTime();
                const now = new Date().getTime();
                if (notificationTime > now) {
                    const delay = notificationTime - now;
                    setTimeout(() => {
                        new Notification('Task Reminder', { body: task.title });
                    }, delay);
                }
            }
        });
    }
}
