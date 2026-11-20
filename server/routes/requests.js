import { Router } from 'express';
import pool, { withTransaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  HttpError, asyncHandler, badRequest, conflict, notFound, parseId,
  vDate, vEnum, vInt, vNumber, vString,
} from '../utils/http.js';

const PRIORITIES = ['низький', 'звичайний', 'високий', 'терміновий'];
const FINAL_STATUSES = ['видано', 'скасовано'];

const SELECT = `
  SELECT r.request_id AS id,
         c.client_id AS "clientId", c.full_name AS client, c.phone AS "clientPhone",
         d.device_id AS "deviceId", d.brand || ' ' || d.model AS device, d.type AS "deviceType",
         d.serial_number AS "serialNumber",
         r.master_id AS "masterId", m.full_name AS master,
         s.status_name AS status, r.priority,
         r.acceptance_date AS date,
         r.planned_completion_date AS "plannedCompletionDate",
         r.actual_completion_date AS "actualCompletionDate",
         r.problem_description AS problem, r.diagnosis_result AS diagnosis,
         r.warranty_id AS "warrantyId",
         w.warranty_type AS "warrantyType", w.start_date AS "warrantyStart", w.end_date AS "warrantyEnd",
         v.work_cost AS "workCost", v.parts_cost AS "partsCost", v.total_cost AS cost
  FROM repair_requests r
    JOIN devices d  ON d.device_id = r.device_id
    JOIN clients c  ON c.client_id = d.client_id
    JOIN statuses s ON s.status_id = r.status_id
    JOIN v_repair_cost v ON v.request_id = r.request_id
    LEFT JOIN masters m ON m.master_id = r.master_id
    LEFT JOIN warranties w ON w.warranty_id = r.warranty_id`;

// Умова видимості: адмін — усе, майстер — свої заявки, клієнт — заявки на свої пристрої
function scope(user, params) {
  if (user.role === 'admin') return 'TRUE';
  if (user.role === 'master') {
    params.push(user.masterId);
    return `r.master_id = $${params.length}`;
  }
  params.push(user.clientId);
  return `d.client_id = $${params.length}`;
}

// Заявка, яку цей користувач має право бачити (інакше 404, щоб не розкривати існування чужих)
async function findVisible(id, user, db = pool, { lock = false } = {}) {
  const params = [id];
  const cond = scope(user, params);
  const { rows } = await db.query(
      `${SELECT} WHERE r.request_id = $1 AND ${cond} ${lock ? 'FOR UPDATE OF r' : ''}`,
      params
  );
  if (!rows[0]) throw notFound('Заявку не знайдено');
  return rows[0];
}

async function loadDetail(id, user, db = pool) {
  const request = await findVisible(id, user, db);
  const [parts, history, review] = await Promise.all([
    db.query(
        `SELECT rp.part_id AS "partId", sp.part_name AS name, sp.part_number AS "partNumber",
                rp.quantity_used AS qty, rp.fixed_price AS price
         FROM request_parts rp JOIN spare_parts sp ON sp.part_id = rp.part_id
         WHERE rp.request_id = $1 ORDER BY rp.request_part_id`, [id]),
    db.query(
        `SELECT sh.history_id AS id, st.status_name AS status, sh.change_date AS date,
              m.full_name AS author, sh.change_comment AS comment
         FROM status_history sh
           JOIN statuses st ON st.status_id = sh.status_id
           LEFT JOIN masters m ON m.master_id = sh.masters_change_id
         WHERE sh.request_id = $1 ORDER BY sh.history_id`, [id]),
    db.query(
        `SELECT review_id AS id, rating, review_text AS text, created_date AS date
         FROM reviews WHERE request_id = $1`, [id]),
  ]);
  return { ...request, parts: parts.rows, history: history.rows, review: review.rows[0] ?? null };
}

const statusId = async (db, name) => {
  const { rows } = await db.query('SELECT status_id FROM statuses WHERE status_name = $1', [name]);
  if (!rows[0]) throw badRequest(`Невідомий статус «${name}»`);
  return rows[0].status_id;
};

// Зміна статусу: оновлює заявку + пише рядок в status_history (в одній транзакції з викликом)
async function applyStatus(db, request, newStatus, comment, user) {
  if (FINAL_STATUSES.includes(request.status)) {
    throw conflict(`Заявка зі статусом «${request.status}» уже закрита`);
  }
  if (request.status === newStatus) throw badRequest('Заявка вже має цей статус');

  const sid = await statusId(db, newStatus);
  await db.query(
      `UPDATE repair_requests
       SET status_id = $1,
           actual_completion_date = CASE WHEN $2 IN ('готово', 'видано')
                                           THEN COALESCE(actual_completion_date, GREATEST(CURRENT_DATE, acceptance_date))
                                         ELSE NULL END
       WHERE request_id = $3`,
      [sid, newStatus, request.id]
  );
  await db.query(
      `INSERT INTO status_history (request_id, status_id, masters_change_id, change_comment)
       VALUES ($1, $2, $3, $4)`,
      [request.id, sid, user.role === 'master' ? user.masterId : null, comment]
  );
}

const router = Router();
router.use(requireAuth);

// GET /api/requests?status=&masterId=&q=&active=1&limit=&offset=
router.get('/', asyncHandler(async (req, res) => {
  const params = [];
  const where = [scope(req.user, params)];

  if (req.query.status) {
    params.push(String(req.query.status));
    where.push(`s.status_name = $${params.length}`);
  }
  if (req.query.masterId && req.user.role === 'admin') {
    params.push(vInt(req.query.masterId, 'masterId', { min: 1 }));
    where.push(`r.master_id = $${params.length}`);
  }
  if (req.query.active === '1') where.push(`s.status_name NOT IN ('видано', 'скасовано')`);
  if (typeof req.query.q === 'string' && req.query.q.trim()) {
    params.push(`%${req.query.q.trim()}%`);
    const p = `$${params.length}`;
    where.push(`(c.full_name ILIKE ${p} OR d.brand || ' ' || d.model ILIKE ${p} OR r.request_id::text ILIKE ${p})`);
  }

  const limit = vInt(req.query.limit ?? 200, 'limit', { min: 1, max: 500 });
  const offset = vInt(req.query.offset ?? 0, 'offset', { min: 0 });
  params.push(limit, offset);

  const { rows } = await pool.query(
      `${SELECT} WHERE ${where.join(' AND ')}
     ORDER BY r.acceptance_date DESC, r.request_id DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
  );
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  res.json(await loadDetail(parseId(req.params.id), req.user));
}));

// POST /api/requests — запис на ремонт (клієнт; адмін — від імені клієнта з deviceId)
// body: { deviceId | device: { type, brand, model, serialNumber, purchaseDate? },
//         problem, date, time?, masterId? }
router.post('/', requireRole('client', 'admin'), asyncHandler(async (req, res) => {
  const b = req.body ?? {};
  const problem = vString(b.problem, 'Опис проблеми', { max: 1000 });
  const date = vDate(b.date, 'Дата');
  const time = b.time ? vString(b.time, 'Час', { max: 5 }) : null;
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw badRequest('Час має бути у форматі ГГ:ХХ');
  const masterId = vInt(b.masterId, 'masterId', { min: 1, required: false });

  const id = await withTransaction(async (db) => {
    // Минулу дату обирати не можна (порівняння з датою БД)
    const { rows: d } = await db.query('SELECT $1::date >= CURRENT_DATE AS ok', [date]);
    if (!d[0].ok) throw badRequest('Не можна обрати дату, що вже минула');

    // Пристрій: існуючий (свій) або новий
    let deviceId;
    if (b.deviceId) {
      deviceId = vInt(b.deviceId, 'deviceId', { min: 1 });
      const params = [deviceId];
      const ownerCond = req.user.role === 'client' ? (params.push(req.user.clientId), 'AND client_id = $2') : '';
      const { rows } = await db.query(`SELECT device_id FROM devices WHERE device_id = $1 ${ownerCond}`, params);
      if (!rows[0]) throw notFound('Пристрій не знайдено');
    } else {
      if (req.user.role !== 'client') throw badRequest('Адміністратор має вказати deviceId існуючого пристрою');
      const dev = b.device ?? {};
      const { rows } = await db.query(
          `INSERT INTO devices (client_id, brand, model, serial_number, type, purchase_date)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING device_id`,
          [
            req.user.clientId,
            vString(dev.brand, 'Бренд', { max: 50 }),
            vString(dev.model, 'Модель', { max: 100 }),
            vString(dev.serialNumber, 'Серійний номер', { max: 60 }),
            vString(dev.type, 'Тип пристрою', { max: 50 }),
            vDate(dev.purchaseDate, 'Дата купівлі', { required: false }),
          ]
      );
      deviceId = rows[0].device_id;
    }

    if (masterId) {
      const { rows } = await db.query('SELECT 1 FROM masters WHERE master_id = $1 AND is_active = 1', [masterId]);
      if (!rows[0]) throw badRequest('Обраний майстер недоступний');
    }

    // Гарантія, що діє на дату прийому, підставляється автоматично
    const { rows: w } = await db.query(
        `SELECT warranty_id FROM warranties
         WHERE device_id = $1 AND $2::date BETWEEN start_date AND end_date
         ORDER BY end_date DESC LIMIT 1`,
        [deviceId, date]
    );

    const sid = await statusId(db, 'прийнято');
    const { rows: created } = await db.query(
        `INSERT INTO repair_requests (device_id, master_id, status_id, warranty_id, acceptance_date, problem_description)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING request_id`,
        [deviceId, masterId, sid, w[0]?.warranty_id ?? null, date, problem]
    );
    const requestId = created[0].request_id;

    // У схемі немає поля для часу візиту — зберігаємо його в коментарі першого запису історії
    await db.query(
        `INSERT INTO status_history (request_id, status_id, change_comment) VALUES ($1, $2, $3)`,
        [requestId, sid, `Заявку створено${time ? `. Бажаний час візиту: ${time}` : ''}`]
    );
    return requestId;
  });

  res.status(201).json(await loadDetail(id, req.user));
}));

// PATCH /api/requests/:id/status { status, comment? } — майстер (свої) або адмін
router.patch('/:id/status', requireRole('master', 'admin'), asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const status = vString(req.body?.status, 'Статус', { max: 50 });
  const comment = vString(req.body?.comment, 'Коментар', { max: 500, required: false });

  await withTransaction(async (db) => {
    const request = await findVisible(id, req.user, db, { lock: true });
    await applyStatus(db, request, status, comment, req.user);
  });
  res.json(await loadDetail(id, req.user));
}));

// POST /api/requests/:id/complete — ремонт завершено, пристрій видано клієнту
router.post('/:id/complete', requireRole('master', 'admin'), asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  await withTransaction(async (db) => {
    const request = await findVisible(id, req.user, db, { lock: true });
    await applyStatus(db, request, 'видано', 'Ремонт завершено', req.user);
  });
  res.json(await loadDetail(id, req.user));
}));

// POST /api/requests/:id/cancel — клієнт може скасувати заявку, поки вона лише «прийнято»
router.post('/:id/cancel', requireRole('client'), asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  await withTransaction(async (db) => {
    const request = await findVisible(id, req.user, db, { lock: true });
    if (request.status !== 'прийнято') {
      throw conflict('Скасувати можна лише заявку у статусі «прийнято» — зверніться до сервісного центру');
    }
    await applyStatus(db, request, 'скасовано', 'Скасовано клієнтом', req.user);
  });
  res.json(await loadDetail(id, req.user));
}));

// PATCH /api/requests/:id { priority?, diagnosis?, workCost?, plannedCompletionDate?, masterId? }
// Майстер змінює свої заявки; призначати майстра може лише адмін
router.patch('/:id', requireRole('master', 'admin'), asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const b = req.body ?? {};

  await withTransaction(async (db) => {
    const request = await findVisible(id, req.user, db, { lock: true });
    if (req.user.role === 'master' && FINAL_STATUSES.includes(request.status)) {
      throw conflict('Закриту заявку змінювати не можна');
    }

    const sets = [];
    const params = [];
    let assignmentNote = null;
    const add = (column, value) => { params.push(value); sets.push(`${column} = $${params.length}`); };

    if (b.priority !== undefined) add('priority', vEnum(b.priority, 'Пріоритет', PRIORITIES));
    if (b.diagnosis !== undefined) add('diagnosis_result', vString(b.diagnosis, 'Діагностика', { max: 500, required: false }));
    if (b.workCost !== undefined) add('work_cost', vNumber(b.workCost, 'Вартість робіт', { min: 0, max: 99999999 }));
    if (b.plannedCompletionDate !== undefined) {
      const planned = vDate(b.plannedCompletionDate, 'Планова дата завершення', { required: false });
      if (planned && planned < request.date) throw badRequest('Планова дата не може бути раніше дати прийому');
      add('planned_completion_date', planned);
    }
    if (b.masterId !== undefined) {
      if (req.user.role !== 'admin') throw new HttpError(403, 'Призначати майстра може лише адміністратор');
      const masterId = vInt(b.masterId, 'masterId', { min: 1, required: false });
      let masterName = null;
      if (masterId) {
        const { rows } = await db.query('SELECT full_name FROM masters WHERE master_id = $1 AND is_active = 1', [masterId]);
        if (!rows[0]) throw badRequest('Обраний майстер недоступний');
        masterName = rows[0].full_name;
      }
      if (FINAL_STATUSES.includes(request.status)) throw conflict('У закритій заявці майстра змінювати не можна');
      add('master_id', masterId);
      if (masterId !== request.masterId) {
        // Зміна майстра фіксується в історії (статус не змінюється)
        assignmentNote = masterName
            ? `${request.masterId ? 'Майстра змінено' : 'Призначено майстра'}: ${masterName}`
            : 'Майстра знято із заявки';
      }
    }
    if (!sets.length) throw badRequest('Немає полів для оновлення');

    params.push(id);
    await db.query(`UPDATE repair_requests SET ${sets.join(', ')} WHERE request_id = $${params.length}`, params);
    if (assignmentNote) {
      await db.query(
          `INSERT INTO status_history (request_id, status_id, change_comment)
           SELECT $1, status_id, $2 FROM repair_requests WHERE request_id = $1`,
          [id, assignmentNote]
      );
    }
  });
  res.json(await loadDetail(id, req.user));
}));

// POST /api/requests/:id/parts { partId, quantity } — списує запчастину зі складу
router.post('/:id/parts', requireRole('master', 'admin'), asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const partId = vInt(req.body?.partId, 'partId', { min: 1 });
  const quantity = vInt(req.body?.quantity ?? 1, 'Кількість', { min: 1, max: 1000 });

  await withTransaction(async (db) => {
    const request = await findVisible(id, req.user, db, { lock: true });
    if (FINAL_STATUSES.includes(request.status)) throw conflict('До закритої заявки запчастини додавати не можна');

    // Блокуємо рядок запчастини, щоб два майстри не списали один і той самий залишок
    const { rows } = await db.query(
        'SELECT unit_price, stock_quantity FROM spare_parts WHERE part_id = $1 FOR UPDATE', [partId]);
    if (!rows[0]) throw notFound('Запчастину не знайдено');
    if (rows[0].stock_quantity < quantity) {
      throw conflict(`Недостатньо на складі: доступно ${rows[0].stock_quantity}`);
    }

    await db.query('UPDATE spare_parts SET stock_quantity = stock_quantity - $1 WHERE part_id = $2', [quantity, partId]);
    // Ціна фіксується на момент додавання (fixed_price); повторне додавання збільшує кількість
    await db.query(
        `INSERT INTO request_parts (request_id, part_id, quantity_used, fixed_price)
         VALUES ($1, $2, $3, $4)
           ON CONFLICT (request_id, part_id)
       DO UPDATE SET quantity_used = request_parts.quantity_used + EXCLUDED.quantity_used`,
        [id, partId, quantity, rows[0].unit_price]
    );
  });
  res.status(201).json(await loadDetail(id, req.user));
}));

// DELETE /api/requests/:id/parts/:partId — прибирає запчастину із заявки й повертає її на склад
router.delete('/:id/parts/:partId', requireRole('master', 'admin'), asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const partId = parseId(req.params.partId, 'partId');

  await withTransaction(async (db) => {
    const request = await findVisible(id, req.user, db, { lock: true });
    if (FINAL_STATUSES.includes(request.status)) throw conflict('У закритій заявці запчастини змінювати не можна');

    const { rows } = await db.query(
        'DELETE FROM request_parts WHERE request_id = $1 AND part_id = $2 RETURNING quantity_used', [id, partId]);
    if (!rows[0]) throw notFound('Такої запчастини в заявці немає');
    await db.query('UPDATE spare_parts SET stock_quantity = stock_quantity + $1 WHERE part_id = $2', [rows[0].quantity_used, partId]);
  });
  res.json(await loadDetail(id, req.user));
}));

// POST /api/requests/:id/review { rating, text? } — відгук клієнта на виданий ремонт
router.post('/:id/review', requireRole('client'), asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const rating = vInt(req.body?.rating, 'Оцінка', { min: 1, max: 5 });
  const text = vString(req.body?.text, 'Відгук', { max: 1000, required: false });

  const request = await findVisible(id, req.user);
  if (request.status !== 'видано') throw conflict('Залишити відгук можна лише після видачі пристрою');

  try {
    await pool.query(
        'INSERT INTO reviews (client_id, request_id, rating, review_text) VALUES ($1, $2, $3, $4)',
        [req.user.clientId, id, rating, text]
    );
  } catch (err) {
    if (err.code === '23505') throw conflict('Відгук на цю заявку вже залишено');
    throw err;
  }
  res.status(201).json(await loadDetail(id, req.user));
}));

export default router;
