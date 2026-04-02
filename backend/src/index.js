const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const sequelize = require('./config/database');
const { restoreActiveSessions } = require('./services/whatsappService');

// Import routes
const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessions');
const contactRoutes = require('./routes/contacts');
const blastRoutes = require('./routes/blast');
const messageRoutes = require('./routes/messages');
const dashboardRoutes = require('./routes/dashboard');
const usersRoutes = require('./routes/users');

const app = express();
const server = http.createServer(app);

// --- 1. KONFIGURASI CORS ---
// Ambil URL Frontend dari .env (Contoh: https://wablast.mendunia.id)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const corsOptions = {
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
};

// --- 2. MIDDLEWARE (URUTAN SANGAT PENTING) ---

// A. CORS harus paling atas agar Preflight Request (OPTIONS) diizinkan
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle semua request OPTIONS

// B. Helmet untuk keamanan (CSP dimatikan agar Socket.io lancar)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// C. Body Parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// D. Debug Log
console.log('-------------------------------------------');
console.log('🚀 WA BLAST BACKEND STARTING...');
console.log('DEBUG: FRONTEND_URL is', FRONTEND_URL);
console.log('DEBUG: PORT is', process.env.PORT || 3002);
console.log('-------------------------------------------');

// --- 3. SOCKET.IO SETUP ---
const io = new Server(server, {
  cors: corsOptions // Gunakan opsi CORS yang sama dengan Express
});

// Make io accessible in routes
app.set('io', io);

// --- 4. STATIC ASSETS ---
const uploadsDir = path.resolve('./uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// --- 5. ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/blast', blastRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', usersRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ 
  status: 'ok', 
  timestamp: new Date(),
  env: process.env.NODE_ENV || 'development'
}));

// --- 6. SOCKET.IO EVENTS ---
io.on('connection', (socket) => {
  console.log('New socket client connected:', socket.id);

  socket.on('join_user', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`Socket ${socket.id} joined room: user_${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// --- 7. DATABASE & SERVER START ---
const PORT = process.env.PORT || 3002;

sequelize.sync().then(() => {
  server.listen(PORT, async () => {
    console.log(`✅ Server running on port ${PORT}`);
    
    // Restore sessions yang sebelumnya berstatus 'connected'
    try {
      await restoreActiveSessions(io);
      console.log('✅ Active sessions restored');
    } catch (error) {
      console.error('❌ Error restoring sessions:', error);
    }
  });
}).catch(err => {
  console.error('❌ Database connection failed:', err);
});