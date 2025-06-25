require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/user');
const Task = require('./models/task');
const readline = require('readline');

const usernameToDelete = process.argv[2]; // Get username from command line argument

if (!usernameToDelete) {
    console.error('Usage: node deleteUser.js <username>');
    process.exit(1);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const deleteUserAndTasks = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const user = await User.findOne({ username: usernameToDelete.toLowerCase()});

        if (!user) {
            console.log(`User '${usernameToDelete}' not found.`);
            rl.close();
            return;
        }

        console.log(`Found user: ${user.username} (ID: ${user._id})`);

        rl.question(`Are you sure you want to permanently delete user '${user.username}' and all their tasks? This cannot be undone. (yes/no) `, async (answer) => {
            if (answer.toLowerCase() === 'yes') {
                // Delete all tasks associated with this user
                const deleteTasksResult = await Task.deleteMany({ user: user._id });
                console.log(`Deleted ${deleteTasksResult.deletedCount} tasks for user '${user.username}'.`);

                // Delete the user
                await User.deleteOne({ _id: user._id });
                console.log(`Successfully deleted user '${user.username}'.`);
            } else {
                console.log('Deletion cancelled.');
            }
            rl.close();
        });

    } catch (error) {
        console.error('Error deleting user and tasks:', error);
        rl.close();
    } finally {
        rl.on('close', async () => {
            await mongoose.disconnect();
            console.log('Disconnected from MongoDB');
            process.exit(0);
        });
    }
};

deleteUserAndTasks();