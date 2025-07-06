const express = require('express');
const Task = require('../models/task');
const { sendTaskNotifications } = require('./notifications');

const router = express.Router();

// This middleware protects all routes in this file
router.use((req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
});

// A function to apply priority updates based on schedules for all of a user's tasks.
const updateScheduledPriorities = async (userId) => {
    try {
      const now = new Date();
      
      // Restore snoozed tasks whose snoozeUntil date has passed
      const snoozedTasks = await Task.find({
        user: userId,
        snoozed: true,
        snoozeUntil: { $exists: true, $ne: null, $lte: now },
        completed: false,
      });

      for (const task of snoozedTasks) {
        task.snoozed = false;
        task.snoozeUntil = null;
        // The task's priority remains as it was before snoozing, no change needed here.
        await task.save();
      }

      // Update other tasks to high priority where the schedule has passed
      await Task.updateMany(
        {
          user: userId,
          snoozed: false, // Only update non-snoozed tasks
          priority: { $ne: 1 }, // Not already high
          prioritySchedule: { $exists: true, $ne: null, $lte: now },
          completed: false, // Only update uncompleted tasks
        },
        { $set: { priority: 1, prioritySchedule: null } }
      );
    } catch (error) {
      // Log the error but don't block the main request flow.
      console.error('Error updating scheduled task priorities:', error);
    }
  };

const processTasksMiddleware = async (req, res, next) => {
  // Run these tasks in parallel for efficiency
  await Promise.all([
    updateScheduledPriorities(req.user._id),
    sendTaskNotifications(req.user._id)
  ]);
  next();
};



// GET top 3 priority tasks for the dashboard (uncompleted only)
router.get('/dashboard', processTasksMiddleware, async (req, res, next) => {
  try {
    // Get limit from query, default to 3, and parse as integer.
    let limit = parseInt(req.query.limit, 10) || 3;
    // Add some validation to prevent excessively large requests.
    if (limit < 1 || limit > 10) {
        limit = 3;
    }


    const tasks = await Task.find({ user: req.user._id, completed: false, snoozed: false })
      .sort({ priority: 1, createdAt: 1 }) // Sort by priority (1=High), then age (oldest first)
      .limit(limit);
    
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

// GET all tasks for a user (for the browse page)
router.get('/', processTasksMiddleware, async (req, res, next) => {
  try {
    const tasks = await Task.find({ user: req.user._id });

    // Perform complex sorting on the server for consistency.
    // Sort order:
    // 1. Uncompleted tasks before completed tasks.
    // 2. Uncompleted tasks by priority (1-High first), then by creation date (oldest first).
    // 3. Completed tasks by completion date (newest first).
    tasks.sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      if (!a.completed) { // Both are uncompleted
        return a.priority - b.priority || new Date(a.createdAt) - new Date(b.createdAt);
      }
      // Both are completed
      return new Date(b.completedTimestamp) - new Date(a.completedTimestamp);
    });

    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

// GET a single task by ID
router.get('/:id', async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    next(error);
  }
});

// POST a new task
router.post('/', async (req, res, next) => {
  const task = new Task({
    title: req.body.title,
    priority: req.body.priority,
    prioritySchedule: req.body.prioritySchedule,
    notificationDate: req.body.notificationDate,
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
    const { title, completed, completedTimestamp, priority, prioritySchedule, notificationDate } = req.body;
    const updates = {};
    if (title != null) updates.title = title;
    if (completed != null) updates.completed = completed;
    if (priority != null) updates.priority = priority;
    if (prioritySchedule != null) updates.prioritySchedule = prioritySchedule;
    if (completedTimestamp !== undefined) updates.completedTimestamp = completedTimestamp;
    if (notificationDate != null) {
        updates.notificationDate = notificationDate;
        updates.notificationSent = false; // Reset notification status
    }

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

// SNOOZE/UNSNOOZE a task
router.post('/:id/snooze', async (req, res, next) => {
    try {
        const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
        if (!task) {
            return res.status(404).json({ message: 'Task not found or you do not have permission to edit it.' });
        }

        let updatedFields = {};
        if (task.snoozed) {
            // If already snoozed, unsnooze it
            updatedFields = {
                snoozed: false,
                snoozeUntil: null
            };
        } else {
            // If not snoozed, snooze it for the specified duration
            const { duration } = req.body;
            const now = new Date();
            let snoozeUntil;

            switch (duration) {
                case '1h':
                    snoozeUntil = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
                    break;
                case '1d':
                    snoozeUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day
                    break;
                
                default:
                    snoozeUntil = new Date(now.getTime() + 60 * 60 * 1000); // Default to 1 hour
            }

            updatedFields = {
                snoozed: true,
                snoozeUntil: snoozeUntil
            };
        }

        const updatedTask = await Task.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            { $set: updatedFields },
            { new: true, runValidators: true }
        );

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