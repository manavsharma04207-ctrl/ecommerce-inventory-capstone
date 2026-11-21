require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const { registerEventListeners } = require('./events/storeEvents');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

connectDB();
registerEventListeners(io);

// Global Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[http] ${req.method} ${req.originalUrl}`);
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reports', reportRoutes);

// Centralized Error Handler
app.use(errorHandler);

// Authenticate Socket.IO connections with JWT
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.token;
  if (!token) return next(new Error('Socket authentication required'));
  try {
    socket.user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    next();
  } catch (err) {
    next(new Error('Invalid socket token'));
  }
});

io.on('connection', (socket) => {
  console.log(`[socket] Connected: ${socket.user.name} (${socket.user.role})`);
  socket.join(`user_${socket.user.id}`);
  socket.join(`role_${socket.user.role}`);

  socket.on('disconnect', () => {
    console.log(`[socket] Disconnected: ${socket.user.name}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`[server] E-Commerce & Inventory API running on http://localhost:${PORT}`);
});