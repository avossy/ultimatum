// Спільні утиліти: помилки, обгортка для async-обробників, валідація вхідних даних.

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (msg) => new HttpError(400, msg);
export const notFound = (msg = 'Не знайдено') => new HttpError(404, msg);
export const conflict = (msg) => new HttpError(409, msg);

// Express 4 не ловить помилки з async-функцій — передаємо їх у errorHandler вручну
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Єдиний обробник помилок: переводить типові помилки PostgreSQL у зрозумілі відповіді
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });

  switch (err.code) {
    case '23505':
      return res.status(409).json({ error: 'Запис із такими унікальними даними вже існує' });
    case '23503':
      return res.status(409).json({ error: "Запис пов'язаний з іншими даними (або посилається на неіснуючий запис)" });
    case '23514':
      return res.status(400).json({ error: 'Значення не відповідає обмеженням бази даних' });
    case '23502':
      return res.status(400).json({ error: "Не заповнено обов'язкове поле" });
    case '22P02':
    case '22007':
    case '22008':
    case '22003':
      return res.status(400).json({ error: 'Некоректний формат даних' });
    default:
      console.error(err);
      return res.status(500).json({ error: 'Внутрішня помилка сервера' });
  }
}

// Валідація
const isEmpty = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

export function parseId(value, label = 'id') {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw notFound(`Некоректний ${label}`);
  return n;
}

export function vString(value, label, { max = 255, required = true, min = 0 } = {}) {
  if (isEmpty(value)) {
    if (required) throw badRequest(`Поле «${label}» обов'язкове`);
    return null;
  }
  if (typeof value !== 'string') throw badRequest(`Поле «${label}» має бути рядком`);
  const s = value.trim();
  if (s.length < min) throw badRequest(`Поле «${label}» має містити щонайменше ${min} символів`);
  if (s.length > max) throw badRequest(`Поле «${label}» не може бути довшим за ${max} символів`);
  return s;
}

export function vInt(value, label, { min = -Infinity, max = Infinity, required = true } = {}) {
  if (isEmpty(value)) {
    if (required) throw badRequest(`Поле «${label}» обов'язкове`);
    return null;
  }
  const n = Number(value);
  if (!Number.isInteger(n)) throw badRequest(`Поле «${label}» має бути цілим числом`);
  if (n < min || n > max) throw badRequest(`Поле «${label}» поза допустимим діапазоном`);
  return n;
}

export function vNumber(value, label, { min = -Infinity, max = Infinity, required = true } = {}) {
  if (isEmpty(value)) {
    if (required) throw badRequest(`Поле «${label}» обов'язкове`);
    return null;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) throw badRequest(`Поле «${label}» має бути числом`);
  if (n < min || n > max) throw badRequest(`Поле «${label}» поза допустимим діапазоном`);
  return n;
}

export function vDate(value, label, { required = true } = {}) {
  if (isEmpty(value)) {
    if (required) throw badRequest(`Поле «${label}» обов'язкове`);
    return null;
  }
  const s = String(value).trim();
  const d = new Date(`${s}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) {
    throw badRequest(`Поле «${label}» має бути датою у форматі РРРР-ММ-ДД`);
  }
  return s;
}

export function vEnum(value, label, list, { required = true } = {}) {
  if (isEmpty(value)) {
    if (required) throw badRequest(`Поле «${label}» обов'язкове`);
    return null;
  }
  if (!list.includes(value)) throw badRequest(`Поле «${label}» має бути одним із: ${list.join(', ')}`);
  return value;
}

export function vEmail(value, label = 'Email', { required = false } = {}) {
  const s = vString(value, label, { max: 100, required });
  if (s && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw badRequest(`Поле «${label}» має містити коректну адресу`);
  return s;
}

// true/false/1/0 -> 1/0 для колонок SMALLINT (is_active)
export function vFlag(value, label, { required = true } = {}) {
  if (isEmpty(value)) {
    if (required) throw badRequest(`Поле «${label}» обов'язкове`);
    return null;
  }
  if (value === true || value === 1 || value === '1' || value === 'true') return 1;
  if (value === false || value === 0 || value === '0' || value === 'false') return 0;
  throw badRequest(`Поле «${label}» має бути true або false`);
}
