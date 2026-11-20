import { Router } from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { makeCrud } from '../utils/crud.js';
import { asyncHandler } from '../utils/http.js';

// Дата «сьогодні» для значення за замовчуванням hire_date
const today = () => new Date().toLocaleDateString('uk-UA');

const crud = makeCrud({
  table: 'masters',
  idColumn: 'master_id',
  baseSelect: `SELECT t.master_id AS id, t.full_name AS name, t.phone, t.specialization,
                      t.hire_date AS "hireDate", (t.is_active = 1) AS "isActive"
               FROM masters t`,
  orderBy: 't.full_name',
  search: ['t.full_name', 't.phone', 't.specialization'],
  fields: [
    { key: 'name', column: 'full_name', label: 'ПІБ', type: 'string', max: 150 },
    { key: 'phone', column: 'phone', label: 'Телефон', type: 'string', max: 20 },
    { key: 'specialization', column: 'specialization', label: 'Спеціалізація', type: 'string', max: 100 },
    { key: 'hireDate', column: 'hire_date', label: 'Дата прийняття', type: 'date', default: today },
    { key: 'isActive', column: 'is_active', label: 'Активний', type: 'flag', default: true },
  ],
});

const router = Router();

// Публічний список для сторінки «Наші майстри» і форми запису: лише активні, без телефону.
// Рейтинг — середня оцінка з відгуків по заявках майстра.
router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT m.master_id AS id, m.full_name AS name, m.specialization,
            EXTRACT(YEAR FROM age(CURRENT_DATE, m.hire_date))::int AS "experienceYears",
            ROUND(AVG(rv.rating), 1) AS rating,
            COUNT(rv.review_id) AS "reviewsCount"
     FROM masters m
     LEFT JOIN repair_requests r ON r.master_id = m.master_id
     LEFT JOIN reviews rv ON rv.request_id = r.request_id
     WHERE m.is_active = 1
     GROUP BY m.master_id
     ORDER BY m.full_name`
  );
  res.json(rows);
}));

// Адмінка: повні дані (з неактивними)
router.get('/all', requireAuth, requireRole('admin'), crud.list);
router.get('/:id', requireAuth, requireRole('admin'), crud.getOne);
router.post('/', requireAuth, requireRole('admin'), crud.create);
router.patch('/:id', requireAuth, requireRole('admin'), crud.update);
router.delete('/:id', requireAuth, requireRole('admin'), crud.remove);

export default router;
