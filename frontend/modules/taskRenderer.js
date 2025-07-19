import { elements } from './ui.js';

function createTaskElement(task, showControls) {
    const li = document.createElement('li');
    li.className = `priority-${task.priority} ${task.completed ? 'completed' : ''} ${task.snoozed ? 'snoozed' : ''}`;
    li.dataset.id = task._id;

    const controls = showControls ? `
        <div class="task-controls">
            <button class="edit-task-btn">&#9998;</button>
            <button class="delete-task-btn">Delete</button>
        </div>
    ` : '';

    const completedTimestamp = task.completed && task.completedTimestamp ? `
        <span class="completed-timestamp">Completed: ${new Date(task.completedTimestamp).toLocaleString()}</span>
    ` : '';

    li.innerHTML = `
        <div class="snooze-feedback"></div>
        <div class="priority-indicator priority-${task.priority}"></div>
        <span class="task-title">${task.title}</span>
        <span class="snooze-countdown"></span>
        ${completedTimestamp}
        ${controls}
    `;

    if (task.snoozed && task.snoozeUntil) {
        const countdownSpan = li.querySelector('.snooze-countdown');
        const updateCountdown = () => {
            const now = new Date();
            const snoozeUntil = new Date(task.snoozeUntil);
            const diff = snoozeUntil - now;

            if (diff <= 0) {
                countdownSpan.textContent = '(Snoozed)';
                clearInterval(intervalId);
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            countdownSpan.textContent = `(Snoozed for ${hours}h ${minutes}m ${seconds}s)`;
        };

        const intervalId = setInterval(updateCountdown, 1000);
        updateCountdown(); // Initial call
    }

    return li;
}

export function renderTasks(tasks, listElement, showControls) {
    listElement.innerHTML = '';
    const fragment = document.createDocumentFragment();
    tasks.forEach(task => fragment.appendChild(createTaskElement(task, showControls)));
    listElement.appendChild(fragment);
}

export function appendTask(task, listElement, showControls) {
    listElement.appendChild(createTaskElement(task, showControls));
}

export function removeTaskFromUI(taskId) {
    const taskElement = document.querySelector(`li[data-id="${taskId}"]`);
    if (taskElement) {
        taskElement.remove();
    }
}

export function updateTaskInUI(task) {
    const taskElement = document.querySelector(`li[data-id="${task._id}"]`);
    if (taskElement) {
        const newTaskElement = createTaskElement(task, true); // Assuming controls are shown
        taskElement.replaceWith(newTaskElement);
    }
}

export function replaceTaskInUI(tempId, finalTask) {
    const tempTaskElement = document.querySelector(`li[data-id="${tempId}"]`);
    if (tempTaskElement) {
        const finalTaskElement = createTaskElement(finalTask, true);
        tempTaskElement.replaceWith(finalTaskElement);
    }
}