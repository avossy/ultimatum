import { Router } from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();
router.use(requireAuth);

// GET /api/reviews — адмін бачить усі, майстер — лише по заявках, які виконував він, клієнт — свої
router.get('/', asyncHandler(async (req, res) => {
  const params = [];
  let cond = 'TRUE';
  if (req.user.role === 'master') {
    params.push(req.user.masterId);
    cond = 'r.master_id = $1';
  } else if (req.user.role === 'client') {
    params.push(req.user.clientId);
    cond = 'rv.client_id = $1';
  }

  const { rows } = await pool.query(
    `SELECT rv.review_id AS id, rv.request_id AS "requestId",
            c.full_name AS client, d.brand || ' ' || d.model AS device,
            r.master_id AS "masterId", m.full_name AS master,
            rv.rating, rv.review_text AS text, rv.created_date AS date
     FROM reviews rv
     JOIN repair_requests r ON r.request_id = rv.request_id
     JOIN devices d ON d.device_id = r.device_id
     JOIN clients c ON c.client_id = rv.client_id
     LEFT JOIN masters m ON m.master_id = r.master_id
     WHERE ${cond}
     ORDER BY rv.created_date DESC, rv.review_id DESC`,
    params
  );
  res.json(rows);
}));

export default router;
