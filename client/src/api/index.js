// Клієнт REST API сервера (/api, проксі налаштований у vite.config.js).
// Токен JWT зберігається в localStorage і додається до кожного запиту.

const BASE_URL = '/api';
export const TOKEN_KEY = 'ultimatum_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) =>
    token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY);

async function request(path, { method = 'GET', body, params } = {}) {
  const query = params
      ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null))
      : '';
  const token = getToken();

  const res = await fetch(`${BASE_URL}${path}${query}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && token && !path.startsWith('/auth/login')) {
    // Токен прострочений або недійсний — AuthContext розлогінить користувача
    window.dispatchEvent(new Event('auth:expired'));
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Помилка запиту: ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

const resource = (base) => ({
  list: (params) => request(base, { params }),
  get: (id) => request(`${base}/${id}`),
  create: (data) => request(base, { method: 'POST', body: data }),
  update: (id, data) => request(`${base}/${id}`, { method: 'PATCH', body: data }),
  remove: (id) => request(`${base}/${id}`, { method: 'DELETE' }),
});

export const api = {
  // авторизація і профіль
  login: (login, password) => request('/auth/login', { method: 'POST', body: { login, password } }),
  register: (data) => request('/auth/register', { method: 'POST', body: data }),
  me: () => request('/auth/me'),
  getProfile: () => request('/profile'),
  updateProfile: (data) => request('/profile', { method: 'PATCH', body: data }),

  // заявки
  requests: {
    ...resource('/requests'),
    updateStatus: (id, status, comment) =>
        request(`/requests/${id}/status`, { method: 'PATCH', body: { status, comment } }),
    complete: (id) => request(`/requests/${id}/complete`, { method: 'POST' }),
    cancel: (id) => request(`/requests/${id}/cancel`, { method: 'POST' }),
    addPart: (id, partId, quantity) =>
        request(`/requests/${id}/parts`, { method: 'POST', body: { partId, quantity } }),
    removePart: (id, partId) => request(`/requests/${id}/parts/${partId}`, { method: 'DELETE' }),
    review: (id, rating, text) =>
        request(`/requests/${id}/review`, { method: 'POST', body: { rating, text } }),
  },

  reviews: { list: () => request('/reviews') },
  statuses: { list: () => request('/statuses') },
  stats: { byStatus: () => request('/stats/by-status') },

  // публічний список (активні) і повний список для адміна
  masters: { ...resource('/masters'), listAll: () => request('/masters/all') },
  clients: resource('/clients'),
  devices: resource('/devices'),
  warranties: resource('/warranties'),
  parts: resource('/parts'),
  users: resource('/users'),

  reports: {
    requests: (params) => request('/reports/requests', { params }),
    masters: (params) => request('/reports/masters', { params }),
    finance: (params) => request('/reports/finance', { params }),
    parts: (params) => request('/reports/parts', { params }),
  },
};
