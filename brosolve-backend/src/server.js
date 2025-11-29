// src/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const { auth } = require('./middleware/auth');
const { permit } = require('./middleware/role');
const complaintRoutes = require('./routes/complaints');
const publicRoutes = require('./routes/public');
const repliesRoutes = require('./routes/replies');
const exportsRoutes = require('./routes/exports');
const analyticsRoutes = require('./routes/analytics');
const analyticsDashboardRoutes = require('./routes/analyticsDashboard');
const auditRoutes = require('./routes/audit');
const adminsRoutes = require('./routes/admins');
const categoriesRoutes = require('./routes/categories');
const notificationsRoutes = require('./routes/notifications');
const quickRepliesRoutes = require('./routes/quickReplies');

const app = express();

// 🔍 DEBUG: Log before CORS
app.use((req, res, next) => {
  if (req.path === '/api/auth/login' && req.method === 'POST') {
    console.log('🔍 [SERVER] BEFORE CORS - Method:', req.method, 'Path:', req.path);
    console.log('🔍 [SERVER] BEFORE CORS - Headers:', JSON.stringify(req.headers, null, 2));
  }
  next();
});

// ✅ CORS setup: allow frontend origin explicitly
const corsOptions = {
  origin: "http://localhost:5173",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true
};
app.use(cors(corsOptions));

// 🔍 DEBUG: Log after CORS
app.use((req, res, next) => {
  if (req.path === '/api/auth/login' && req.method === 'POST') {
    console.log('🔍 [SERVER] AFTER CORS - Method:', req.method, 'Path:', req.path);
  }
  next();
});

// CRITICAL: express.json() MUST be before all routes to parse request body
app.use(express.json());

// 🔍 DEBUG: Log after express.json()
app.use((req, res, next) => {
  if (req.path === '/api/auth/login' && req.method === 'POST') {
    console.log('🔍 [SERVER] AFTER express.json() - Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// simple health route
app.get('/', (req, res) => {
  res.send('BRO Solve backend പ്രവർത്തിക്കുന്നു ✅');
});

// mount auth routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/replies', repliesRoutes);
app.use('/api/exports', exportsRoutes);
app.use('/api/public/analytics', analyticsRoutes);
app.use('/api/analytics/dashboard', analyticsDashboardRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/admins', adminsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/notifications', auth, notificationsRoutes);
app.use('/api/quick-replies', quickRepliesRoutes);

// Admin/SuperAdmin-only: Get all users (students get 403)
app.get('/api/users', auth, permit('admin', 'superadmin'), async (req, res) => {
  try {
    const User = require('./models/User');
    const users = await User.find({}, { passwordHash: 0 }).sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users', error: err.message });
  }
});

const PORT = process.env.PORT || 4000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected:", process.env.MONGO_URI);
    const HOST = '0.0.0.0';
    app.listen(PORT, HOST, () =>
      console.log(`✅ Server running at http://${HOST}:${PORT}`)
    );
  })
  .catch((err) => console.error('MongoDB error:', err));
