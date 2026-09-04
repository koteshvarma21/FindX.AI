// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const lostItemsRouter = require('./routes/lostItems');
const authRouter = require('./routes/auth');
const imagesRouter = require('./routes/images');
const foundItemsRouter = require('./routes/foundItems'); // add when that module exists
// const matchesRouter = require('./routes/matches');       // add when matching AI is wired up
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

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
app.use(express.json({ limit: '10mb' }));

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
// app.use('/api/matches', matchesRouter);

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
