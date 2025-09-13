import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.resolve(__dirname, '../.env');
// console.log('Loading .env file from:', envPath);
dotenv.config({ path: envPath });

// Routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import documentRoutes from './routes/documents';

// Middleware
import { errorHandler } from './middleware/errorHandler';
import { auth } from './middleware/auth';

// console.log('Environment variables loaded:');
// console.log('GMAIL_USER:', process.env.GMAIL_USER ? 'Set' : 'Not set');
// console.log('GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? 'Set' : 'Not set');

const app = express();
const httpServer = createServer(app);

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8080',
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

// Socket.IO configuration
const io = new Server(httpServer, {
  cors: corsOptions
});

// Middleware
app.use(cors(corsOptions));


// Request logging middleware
app.use((req, _res, next) => {
  console.log('[Server] Request:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    params: req.params,
    query: req.query
  });
  next();
});

// Ensure proper JSON parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
// console.log('MongoDB URI:', process.env.MONGODB_URI || 'mongodb://localhost:27017/editsync');
// console.log('Connecting to MongoDB...');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/editsync')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.get('/api/health', (_req, res) => {
  // const timestamp = new Date().toISOString();
  // const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  // const userAgent = req.headers['user-agent'];
  // console.log(`[HEALTHCHECK] ${timestamp} | IP: ${ip} | User-Agent: ${userAgent}`);

  res.status(200).send('OK');
});
app.use('/api/auth', authRoutes);
app.use('/api/users', auth, userRoutes);
app.use('/api/documents', auth, documentRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  // console.log('Client connected:', socket.id);

  socket.on('join-document', (documentId: string) => {
    socket.join(documentId);
    // console.log(`Client ${socket.id} joined document ${documentId}`);
  });

  socket.on('leave-document', (documentId: string) => {
    socket.leave(documentId);
    // console.log(`Client ${socket.id} left document ${documentId}`);
  });

  socket.on('document-change', (data: { documentId: string; changes: unknown }) => {
    socket.to(data.documentId).emit('document-update', data.changes);
  });

  socket.on('disconnect', () => {
    // console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // console.log('Allowed CORS origins:', allowedOrigins);
});

