import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { makeCrud } from '../utils/crud.js';
import { badRequest } from '../utils/http.js';

const TYPES = ['виробника', 'сервісного центру'];

const crud = makeCrud({
  table: 'warranties',
  idColumn: 'warranty_id',
  baseSelect: `SELECT t.warranty_id AS id, t.device_id AS "deviceId",
                      d.brand || ' ' || d.model AS device, d.serial_number AS "serialNumber",
                      c.full_name AS client,
                      t.warranty_type AS type, t.start_date AS "startDate", t.end_date AS "endDate",
                      (CURRENT_DATE BETWEEN t.start_date AND t.end_date) AS "isActive"
               FROM warranties t
               JOIN devices d ON d.device_id = t.device_id
               JOIN clients c ON c.client_id = d.client_id`,
  orderBy: 't.end_date DESC, t.warranty_id DESC',
  search: ['d.brand', 'd.model', 'd.serial_number', 'c.full_name', 't.warranty_type'],
  fields: [
    { key: 'deviceId', column: 'device_id', label: 'Пристрій', type: 'int', min: 1 },
    { key: 'type', column: 'warranty_type', label: 'Тип гарантії', type: 'string', max: 30 },
    { key: 'startDate', column: 'start_date', label: 'Початок гарантії', type: 'date' },
    { key: 'endDate', column: 'end_date', label: 'Кінець гарантії', type: 'date' },
  ],
});

// Зрозумілі повідомлення замість загальної помилки CHECK-обмежень
function validate(req, res, next) {
  const b = req.body ?? {};
  if (b.type !== undefined && !TYPES.includes(b.type)) {
    return next(badRequest(`Тип гарантії має бути: ${TYPES.join(' / ')}`));
  }
  if (b.startDate && b.endDate && b.endDate < b.startDate) {
    return next(badRequest('Кінець гарантії не може бути раніше початку'));
  }
  return next();
}

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', crud.list);
router.get('/:id', crud.getOne);
router.post('/', validate, crud.create);
router.patch('/:id', validate, crud.update);
router.delete('/:id', crud.remove);

export default router;
