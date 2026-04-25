require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const winston = require('winston');

const authRoutes = require('./routes/auth');
const claimsRoutes = require('./routes/claims');
const fraudRoutes = require('./routes/fraud');
const analyticsRoutes = require('./routes/analytics');
const exportRoutes = require('./routes/export');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PATCH'],
    credentials: true,
  },
});

app.set('io', io);

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Too many login attempts, please try again later.' },
});
app.use('/api/auth/', authLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/claims', claimsRoutes);
app.use('/api/fraud', fraudRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/export', exportRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date() } });
});

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.use((err, _req, res, _next) => {
  logger.error(err.message);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    logger.info('MongoDB connected');
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      logger.info(`TrustLens server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    logger.error(`MongoDB connection failed: ${err.message}`);
    process.exit(1);
  });

module.exports = { app, io };
