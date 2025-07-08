const express = require('express');
const router = express.Router();
const User = require('../models/user');

// Middleware to ensure user is authenticated
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: 'Unauthorized' });
}

// Get all lists for the authenticated user
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ lists: user.lists });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching lists', error: error.message });
    }
});

// Add a new list for the authenticated user
router.post('/', ensureAuthenticated, async (req, res) => {
    const { listName } = req.body;
    if (!listName) {
        return res.status(400).json({ message: 'List name is required' });
    }

    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.lists.includes(listName)) {
            return res.status(409).json({ message: 'List already exists' });
        }

        user.lists.push(listName);
        await user.save();
        res.status(201).json({ message: 'List added successfully', lists: user.lists });
    } catch (error) {
        res.status(500).json({ message: 'Error adding list', error: error.message });
    }
});

// Delete a specific list for the authenticated user
router.delete('/:listName', ensureAuthenticated, async (req, res) => {
    const { listName } = req.params;

    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const initialLength = user.lists.length;
        user.lists = user.lists.filter(list => list !== listName);

        if (user.lists.length === initialLength) {
            return res.status(404).json({ message: 'List not found' });
        }

        await user.save();
        res.json({ message: 'List deleted successfully', lists: user.lists });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting list', error: error.message });
    }
});

module.exports = router;