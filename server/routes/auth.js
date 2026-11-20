import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool, { withTransaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError, asyncHandler, badRequest, conflict, vEmail, vString } from '../utils/http.js';

const router = Router();

function signToken(user) {
  return jwt.sign(
    {
      userId: user.user_id,
      role: user.role,
      clientId: user.client_id,
      masterId: user.master_id,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Ім'я для хедера/дропдауна фронтенду — з clients чи masters залежно від ролі
async function displayName(user, db = pool) {
  if (user.role === 'client' && user.client_id) {
    const { rows } = await db.query('SELECT full_name FROM clients WHERE client_id = $1', [user.client_id]);
    return rows[0]?.full_name ?? user.login;
  }
  if (user.role === 'master' && user.master_id) {
    const { rows } = await db.query('SELECT full_name FROM masters WHERE master_id = $1', [user.master_id]);
    return rows[0]?.full_name ?? user.login;
  }
  return user.login;
}

const publicUser = (user, name) => ({
  login: user.login,
  role: user.role,
  name,
  clientId: user.client_id ?? null,
  masterId: user.master_id ?? null,
});

// POST /api/auth/login { login, password }
router.post('/login', asyncHandler(async (req, res) => {
  const { login, password } = req.body ?? {};
  if (!login || !password) throw badRequest('Вкажіть логін і пароль');

  const { rows } = await pool.query('SELECT * FROM users WHERE login = $1', [login]);
  const user = rows[0];
  // Однакова відповідь для «немає такого логіна» і «невірний пароль» — не розкриваємо, які логіни існують
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new HttpError(401, 'Невірний логін або пароль');
  }

  res.json({ token: signToken(user), user: publicUser(user, await displayName(user)) });
}));

// POST /api/auth/register { login, password, name, phone, email }
// Реєструє лише клієнта — майстрів і адмінів створює адміністратор (/api/users)
router.post('/register', asyncHandler(async (req, res) => {
  const login = vString(req.body?.login, 'Логін', { max: 100, min: 3 });
  const password = vString(req.body?.password, 'Пароль', { max: 100, min: 6 });
  const name = vString(req.body?.name, 'ПІБ', { max: 150 });
  const phone = vString(req.body?.phone, 'Телефон', { max: 20 });
  const email = vEmail(req.body?.email, 'Email');

  try {
    const user = await withTransaction(async (db) => {
      const { rows: c } = await db.query(
        'INSERT INTO clients (full_name, phone, email) VALUES ($1, $2, $3) RETURNING client_id',
        [name, phone, email]
      );
      const { rows: u } = await db.query(
        `INSERT INTO users (login, password_hash, role, client_id)
         VALUES ($1, $2, 'client', $3) RETURNING *`,
        [login, await bcrypt.hash(password, 10), c[0].client_id]
      );
      return u[0];
    });
    res.status(201).json({ token: signToken(user), user: publicUser(user, name) });
  } catch (err) {
    if (err.code === '23505') throw conflict('Такий логін або email вже зайнято');
    throw err;
  }
}));

// GET /api/auth/me — поточний користувач за токеном (для відновлення сесії)
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM users WHERE user_id = $1', [req.user.userId]);
  if (!rows[0]) throw new HttpError(401, 'Користувача більше не існує');
  res.json({ user: publicUser(rows[0], await displayName(rows[0])) });
}));

export default router;
