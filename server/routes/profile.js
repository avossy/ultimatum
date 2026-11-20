import { Router } from 'express';
import bcrypt from 'bcrypt';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, badRequest, vEmail, vString } from '../utils/http.js';

// Профіль поточного користувача.
// У схемі ПІБ/телефон/email зберігаються лише для клієнтів (clients) і ПІБ/телефон — для майстрів (masters).
// Для адміністратора окремих полів профілю в БД немає — повертається лише логін.
const router = Router();
router.use(requireAuth);

async function loadProfile(user) {
  if (user.role === 'client') {
    const { rows } = await pool.query(
      'SELECT full_name AS name, phone, email, address FROM clients WHERE client_id = $1',
      [user.clientId]
    );
    return rows[0];
  }
  if (user.role === 'master') {
    const { rows } = await pool.query(
      'SELECT full_name AS name, phone, NULL::text AS email, specialization FROM masters WHERE master_id = $1',
      [user.masterId]
    );
    return rows[0];
  }
  const { rows } = await pool.query('SELECT login AS name, NULL::text AS phone, NULL::text AS email FROM users WHERE user_id = $1', [user.userId]);
  return rows[0];
}

router.get('/', asyncHandler(async (req, res) => {
  res.json({ role: req.user.role, ...(await loadProfile(req.user)) });
}));

router.patch('/', asyncHandler(async (req, res) => {
  const b = req.body ?? {};
  const { role, clientId, masterId } = req.user;

  if (role === 'client') {
    const name = vString(b.name, 'Ім\'я', { max: 150 });
    const phone = vString(b.phone, 'Телефон', { max: 20 });
    const email = vEmail(b.email, 'Email');
    await pool.query(
      'UPDATE clients SET full_name = $1, phone = $2, email = $3 WHERE client_id = $4',
      [name, phone, email, clientId]
    );
  } else if (role === 'master') {
    const name = vString(b.name, 'Ім\'я', { max: 150 });
    const phone = vString(b.phone, 'Телефон', { max: 20 });
    await pool.query('UPDATE masters SET full_name = $1, phone = $2 WHERE master_id = $3', [name, phone, masterId]);
  } else {
    throw badRequest('Для адміністратора профіль у базі даних не зберігається (є лише логін і пароль)');
  }
  res.json({ role, ...(await loadProfile(req.user)) });
}));

// Зміна власного пароля
router.patch('/password', asyncHandler(async (req, res) => {
  const current = vString(req.body?.currentPassword, 'Поточний пароль', { max: 100 });
  const next = vString(req.body?.newPassword, 'Новий пароль', { max: 100, min: 6 });
  const { rows } = await pool.query('SELECT password_hash FROM users WHERE user_id = $1', [req.user.userId]);
  if (!rows[0] || !(await bcrypt.compare(current, rows[0].password_hash))) {
    throw badRequest('Поточний пароль невірний');
  }
  await pool.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [await bcrypt.hash(next, 10), req.user.userId]);
  res.status(204).end();
}));

export default router;
