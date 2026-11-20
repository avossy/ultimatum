import { Router } from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();
router.use(requireAuth, requireRole('admin', 'master'));

// GET /api/stats/by-status — дані для дашбордів (адмін: усі заявки, майстер: свої)
router.get('/by-status', asyncHandler(async (req, res) => {
  const params = [];
  let cond = 'TRUE';
  if (req.user.role === 'master') {
    params.push(req.user.masterId);
    cond = 'r.master_id = $1';
  }

  // Усі статуси довідника, навіть якщо заявок з ними поки немає (count = 0)
  const { rows: statuses } = await pool.query(
    `SELECT s.status_name AS status, COUNT(r.request_id) AS count
     FROM statuses s
     LEFT JOIN repair_requests r ON r.status_id = s.status_id AND ${cond}
     GROUP BY s.status_id, s.status_name
     ORDER BY s.status_id`,
    params
  );

  const { rows: extra } = await pool.query(
    `SELECT COUNT(*) FILTER (WHERE s.status_name NOT IN ('видано', 'скасовано')) AS active,
            COUNT(*) FILTER (WHERE r.priority = 'терміновий'
                             AND s.status_name NOT IN ('видано', 'скасовано')) AS urgent,
            COUNT(*) AS total
     FROM repair_requests r JOIN statuses s ON s.status_id = r.status_id
     WHERE ${cond}`,
    params
  );

  const { rows: rating } = await pool.query(
    `SELECT ROUND(AVG(rv.rating), 1) AS "averageRating", COUNT(rv.review_id) AS "reviewsCount"
     FROM reviews rv JOIN repair_requests r ON r.request_id = rv.request_id
     WHERE ${cond}`,
    params
  );

  res.json({ statuses, ...extra[0], ...rating[0] });
}));

export default router;
