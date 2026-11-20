import express from 'express';
import dotenv from 'dotenv';
import pool from './db.js';
import { seedUsers } from './seed.js';
import { errorHandler, asyncHandler } from './utils/http.js';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import requestsRoutes from './routes/requests.js';
import reviewsRoutes from './routes/reviews.js';
import clientsRoutes from './routes/clients.js';
import mastersRoutes from './routes/masters.js';
import devicesRoutes from './routes/devices.js';
import warrantiesRoutes from './routes/warranties.js';
import partsRoutes from './routes/parts.js';
import usersRoutes from './routes/users.js';
import statusesRoutes from './routes/statuses.js';
import statsRoutes from './routes/stats.js';
import reportsRoutes from './routes/reports.js';

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET не задано — додайте його в .env');
  process.exit(1);
}

const app = express();
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/masters', mastersRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/warranties', warrantiesRoutes);
app.use('/api/parts', partsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/statuses', statusesRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/reports', reportsRoutes);

app.get('/api/health', asyncHandler(async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true });
}));

app.use('/api', (req, res) => res.status(404).json({ error: 'Маршрут не знайдено' }));
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  try {
    await seedUsers();
  } catch (err) {
    console.error('Seed error (БД ще не піднята чи схема не застосована?):', err.message);
  }
});
