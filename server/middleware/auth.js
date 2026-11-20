import jwt from 'jsonwebtoken';

// Перевіряє Bearer-токен і кладе { userId, role, clientId, masterId } у req.user.
// Нічого не підставляє з body/query — роль і власник беруться тільки з токена.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Потрібна авторизація' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { userId, role, clientId, masterId }
    next();
  } catch {
    return res.status(401).json({ error: 'Недійсний або прострочений токен' });
  }
}
