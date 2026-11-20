import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import MasterSidebar from '../../components/MasterSidebar.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import '../../styles/admin-table.css';
import { api } from '../../api/index.js';
import { useFetch } from '../../hooks/useFetch.js';
import { formatDate } from '../../utils/format.js';
import { ACTIVE_STATUSES } from './masterOrders.js';
import './MyOrdersPage.css';

export default function MyOrdersPage() {
  const [filter, setFilter] = useState('active');

  // Сервер повертає лише заявки, призначені на цього майстра
  const { data: orders, loading, error } = useFetch(() => api.requests.list(), []);

  const visible = useMemo(() => {
    const list = orders ?? [];
    if (filter === 'all') return list;
    return list.filter((o) => ACTIVE_STATUSES.includes(o.status));
  }, [orders, filter]);

  return (
    <div className="client-layout">
      <MasterSidebar />

      <main className="admin-dashboard">
        <div className="my-orders__header">
          <div>
            <h1>Мої замовлення</h1>
            <p>Заявки, призначені на вас.</p>
          </div>
        </div>

        <div className="my-orders__tabs">
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

        <div className="my-orders__table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>№</th>
                <th>Пристрій</th>
                <th>Клієнт</th>
                <th>Пріоритет</th>
                <th>Статус</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link to={`/master/orders/${o.id}`} className="admin-table__link">№{o.id}</Link>
                  </td>
                  <td>{o.device}</td>
                  <td>{o.client}</td>
                  <td>
                    <span className={`priority-badge priority-badge--${o.priority}`}>{o.priority}</span>
                  </td>
                  <td><StatusBadge status={o.status} /></td>
                  <td>{formatDate(o.date)}</td>
                </tr>
              ))}

              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="my-orders__empty">
                    {loading ? 'Завантаження...' : error || 'Немає активних замовлень'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
