import { elements } from './ui.js';

function createTaskElement(task, showControls, isDashboardView) {
    const li = document.createElement('li');
    li.className = task.completed ? 'completed' : '';
    li.dataset.id = task._id;

    const priorityIndicator = document.createElement('div');
    priorityIndicator.className = `priority-indicator priority-${task.priority}`;
    li.appendChild(priorityIndicator);

    if (isDashboardView) {
        li.classList.add(`priority-size-${task.priority}`);
    }

    const titleSpan = document.createElement('span');
    titleSpan.className = 'task-title';
    titleSpan.textContent = task.title;
    li.appendChild(titleSpan);

    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'task-controls';

    if (showControls) {
        const prioritySelect = document.createElement('select');
        prioritySelect.title = "Change task priority";
        prioritySelect.innerHTML = `
            <option value="1" ${task.priority === 1 ? 'selected' : ''}>High</option>
            <option value="2" ${task.priority === 2 ? 'selected' : ''}>Medium</option>
            <option value="3" ${task.priority === 3 ? 'selected' : ''}>Low</option>
        `;
        controlsContainer.appendChild(prioritySelect);
    }

    const editBtn = document.createElement('button');
    editBtn.className = 'edit-task-btn';
    editBtn.innerHTML = '&#9998;';
    controlsContainer.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-task-btn';
    deleteBtn.textContent = 'Delete';
    controlsContainer.appendChild(deleteBtn);
    
    li.appendChild(controlsContainer);
    return li;
}

export function renderTasks(tasks, listElement, showControls) {
    listElement.innerHTML = '';
    const fragment = document.createDocumentFragment();
    const isDashboardView = (listElement === elements.dashboardTaskList);
    tasks.forEach(task => fragment.appendChild(createTaskElement(task, showControls, isDashboardView)));
    listElement.appendChild(fragment);
}