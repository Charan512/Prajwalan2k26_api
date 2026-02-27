const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Trust proxy - Required for rate limiting to work behind Render's reverse proxy
app.set('trust proxy', 1);

// Rate limiting configuration
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Relaxed from 5 to 50: Limit each IP to 50 login attempts per windowMs
  message: 'Too many login attempts, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.TIMER_URL,
  'http://localhost:5173',
  'http://localhost:5174',
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      console.log('✅ Allowed origins:', allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Apply rate limiting
app.use('/api/', generalLimiter); // Apply to all API routes

// Routes
app.use('/api/auth', authLimiter, require('./routes/auth')); // Stricter limit for auth
app.use('/api/admin', require('./routes/admin'));
app.use('/api/evaluator', require('./routes/evaluator'));
app.use('/api/teamlead', require('./routes/teamlead'));
app.use('/api/timer', require('./routes/timer')); // Timer routes for countdown
app.use('/api/game', require('./routes/game')); // Game scores and leaderboard

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Prajwalan API is running' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Prajwalan Server running on port ${PORT}`);
});
