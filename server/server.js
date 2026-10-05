const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { setupWebSocket } = require('./websocket');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const db = require('./db');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

// Initialize database
db.loadDb();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger for debugging
app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
    console.log(`[API] ${req.method} ${req.url}`);
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    engine: 'TaskFlow Real-Time Task Management Engine'
  });
});

// Serve frontend static assets
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// Fallback for SPA routing (Express 5 compatible)
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Attach WebSocket Server
setupWebSocket(server);

// Start server
server.listen(PORT, () => {
  console.log('========================================================');
  console.log(`🚀 TaskFlow Server running at http://localhost:${PORT}`);
  console.log(`⚡ WebSocket Server attached and broadcasting`);
  console.log(`📂 Serving static files from: ${publicPath}`);
  console.log('========================================================');
});

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
