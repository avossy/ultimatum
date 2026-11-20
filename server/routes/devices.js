import { Router } from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { makeCrud } from '../utils/crud.js';
import { asyncHandler, notFound, parseId } from '../utils/http.js';

const crud = makeCrud({
  table: 'devices',
  idColumn: 'device_id',
  baseSelect: `SELECT t.device_id AS id, t.client_id AS "clientId", c.full_name AS client,
                      t.brand, t.model, t.serial_number AS "serialNumber", t.type,
                      t.purchase_date AS "purchaseDate"
               FROM devices t JOIN clients c ON c.client_id = t.client_id`,
  orderBy: 't.brand, t.model',
  search: ['t.brand', 't.model', 't.serial_number', 'c.full_name'],
  fields: [
    { key: 'clientId', column: 'client_id', label: 'Клієнт', type: 'int', min: 1 },
    { key: 'brand', column: 'brand', label: 'Бренд', type: 'string', max: 50 },
    { key: 'model', column: 'model', label: 'Модель', type: 'string', max: 100 },
    { key: 'serialNumber', column: 'serial_number', label: 'Серійний номер', type: 'string', max: 60 },
    { key: 'type', column: 'type', label: 'Тип', type: 'string', max: 50 },
    { key: 'purchaseDate', column: 'purchase_date', label: 'Дата купівлі', type: 'date', nullable: true },
  ],
});

const router = Router();
router.use(requireAuth);

// Адмін бачить усі пристрої; клієнт — лише свої (потрібно для вибору пристрою при записі)
router.get('/', requireRole('admin', 'client'), asyncHandler(async (req, res, next) => {
  if (req.user.role === 'admin') return crud.list(req, res, next);
  const { rows } = await pool.query(
    `SELECT t.device_id AS id, t.client_id AS "clientId", t.brand, t.model,
            t.serial_number AS "serialNumber", t.type, t.purchase_date AS "purchaseDate"
     FROM devices t WHERE t.client_id = $1 ORDER BY t.brand, t.model`,
    [req.user.clientId]
  );
  res.json(rows);
}));

router.get('/:id', requireRole('admin'), crud.getOne);

// Клієнт додає лише власний пристрій: clientId примусово береться з токена
router.post('/', requireRole('admin', 'client'), (req, res, next) => {
  if (req.user.role === 'client') req.body = { ...req.body, clientId: req.user.clientId };
  return crud.create(req, res, next);
});

router.patch('/:id', requireRole('admin'), crud.update);
router.delete('/:id', requireRole('admin'), crud.remove);

export default router;
