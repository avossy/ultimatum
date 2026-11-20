import { Router } from 'express';
import pool from '../db.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

// Довідник статусів (публічний)
router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT status_id AS id, status_name AS name, description FROM statuses ORDER BY status_id'
  );
  res.json(rows);
}));

export default router;
