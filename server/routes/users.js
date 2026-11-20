import { Router } from 'express';
import bcrypt from 'bcrypt';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { asyncHandler, badRequest, conflict, notFound, parseId, vEnum, vInt, vString } from '../utils/http.js';

const ROLES = ['client', 'master', 'admin'];

const SELECT = `
  SELECT u.user_id AS id, u.login, u.role,
         u.client_id AS "clientId", u.master_id AS "masterId",
         COALESCE(c.full_name, m.full_name, u.login) AS name,
         u.created_at::date AS "createdAt"
  FROM users u
  LEFT JOIN clients c ON c.client_id = u.client_id
  LEFT JOIN masters m ON m.master_id = u.master_id`;

const router = Router();
router.use(requireAuth, requireRole('admin'));

const fetchOne = async (id) => (await pool.query(`${SELECT} WHERE u.user_id = $1`, [id])).rows[0];

// Узгоджує роль із прив'язкою (CHECK chk_users_role_link): клієнт → client_id, майстер → master_id, адмін → нічого
function resolveLinks(role, clientId, masterId) {
  if (role === 'client') {
    if (!clientId) throw badRequest('Для ролі «client» вкажіть clientId');
    return { clientId, masterId: null };
  }
  if (role === 'master') {
    if (!masterId) throw badRequest('Для ролі «master» вкажіть masterId');
    return { clientId: null, masterId };
  }
  return { clientId: null, masterId: null };
}

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`${SELECT} ORDER BY u.user_id`);
  res.json(rows);
}));

router.post('/', asyncHandler(async (req, res) => {
  const b = req.body ?? {};
  const login = vString(b.login, 'Логін', { max: 100, min: 3 });
  const password = vString(b.password, 'Пароль', { max: 100, min: 6 });
  const role = vEnum(b.role, 'Роль', ROLES);
  const links = resolveLinks(
    role,
    vInt(b.clientId, 'clientId', { min: 1, required: false }),
    vInt(b.masterId, 'masterId', { min: 1, required: false })
  );

  const { rows } = await pool.query(
    `INSERT INTO users (login, password_hash, role, client_id, master_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING user_id`,
    [login, await bcrypt.hash(password, 10), role, links.clientId, links.masterId]
  );
  res.status(201).json(await fetchOne(rows[0].user_id));
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const b = req.body ?? {};
  const { rows } = await pool.query('SELECT * FROM users WHERE user_id = $1', [id]);
  const current = rows[0];
  if (!current) throw notFound();

  const login = b.login !== undefined ? vString(b.login, 'Логін', { max: 100, min: 3 }) : current.login;
  const role = b.role !== undefined ? vEnum(b.role, 'Роль', ROLES) : current.role;

  if (id === req.user.userId && role !== current.role) {
    throw conflict('Не можна змінити власну роль');
  }

  const links = resolveLinks(
    role,
    b.clientId !== undefined ? vInt(b.clientId, 'clientId', { min: 1 }) : current.client_id,
    b.masterId !== undefined ? vInt(b.masterId, 'masterId', { min: 1 }) : current.master_id
  );

  // Порожній/відсутній пароль = не змінювати
  const hash = b.password ? await bcrypt.hash(vString(b.password, 'Пароль', { max: 100, min: 6 }), 10) : current.password_hash;

  await pool.query(
    `UPDATE users SET login = $1, password_hash = $2, role = $3, client_id = $4, master_id = $5
     WHERE user_id = $6`,
    [login, hash, role, links.clientId, links.masterId, id]
  );
  res.json(await fetchOne(id));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (id === req.user.userId) throw conflict('Не можна видалити власний акаунт');
  const { rowCount } = await pool.query('DELETE FROM users WHERE user_id = $1', [id]);
  if (!rowCount) throw notFound();
  res.status(204).end();
}));

export default router;
