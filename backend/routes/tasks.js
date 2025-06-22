const express = require('express');
const router = express.Router();
const Task = require('../models/task');

// GET: Fetch the 3 oldest uncompleted tasks
router.get('/', async (req, res) => {
    try {
        const tasks = await Task.find({ completed: false })
            .sort({ createdAt: 1 })
            .limit(3);
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST: Create a new task
router.post('/', async (req, res) => {
    const task = new Task({
        title: req.body.title
    });
    try {
        const newTask = await task.save();
        res.status(201).json(newTask);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT: Update a task (e.g., mark as complete, edit title)
router.put('/:id', async (req, res) => {
    try {
        const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedTask) return res.status(404).json({ message: 'Task not found' });
        res.json(updatedTask);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE: Delete a task
router.delete('/:id', async (req, res) => {
    try {
        const task = await Task.findByIdAndDelete(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });
        res.json({ message: 'Deleted Task' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;