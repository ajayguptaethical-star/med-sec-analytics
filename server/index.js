require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');

const { initDatabase } = require('./db/database');
const { createEncryptedBackup } = require('./services/backupService');

const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const aiRoutes = require('./routes/aiRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false // Disabled for embedded dev scripts & map tiles
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve Uploads securely
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Serve Frontend dist bundle securely
app.use(express.static(path.join(__dirname, '..', 'dist')));

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

// General Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Healthcare Security & Disease Surveillance API'
  });
});

// 404 JSON Fallback for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
});

// SPA Client Routing Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

// Global Error Handling Middleware (Ensures JSON responses on errors instead of HTML)
app.use((err, req, res, next) => {
  console.error('[SERVER UNHANDLED ERROR]', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'SERVER_ERROR'
  });
});

// Daily Auto-Backup Timer (Runs every 24 hours)
setInterval(() => {
  console.log('[BACKUP SCHEDULE] Executing daily encrypted backup routine...');
  createEncryptedBackup().catch(err => console.error('Daily backup failed:', err));
}, 24 * 60 * 60 * 1000);

// Initialize DB and start listening
initDatabase()
  .then(() => {
    // Run an initial backup on server startup
    createEncryptedBackup();

    if (process.env.NODE_ENV !== 'test') {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`====================================================`);
        console.log(`🛡️  Secure Healthcare Server running on http://127.0.0.1:${PORT} & http://localhost:${PORT}`);
        console.log(`🔐  Field-Level Encryption & Hash-Chain Audit Active`);
        console.log(`====================================================`);
      });
    }
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
  });

module.exports = app;
