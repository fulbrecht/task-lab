import { elements } from './ui.js';
import * as state from './state.js';

export function populateListSelects() {
    const lists = state.getUserLists();

    // Populate dashboard list select
    elements.taskListSelect.innerHTML = '';
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All Tasks';
    elements.taskListSelect.appendChild(allOption);
    lists.forEach(list => {
        const option = document.createElement('option');
        option.value = list;
        option.textContent = list.charAt(0).toUpperCase() + list.slice(1);
        elements.taskListSelect.appendChild(option);
    });
    const currentList = localStorage.getItem('currentTaskList') || 'all';
    elements.taskListSelect.value = currentList;

    // Populate add task list select
    elements.taskListInput.innerHTML = '';
    const noneOption = document.createElement('option');
    noneOption.value = '';
    noneOption.textContent = 'None';
    elements.taskListInput.appendChild(noneOption);
    lists.forEach(list => {
        const option = document.createElement('option');
        option.value = list;
        option.textContent = list.charAt(0).toUpperCase() + list.slice(1);
        elements.taskListInput.appendChild(option);
    });
    elements.taskListInput.value = localStorage.getItem('currentTaskList') || '';

    // Populate edit task list select
    elements.editTaskList.innerHTML = '';
    const editNoneOption = document.createElement('option');
    editNoneOption.value = '';
    editNoneOption.textContent = 'None';
    elements.editTaskList.appendChild(editNoneOption);
    lists.forEach(list => {
        const option = document.createElement('option');
        option.value = list;
        option.textContent = list.charAt(0).toUpperCase() + list.slice(1);
        elements.editTaskList.appendChild(option);
    });
}

export function renderUserLists(lists) {
    elements.userLists.innerHTML = '';
    lists.forEach(list => {
        const li = document.createElement('li');
        li.textContent = list;
        if (list !== 'home' && list !== 'work') { // Allow deleting only custom lists
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-list-btn';
            deleteBtn.dataset.listName = list;
            deleteBtn.textContent = 'Delete';
            li.appendChild(deleteBtn);
        }
        elements.userLists.appendChild(li);
    });
}