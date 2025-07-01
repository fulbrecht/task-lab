const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    completed: {
        type: Boolean,
        default: false
    },
    priority: {
        type: Number,
        required: true,
        default: 3, // 1: High, 2: Medium, 3: Low
        min: 1,
        max: 3
    },
    dueDate: {
        type: Date,
        default: null
    },
    completedTimestamp: {
        type: Date,
        default: null
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    tags: {
        type: [String],
        default: []
    },
    subtasks: {
        type: [{
            title: { type: String, required: true, trim: true },
            completed: { type: Boolean, default: false }
        }],
        default: []
    },
    prioritySchedule: {
        type: Date,
        default: null
    },
    notificationDate: {
        type: Date,
        default: null
    },
    notificationSent: {
        type: Boolean,
        default: false
    },
}, { timestamps: true }); // Add timestamps to track creation date

// This pre-save hook automatically manages the completedTimestamp
taskSchema.pre('save', function(next) {
    // 'this' refers to the document being saved
    if (this.isModified('completed') && this.completed) {
        // If the 'completed' field was changed to true, set the timestamp
        this.completedTimestamp = new Date();
    } else if (this.isModified('completed') && !this.completed) {
        // If the task is being marked as incomplete, clear the timestamp
        this.completedTimestamp = null;
    }
    next();
});

// Add an index on the 'user' field for faster querying of tasks by user.
taskSchema.index({ user: 1 });

module.exports = mongoose.model('Task', taskSchema);