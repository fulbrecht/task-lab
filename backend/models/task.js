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
    }
}, { timestamps: true }); // Add timestamps to track creation date


module.exports = mongoose.model('Task', taskSchema);