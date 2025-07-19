const Task = require('./models/task');
const { sendTaskNotifications } = require('./routes/notifications');

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: 'Unauthorized' });
}

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

module.exports = { ensureAuthenticated, processTasksMiddleware };