const cron = require('node-cron');
const User = require('./models/user');
const Task = require('./models/task');
const { sendTaskNotifications } = require('./routes/notifications');

// This function will be called by the cron job
const checkScheduledTasks = async () => {
    console.log('Running scheduled task check...');
    try {
        const now = new Date();

        // Find all users to check their tasks
        const users = await User.find({});

        for (const user of users) {
            // Update priorities for tasks where the schedule has passed
            await Task.updateMany(
                {
                    user: user._id,
                    prioritySchedule: { $exists: true, $ne: null, $lte: now },
                    priority: { $ne: 1 },
                    completed: false,
                },
                { $set: { priority: 1 } }
            );

            // Send notifications for due tasks
            await sendTaskNotifications(user._id);
        }
    } catch (error) {
        console.error('Error during scheduled task check:', error);
    }
};

// Schedule the task to run every minute
cron.schedule(process.env.CRON_SCHEDULE || '* * * * *', checkScheduledTasks);

console.log('Scheduler initialized. Will run every minute.');

module.exports = { checkScheduledTasks };
