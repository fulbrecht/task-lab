require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/user');
const Task = require('./models/task');

const usernameToDelete = process.argv[2]; // Get username from command line argument

if (!usernameToDelete) {
    console.error('Usage: node deleteUser.js <username>');
    process.exit(1);
}

const deleteUserAndTasks = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const user = await User.findOne({ username: usernameToDelete.toLowerCase() });

        if (!user) {
            console.log(`User '${usernameToDelete}' not found.`);
            return;
        }

        console.log(`Found user: ${user.username} (ID: ${user._id})`);

        // Delete all tasks associated with this user
        const deleteTasksResult = await Task.deleteMany({ user: user._id });
        console.log(`Deleted ${deleteTasksResult.deletedCount} tasks for user '${user.username}'.`);

        // Delete the user
        const deleteUserResult = await User.deleteOne({ _id: user._id });
        console.log(`Deleted user '${user.username}'.`);

    } catch (error) {
        console.error('Error deleting user and tasks:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }
};

deleteUserAndTasks();