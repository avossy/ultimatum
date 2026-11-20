import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDate } from '../utils/format.js';
import '../styles/admin-table.css';
import '../pages/admin/AllRequestsPage.css';

const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

/**
 * Спільний список відгуків для адміна (усі) і майстра (лише його).
 *
 * props:
 *  reviews      — масив відгуків (GET /reviews)
 *  showMaster   — показувати колонку «Майстер» (для адміна)
 *  requestLink  — (requestId) => шлях до заявки
 *  status       — текст замість «Відгуків не знайдено» (завантаження / помилка)
 */
export default function ReviewsList({ reviews, showMaster = false, requestLink, status = '' }) {
  const [query, setQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reviews.filter((r) => {
      const matchesQuery =
        !q ||
        r.client.toLowerCase().includes(q) ||
        r.device.toLowerCase().includes(q) ||
        (r.text ?? '').toLowerCase().includes(q) ||
        String(r.requestId).includes(q) ||
        (showMaster && (r.master ?? '').toLowerCase().includes(q));
      const matchesRating = ratingFilter === 'all' || r.rating === Number(ratingFilter);
      return matchesQuery && matchesRating;
    });
  }, [reviews, query, ratingFilter, showMaster]);

  const average = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <main className="all-requests">
      <div className="all-requests__header">
        <h1>Відгуки</h1>
        <p>
          {filtered.length} із {reviews.length} відгуків
          {average && ` · середня оцінка ${average}`}
        </p>
      </div>

      <div className="all-requests__filters">
        <input
          type="search"
          placeholder={showMaster ? 'Пошук за клієнтом, майстром, пристроєм або текстом...' : 'Пошук за клієнтом, пристроєм або текстом...'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)}>
          <option value="all">Усі оцінки</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>{n} {n === 1 ? 'зірка' : n < 5 ? 'зірки' : 'зірок'}</option>
          ))}
        </select>
      </div>

      <div className="all-requests__table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Заявка</th>
              <th>Клієнт</th>
              <th>Пристрій</th>
              {showMaster && <th>Майстер</th>}
              <th>Оцінка</th>
              <th>Відгук</th>
              <th>Дата</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link to={requestLink(r.requestId)} className="admin-table__link">№{r.requestId}</Link>
                </td>
                <td>{r.client}</td>
                <td>{r.device}</td>
                {showMaster && <td>{r.master ?? '—'}</td>}
                <td>{stars(r.rating)}</td>
                <td>{r.text}</td>
                <td>{formatDate(r.date)}</td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={showMaster ? 7 : 6} className="all-requests__empty">{status || 'Відгуків не знайдено'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
