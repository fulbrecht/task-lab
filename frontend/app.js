const taskList = document.getElementById('task-list');
const addTaskForm = document.getElementById('add-task-form');
const newTaskTitleInput = document.getElementById('new-task-title');

const API_URL = '/api/tasks';

// --- API Functions ---

const fetchTasks = async () => {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Network response was not ok');
        const tasks = await response.json();
        renderTasks(tasks);
    } catch (error) {
        console.error('Failed to fetch tasks:', error);
        taskList.innerHTML = '<li>Error loading tasks. Please try again.</li>';
    }
};

const addTask = async (title) => {
    try {
        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title }),
        });
        fetchTasks(); // Re-fetch to display the new list
    } catch (error) {
        console.error('Failed to add task:', error);
    }
};

const updateTask = async (id, updates) => {
    try {
        await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        fetchTasks();
    } catch (error) {
        console.error('Failed to update task:', error);
    }
};

const deleteTask = async (id) => {
    try {
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        fetchTasks();
    } catch (error) {
        console.error('Failed to delete task:', error);
    }
};

// --- DOM Manipulation ---

const renderTasks = (tasks) => {
    taskList.innerHTML = '';
    if (tasks.length === 0) {
        taskList.innerHTML = '<li class="task-item">No tasks yet. Add one!</li>';
        return;
    }
    tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        li.dataset.id = task._id;

        li.innerHTML = `
            <span class="task-title">${task.title}</span>
            <div class="task-actions">
                <button class="complete-btn">✓</button>
                <button class="edit-btn">✎</button>
                <button class="delete-btn">🗑</button>
            </div>
        `;
        taskList.appendChild(li);
    });
};

// --- Event Listeners ---

addTaskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = newTaskTitleInput.value.trim();
    if (title) {
        addTask(title);
        newTaskTitleInput.value = '';
    }
});

taskList.addEventListener('click', (e) => {
    const target = e.target;
    const taskItem = target.closest('.task-item');
    if (!taskItem) return;

    const id = taskItem.dataset.id;

    if (target.classList.contains('complete-btn')) {
        updateTask(id, { completed: true });
    } else if (target.classList.contains('delete-btn')) {
        if (confirm('Are you sure you want to delete this task?')) {
            deleteTask(id);
        }
    } else if (target.classList.contains('edit-btn') || target.classList.contains('task-title')) {
        const currentTitle = taskItem.querySelector('.task-title').textContent;
        const newTitle = prompt('Edit task:', currentTitle);
        if (newTitle && newTitle.trim() !== currentTitle) {
            updateTask(id, { title: newTitle.trim() });
        }
    }
});

// Initial fetch
document.addEventListener('DOMContentLoaded', fetchTasks);