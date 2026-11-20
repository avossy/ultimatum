import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/Header.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { api } from '../../api/index.js';
import { useFetch } from '../../hooks/useFetch.js';
import { formatDate } from '../../utils/format.js';
import './MyRequestsPage.css';

const ACTIVE_STATUSES = ['прийнято', 'діагностика', 'очікування запчастини', 'у ремонті', 'готово'];

export default function MyRequestsPage() {
  const [filter, setFilter] = useState('active');

  const { data: requests, loading, error } = useFetch(() => api.requests.list(), []);

  const visible = useMemo(() => {
    const list = requests ?? [];
    if (filter === 'all') return list;
    return list.filter((r) => ACTIVE_STATUSES.includes(r.status));
  }, [requests, filter]);

  return (
    <div>
      <Header />
      <main className="my-requests">
        <div className="my-requests__header">
          <div>
            <h1>Мої заявки</h1>
            <p>Відстежуйте статус своїх ремонтів в одному місці.</p>
          </div>
          <Link to="/booking" className="btn-filled">+ Нова заявка</Link>
        </div>

        <div className="my-requests__tabs">
          <button
            type="button"
            className={filter === 'active' ? 'tab-active' : ''}
            onClick={() => setFilter('active')}
          >
            Активні
          </button>
          <button
            type="button"
            className={filter === 'all' ? 'tab-active' : ''}
            onClick={() => setFilter('all')}
          >
            Усі
          </button>
        </div>

        <ul className="requests-list">
          {visible.map((r) => (
            <li key={r.id}>
              <Link to={`/client/requests/${r.id}`} className="request-row">
                <div className="request-row__main">
                  <span className="request-row__id">№{r.id}</span>
                  <span className="request-row__device">{r.device}</span>
                </div>
                <span className="request-row__date">{formatDate(r.date)}</span>
                <span className="request-row__cost">{r.cost ? `${r.cost} ₴` : '—'}</span>
                <StatusBadge status={r.status} />
              </Link>
            </li>
          ))}

          {loading && <li className="requests-empty">Завантаження...</li>}
          {error && <li className="requests-empty">{error}</li>}
          {!loading && !error && visible.length === 0 && (
            <li className="requests-empty">
              Немає активних заявок. <Link to="/booking">Записатися на ремонт</Link>
            </li>
          )}
        </ul>
      </main>
    </div>
  );
}

