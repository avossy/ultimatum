// 'YYYY-MM-DD' -> 'DD.MM.YYYY'
export const formatDate = (iso) => (iso ? iso.split('-').reverse().join('.') : '—');

// Локальна дата у форматі YYYY-MM-DD
export function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const formatMoney = (n) => `${Number(n ?? 0).toLocaleString('uk-UA')} ₴`;

// Текст про гарантію заявки: "виробника, до 12.05.2027" або "немає"
export const warrantyText = (r) =>
    r?.warrantyId
        ? `${r.warrantyType}, ${formatDate(r.warrantyStart)} – ${formatDate(r.warrantyEnd)}`
        : 'немає';
