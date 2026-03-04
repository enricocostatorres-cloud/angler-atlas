const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

// Security headers
app.use(helmet());

// CORS - restrict to known origin
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5000',
  credentials: true,
};
app.use(cors(corsOptions));

// Rate limiting (disabled in test environment to prevent interference)
if (process.env.NODE_ENV !== 'test') {
  // General rate limiter: 100 requests per 15 minutes
  app.use('/api/', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
  }));

  // Stricter rate limiter for auth endpoints: 10 requests per 15 minutes
  app.use('/api/auth/', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many auth attempts, please try again later' },
  }));
}

// Body parsing with size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/catches', require('./routes/catches'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/store', require('./routes/store'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date() });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/landing.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Centralized error handler
app.use(require('./middleware/errorHandler'));

module.exports = app;
