import { Router } from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { asyncHandler, badRequest, vDate } from '../utils/http.js';

// Аналітичні звіти для адміністратора. Усі приймають ?from=РРРР-ММ-ДД&to=РРРР-ММ-ДД
// (за замовчуванням — останні 30 днів) і рахуються на льоту з даних БД.
const router = Router();
router.use(requireAuth, requireRole('admin'));

function period(req) {
  const from = vDate(req.query.from, 'from', { required: false });
  const to = vDate(req.query.to, 'to', { required: false });
  if (from && to && to < from) throw badRequest('Дата «to» не може бути раніше за «from»');
  return [from, to];
}

const FROM = `COALESCE($1::date, CURRENT_DATE - 30)`;
const TO = `COALESCE($2::date, CURRENT_DATE)`;

// Заявки за період (за датою прийому): розподіл за статусами + виручка по виданих
router.get('/requests', asyncHandler(async (req, res) => {
  const [from, to] = period(req);
  const { rows: byStatus } = await pool.query(
    `SELECT s.status_name AS status, COUNT(r.request_id) AS count
     FROM statuses s
     LEFT JOIN repair_requests r ON r.status_id = s.status_id
          AND r.acceptance_date BETWEEN ${FROM} AND ${TO}
     GROUP BY s.status_id, s.status_name ORDER BY s.status_id`,
    [from, to]
  );
  const { rows: totals } = await pool.query(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(v.total_cost) FILTER (WHERE s.status_name = 'видано'), 0) AS revenue,
            ROUND(AVG(r.actual_completion_date - r.acceptance_date)
                  FILTER (WHERE s.status_name = 'видано'), 1) AS "avgDaysToComplete"
     FROM repair_requests r
     JOIN statuses s ON s.status_id = r.status_id
     JOIN v_repair_cost v ON v.request_id = r.request_id
     WHERE r.acceptance_date BETWEEN ${FROM} AND ${TO}`,
    [from, to]
  );
  res.json({ byStatus, ...totals[0] });
}));

// Завантаженість і результативність майстрів
router.get('/masters', asyncHandler(async (req, res) => {
  const [from, to] = period(req);
  const { rows } = await pool.query(
    `SELECT m.master_id AS id, m.full_name AS name,
            COUNT(r.request_id) AS "requestsTotal",
            COUNT(r.request_id) FILTER (WHERE s.status_name = 'видано') AS completed,
            COUNT(r.request_id) FILTER (WHERE s.status_name NOT IN ('видано', 'скасовано')) AS active,
            ROUND(AVG(r.actual_completion_date - r.acceptance_date)
                  FILTER (WHERE s.status_name = 'видано'), 1) AS "avgDaysToComplete",
            COALESCE(SUM(v.total_cost) FILTER (WHERE s.status_name = 'видано'), 0) AS revenue,
            (SELECT ROUND(AVG(rv.rating), 1)
             FROM reviews rv JOIN repair_requests rr ON rr.request_id = rv.request_id
             WHERE rr.master_id = m.master_id) AS "averageRating"
     FROM masters m
     LEFT JOIN repair_requests r ON r.master_id = m.master_id
          AND r.acceptance_date BETWEEN ${FROM} AND ${TO}
     LEFT JOIN statuses s ON s.status_id = r.status_id
     LEFT JOIN v_repair_cost v ON v.request_id = r.request_id
     GROUP BY m.master_id, m.full_name
     ORDER BY completed DESC, m.full_name`,
    [from, to]
  );
  res.json(rows);
}));

// Фінансовий звіт: виручка по місяцях (за датою фактичного завершення виданих заявок)
router.get('/finance', asyncHandler(async (req, res) => {
  const [from, to] = period(req);
  const { rows } = await pool.query(
    `SELECT to_char(date_trunc('month', r.actual_completion_date), 'YYYY-MM') AS month,
            COUNT(*) AS requests,
            SUM(v.work_cost) AS works,
            SUM(v.parts_cost) AS parts,
            SUM(v.total_cost) AS total
     FROM repair_requests r
     JOIN statuses s ON s.status_id = r.status_id AND s.status_name = 'видано'
     JOIN v_repair_cost v ON v.request_id = r.request_id
     WHERE r.actual_completion_date BETWEEN ${FROM} AND ${TO}
     GROUP BY 1 ORDER BY 1`,
    [from, to]
  );
  res.json(rows);
}));

// Використання запчастин за період (за датою прийому заявки) + поточні залишки
router.get('/parts', asyncHandler(async (req, res) => {
  const [from, to] = period(req);
  const { rows } = await pool.query(
    `SELECT sp.part_id AS id, sp.part_name AS name, sp.part_number AS "partNumber",
            COALESCE(SUM(rp.quantity_used), 0) AS "usedQuantity",
            COALESCE(SUM(rp.quantity_used * rp.fixed_price), 0) AS "usedAmount",
            sp.stock_quantity AS "stockQuantity",
            (sp.stock_quantity <= sp.min_stock_level) AS "lowStock"
     FROM spare_parts sp
     LEFT JOIN request_parts rp ON rp.part_id = sp.part_id
          AND EXISTS (SELECT 1 FROM repair_requests r
                      WHERE r.request_id = rp.request_id
                        AND r.acceptance_date BETWEEN ${FROM} AND ${TO})
     GROUP BY sp.part_id
     ORDER BY "usedQuantity" DESC, sp.part_name`,
    [from, to]
  );
  res.json(rows);
}));

export default router;
