const express = require('express');
const Task = require('../models/task');

const router = express.Router();

// This middleware protects all routes in this file
router.use((req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
});

// GET top 3 priority tasks for the dashboard (uncompleted only)
router.get('/dashboard', async (req, res, next) => {
  try {
    const tasks = await Task.find({ user: req.user._id, completed: false })
      .sort({ priority: 1, createdAt: 1 }) // Sort by priority (1=High), then age (oldest first)
      .limit(3);
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

// GET all tasks for a user (for the browse page)
router.get('/', async (req, res, next) => {
  try {
     // Sort by creation date for a predictable order on the browse page
    const tasks = await Task.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

// POST a new task
router.post('/', async (req, res, next) => {
  const task = new Task({
    title: req.body.title,
    priority: req.body.priority,
    user: req.user._id,
  });

  try {
    const newTask = await task.save();
    res.status(201).json(newTask);
  } catch (error) {
    next(error);
  }
});

// PUT (update) a task
router.put('/:id', async (req, res, next) => {
  try {
    const { title, completed, priority } = req.body;
    const updates = {};
    if (title != null) updates.title = title;
    if (completed != null) updates.completed = completed;
    if (priority != null) updates.priority = priority;

    const updatedTask = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: updates },
      { new: true, runValidators: true } // Return the updated document and run schema validators
    );

    if (!updatedTask) {
      return res.status(404).json({ message: 'Task not found or you do not have permission to edit it.' });
    }
    res.json(updatedTask);
  } catch (error) {
    next(error);
  }
});

// DELETE a task
router.delete('/:id', async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user._id, });
    if (!task) return res.status(404).json({ message: 'Task not found or you do not have permission to delete it.' });
    res.json({ message: 'Task deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;