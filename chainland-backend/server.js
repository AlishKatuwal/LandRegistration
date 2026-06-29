import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import Routes
import authRoutes from './routes/auth.js';
import parcelRoutes from './routes/parcels.js';
import applicationRoutes from './routes/applications.js';
import disputeRoutes from './routes/disputes.js';
import notificationRoutes from './routes/notifications.js';
import activityRoutes from './routes/activities.js';
import historyRoutes from './routes/history.js';
import paymentRoutes from './routes/payments.js';
import blockchainRoutes from './routes/blockchain.js';
import analysisRoutes from './routes/analysis.js';
import zkpRoutes from './routes/zkp.js';

import { createServer } from 'http';
import { Server } from 'socket.io';
import notificationService from './services/notificationService.js';
import db from './config/db.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT"]
  }
});

// Wire NotificationService to Socket.IO
notificationService.setIO(io);

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Attach io to req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Socket logic
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Serve static uploads folder
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/parcels', parcelRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/zkp', zkpRoutes);

// Root Endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to ChainLand API' });
});

// Run migrations then start server
const startServer = async () => {
  try {
    console.log('🔄 Checking database schema...');
    // Auto-migrate notifications schema
    await db.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reference_id VARCHAR(100)`);
    await db.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50)`);
    await db.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications (user_lin, is_read, created_at DESC)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_notifications_reference ON notifications (reference_id, reference_type)`);
    console.log('✅ Database schema verified.');

    httpServer.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to verify database schema:', error);
    process.exit(1);
  }
};

startServer();
