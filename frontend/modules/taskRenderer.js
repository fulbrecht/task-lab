import { elements } from './ui.js';

function createTaskElement(task, showControls) {
    const li = document.createElement('li');
    li.className = `priority-${task.priority}`;
    if (task.completed) {
        li.classList.add('completed');
    }
    li.dataset.id = task._id;

    const priorityIndicator = document.createElement('div');
    priorityIndicator.className = `priority-indicator priority-${task.priority}`;
    li.appendChild(priorityIndicator);

    const titleSpan = document.createElement('span');
    titleSpan.className = 'task-title';
    titleSpan.textContent = task.title;
    li.appendChild(titleSpan);

    if (task.completed && task.completedTimestamp) {
        const timestampSpan = document.createElement('span');
        timestampSpan.className = 'completed-timestamp';
        timestampSpan.textContent = `Completed: ${new Date(task.completedTimestamp).toLocaleString()}`;
        li.appendChild(timestampSpan);
    }

    if (showControls) {
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'task-controls';

        const editBtn = document.createElement('button');
        editBtn.className = 'edit-task-btn';
        editBtn.innerHTML = '&#9998;';
        controlsContainer.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-task-btn';
        deleteBtn.textContent = 'Delete';
        controlsContainer.appendChild(deleteBtn);
        
        li.appendChild(controlsContainer);
    }
    return li;
}

export function renderTasks(tasks, listElement, showControls) {
    listElement.innerHTML = '';
    const fragment = document.createDocumentFragment();
    tasks.forEach(task => fragment.appendChild(createTaskElement(task, showControls)));
    listElement.appendChild(fragment);
}