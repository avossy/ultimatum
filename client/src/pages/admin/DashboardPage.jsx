import { Link } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { api } from '../../api/index.js';
import { useFetch } from '../../hooks/useFetch.js';
import { formatDate } from '../../utils/format.js';
import '../../styles/admin-table.css';
import './DashboardPage.css';

export default function DashboardPage() {
  const { data: stats } = useFetch(() => api.stats.byStatus(), []);
  const { data: recentData } = useFetch(() => api.requests.list({ limit: 5 }), []);
  const STATUS_COUNTS = stats?.statuses ?? [];
  const RECENT_REQUESTS = recentData ?? [];
  const totalActive = stats?.active ?? 0;

  return (
    <div className="client-layout">
      <AdminSidebar />

      <main className="admin-dashboard">
        <div className="admin-dashboard__header">
          <h1>Дашборд</h1>
          <Link to="/admin/requests" className="btn-filled">Усі заявки</Link>
        </div>

        <div className="stat-cards">
          <div className="stat-card stat-card--highlight">
            <span className="stat-card__label">Активних заявок</span>
            <span className="stat-card__value">{totalActive}</span>
          </div>
          {STATUS_COUNTS.map((s) => (
            <div key={s.status} className="stat-card">
              <span className="stat-card__label">
                <StatusBadge status={s.status} />
              </span>
              <span className="stat-card__value">{s.count}</span>
            </div>
          ))}
        </div>

        <section className="recent-requests">
          <div className="recent-requests__header">
            <h2>Останні заявки</h2>
            <Link to="/admin/requests">Переглянути всі</Link>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>№</th>
                <th>Клієнт</th>
                <th>Пристрій</th>
                <th>Статус</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_REQUESTS.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to={`/admin/requests/${r.id}`} className="admin-table__link">
                      №{r.id}
                    </Link>
                  </td>
                  <td>{r.client}</td>
                  <td>{r.device}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>{formatDate(r.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
