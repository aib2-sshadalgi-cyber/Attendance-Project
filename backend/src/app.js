const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const authRoutes = require('./routes/auth');
const adminStudentRoutes = require('./routes/adminStudents');
const subjectsRoutes = require('./routes/subjects');
const lecturesRoutes = require('./routes/lectures');
const attendanceRoutes = require('./routes/attendance');

function createApp() {
  const app = express();

  const normalizeOrigin = (value) => value.trim().replace(/\/$/, '');

  const origins =
    process.env.CORS_ORIGIN === '*'
      ? true
      : (process.env.CORS_ORIGIN || 'http://localhost:5173')
          .split(',')
          .map(normalizeOrigin)
          .filter(Boolean);

  app.use(
    cors({
      origin: origins,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '400kb' }));
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/auth', authRoutes);
  app.use('/api/admin/students', adminStudentRoutes);
  app.use('/api/subjects', subjectsRoutes);
  app.use('/api/lectures', lecturesRoutes);
  app.use('/api/attendance', attendanceRoutes);

  app.use((_req, res) => {
    res.status(404).json({ message: 'Not found' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ message: err.message || 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
