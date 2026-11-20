import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import { api } from '../api/index.js';
import { useFetch } from '../hooks/useFetch.js';
import './MastersPage.css';

export default function MastersPage() {
  const [query, setQuery] = useState('');
  const { data: masters, loading, error } = useFetch(() => api.masters.list(), []);

  const filtered = useMemo(() => {
    const list = masters ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (m) => m.name.toLowerCase().includes(q) || m.specialization.toLowerCase().includes(q)
    );
  }, [masters, query]);

  return (
    <div className="masters-page">
      <Header />

      <div className="masters-container">
      <div className="masters-inner">
        <div className="masters-heading">
          <div>
            <h1>Наші майстри</h1>
            <p>Досвідчені спеціалісти, які подбають про вашу техніку.</p>
          </div>
          <div className="masters-search">
            <input
              type="search"
              placeholder="Пошук майстра..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Пошук майстра"
            />
          </div>
        </div>

        <ul className="masters-list">
          {filtered.map((m) => (
            <li key={m.id} className="master-card">
              <div className="master-card__avatar" aria-hidden="true">
                {m.name.split(' ').map((p) => p[0]).join('')}
              </div>

              <div className="master-card__info">
                <h2>{m.name}</h2>
                <p className="master-card__specialty">{m.specialization}</p>
                <div className="master-card__meta">
                  <span>{m.rating ? `★ ${m.rating.toFixed(1)} (${m.reviewsCount} відгуків)` : 'Поки без відгуків'}</span>
                  <span>Стаж: {m.experienceYears} років</span>
                </div>
              </div>

              <Link to={`/booking?master=${m.id}`} className="btn-filled">
                Записатися
              </Link>
            </li>
          ))}

          {loading && <li className="masters-empty">Завантаження...</li>}
          {error && <li className="masters-empty">{error}</li>}
          {!loading && !error && filtered.length === 0 && (
            <li className="masters-empty">За вашим запитом майстрів не знайдено.</li>
          )}
        </ul>
      </div>
      </div>
    </div>
  );
}
