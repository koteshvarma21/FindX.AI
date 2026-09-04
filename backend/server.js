// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const lostItemsRouter = require('./routes/lostItems');
const authRouter = require('./routes/auth');
const imagesRouter = require('./routes/images');
const foundItemsRouter = require('./routes/foundItems');
const aiRouter = require('./routes/ai');
const matchesRouter = require('./routes/matches');
const { errorHandler } = require('./middleware/errorHandler');
const { uploadDirectory } = require('./services/imageStorage');

const app = express();
const PORT = process.env.PORT || 5000;
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
const expensiveLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
const matchingLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many matching requests. Please try again later.' } });

// --- Middleware ---
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
  })
);
app.use(express.json({ limit: '15mb' }));
app.use('/uploads', express.static(uploadDirectory));
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/ai', expensiveLimiter);
app.use('/api/images', expensiveLimiter);
app.use('/api/matches/run', matchingLimiter);

// --- Routes ---
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'FindX.AI backend is running.',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'not connected',
  });
});

app.use('/api/lost-items', lostItemsRouter);
app.use('/api/auth', authRouter);
app.use('/api/images', imagesRouter);
app.use('/api/found-items', foundItemsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/matches', matchesRouter);

// --- 404 handler ---
app.use((req, res) => {
  res.status(404).json({ success: false, errors: ['Route not found.'] });
});

// --- Global error handler ---
app.use(errorHandler);

// --- Connect to MongoDB, then start listening ---
async function start() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    app.listen(PORT, () => {
      console.log(`FindX.AI backend listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }
}

start();
