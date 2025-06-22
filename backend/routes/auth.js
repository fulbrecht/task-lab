const express = require('express');
const passport = require('passport');
const User = require('../models/user');

const router = express.Router();

// Register
router.post('/register', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists.' });
    }
    const user = new User({ username, password });
    await user.save();
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ message: 'Error logging in after registration.' });
      }
      res.status(201).json({ message: 'User registered successfully', user: { id: user._id, username: user.username } });
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', passport.authenticate('local'), (req, res) => {
  res.json({ message: 'Logged in successfully', user: { id: req.user._id, username: req.user.username } });
});

// Logout
router.get('/logout', (req, res, next) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.status(200).json({ message: 'Logged out successfully' });
  });
});

// Get current user
router.get('/user', (req, res) => {
  res.json({ user: req.isAuthenticated() ? { id: req.user._id, username: req.user.username } : null });
});

module.exports = router;