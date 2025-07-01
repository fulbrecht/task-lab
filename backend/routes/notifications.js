const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const User = require('../models/user');
const Task = require('../models/task');

// This middleware protects all routes in this file
router.use((req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
});

// Route to provide the VAPID public key to the client
router.get('/vapidPublicKey', (req, res) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
        return res.status(500).send('VAPID public key not configured on the server.');
    }
    res.send(publicKey);
});

// Subscribe to push notifications
router.post('/subscribe', async (req, res) => {
    const subscription = req.body.subscription;
    const userId = req.user._id;

    try {
        await User.findByIdAndUpdate(userId, { $push: { subscriptions: subscription } });

        const payload = JSON.stringify({
            title: 'Task Lab Notifications Enabled!',
            body: 'You will now receive reminders for your tasks.',
        });

        webpush.sendNotification(subscription, payload).catch(err => console.error('Error sending welcome notification:', err));

        res.status(201).json({ message: 'Subscription successful.' });
    } catch (error) {
        console.error('Error saving subscription:', error);
        res.status(500).json({ message: 'Failed to save subscription.' });
    }
});

// Function to send notifications for tasks that are due
const sendTaskNotifications = async (userId) => {
    try {
        const now = new Date();
        const user = await User.findById(userId);
        if (!user || !user.subscriptions || user.subscriptions.length === 0) {
            return; // No subscriptions to send to
        }

        const tasks = await Task.find({
            user: userId,
            notificationDate: { $exists: true, $ne: null, $lte: now },
            completed: false,
            notificationSent: { $ne: true } // Add this condition
        });

        for (const task of tasks) {
            const payload = JSON.stringify({
                title: `Reminder: ${task.title}`,
                body: 'This task is due soon!',
                data: { taskId: task._id } // Send task ID for client-side routing
            });

            for (const sub of user.subscriptions) {
                try {
                    await webpush.sendNotification(sub, payload);
                } catch (error) {
                    console.error('Error sending notification to a subscription:', error);
                    // TODO: Handle stale subscriptions (e.g., remove from DB if error indicates it's no longer valid)
                }
            }

            // Mark the task as notification sent to avoid re-sending
            task.notificationSent = true;
            await task.save();
        }
    } catch (error) {
        console.error('Error sending task notifications:', error);
    }
};

module.exports = {
    router,
    sendTaskNotifications
};