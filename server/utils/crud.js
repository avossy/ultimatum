import pool from '../db.js';
import {
  asyncHandler, badRequest, notFound, parseId,
  vString, vInt, vNumber, vDate, vEmail, vFlag,
} from './http.js';

const PARSERS = {
  string: (v, f) => vString(v, f.label, { max: f.max, required: !f.nullable, min: f.min }),
  email: (v, f) => vEmail(v, f.label, { required: !f.nullable }),
  int: (v, f) => vInt(v, f.label, { min: f.min, max: f.max, required: !f.nullable }),
  number: (v, f) => vNumber(v, f.label, { min: f.min, max: f.max, required: !f.nullable }),
  date: (v, f) => vDate(v, f.label, { required: !f.nullable }),
  flag: (v, f) => vFlag(v, f.label, { required: !f.nullable }),
};

/**
 * Фабрика типового CRUD для довідникових таблиць (клієнти, майстри, пристрої, запчастини).
 *
 * config:
 *  idColumn   — первинний ключ таблиці
 *  table      — таблиця
 *  baseSelect — SELECT ... FROM table t ... (основна таблиця t; без WHERE/ORDER)
 *  orderBy    — напр. 't.full_name'
 *  search     — SQL-вирази для пошуку ?q= (ILIKE)
 *  fields     — [{ key, column, label, type, max, min, nullable, default }]
 *               key — ім'я в JSON (camelCase), column — колонка в БД
 */
export function makeCrud({ table, idColumn, baseSelect, orderBy, search = [], fields }) {
  const fetchOne = async (id, db = pool) => {
    const { rows } = await db.query(`${baseSelect} WHERE t.${idColumn} = $1`, [id]);
    return rows[0];
  };

  // Повертає { column: value } лише для переданих полів (partial) або для всіх (create)
  const collect = (body, { partial }) => {
    const out = {};
    for (const f of fields) {
      let raw = body[f.key];
      if (raw === undefined) {
        if (partial) continue;
        if (f.default !== undefined) raw = typeof f.default === 'function' ? f.default() : f.default;
      }
      out[f.column] = PARSERS[f.type](raw, f);
    }
    return out;
  };

  const list = asyncHandler(async (req, res) => {
    const params = [];
    let where = '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q && search.length) {
      params.push(`%${q}%`);
      where = `WHERE ${search.map((s) => `${s} ILIKE $1`).join(' OR ')}`;
    }
    const { rows } = await pool.query(`${baseSelect} ${where} ORDER BY ${orderBy}`, params);
    res.json(rows);
  });

  const getOne = asyncHandler(async (req, res) => {
    const row = await fetchOne(parseId(req.params.id));
    if (!row) throw notFound();
    res.json(row);
  });

  const create = asyncHandler(async (req, res) => {
    const data = collect(req.body ?? {}, { partial: false });
    const cols = Object.keys(data);
    const { rows } = await pool.query(
      `INSERT INTO ${table} (${cols.join(', ')})
       VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})
       RETURNING ${idColumn}`,
      cols.map((c) => data[c])
    );
    res.status(201).json(await fetchOne(rows[0][idColumn]));
  });

  const update = asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const data = collect(req.body ?? {}, { partial: true });
    const cols = Object.keys(data);
    if (cols.length === 0) throw badRequest('Немає полів для оновлення');
    const { rowCount } = await pool.query(
      `UPDATE ${table} SET ${cols.map((c, i) => `${c} = $${i + 1}`).join(', ')}
       WHERE ${idColumn} = $${cols.length + 1}`,
      [...cols.map((c) => data[c]), id]
    );
    if (!rowCount) throw notFound();
    res.json(await fetchOne(id));
  });

  const remove = asyncHandler(async (req, res) => {
    const { rowCount } = await pool.query(`DELETE FROM ${table} WHERE ${idColumn} = $1`, [parseId(req.params.id)]);
    if (!rowCount) throw notFound();
    res.status(204).end();
  });

  return { fetchOne, list, getOne, create, update, remove };
}
