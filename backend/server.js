const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const MongoStore = require('connect-mongo');
const webpush = require('web-push');
require('dotenv').config();

const User = require('./models/user'); // Import the User model
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');

const app = express();
const port = process.env.PORT || 3001;

// --- Push Notification Setup ---
// This needs to be configured before the routes that use it are defined.
const vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
};

if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
    console.log("VAPID keys not found in .env. Push notifications will be disabled. Generate them using 'npx web-push generate-vapid-keys'");
} else {
    webpush.setVapidDetails(
        'mailto:your-email@example.com', // Replace with your contact email
        vapidKeys.publicKey,
        vapidKeys.privateKey
    );
}

// In a production app, you should store subscriptions in a database.
let subscriptions = [];

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

// --- Session Configuration ---
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

// --- Passport.js Configuration ---
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await User.findOne({ username: username.toLowerCase() });
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// --- API Routes ---
app.use('/api', authRoutes);
app.use('/api/tasks', taskRoutes);
// Route to provide the VAPID public key to the client
app.get('/api/vapidPublicKey', (req, res) => {
    if (!vapidKeys.publicKey) {
        return res.status(500).send('VAPID public key not configured on the server.');
    }
    res.send(vapidKeys.publicKey);
});

// New route to handle push subscription
app.post('/api/subscribe', (req, res) => {
    const subscription = req.body;
    // TODO: Associate subscription with the logged-in user and save to DB
    console.log('Received subscription:', subscription);
    subscriptions.push(subscription);

    // Send a welcome notification for immediate feedback
    const payload = JSON.stringify({
        title: 'Task Lab Notifications Enabled!',
        body: 'You will now receive reminders for your tasks.',
    });
    webpush.sendNotification(subscription, payload).catch(err => console.error(err));

    res.status(201).json({ message: 'Subscription successful.' });
});

// --- Serve Frontend (Catch-all) ---
// This must come AFTER all API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});
// --- Centralized Error Handling Middleware ---
// This should be the last middleware loaded
app.use((err, req, res, next) => {
  console.error(err.stack); // Log the full error for debugging
  const statusCode = err.statusCode || 500;
  // Avoid leaking implementation details in production
  const message = process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message;
  res.status(statusCode).json({ message });
});
// --- Start Server ---
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

startServer();