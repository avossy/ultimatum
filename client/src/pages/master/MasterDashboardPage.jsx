import { Link } from 'react-router-dom';
import MasterSidebar from '../../components/MasterSidebar.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { api } from '../../api/index.js';
import { useFetch } from '../../hooks/useFetch.js';
import { formatDate } from '../../utils/format.js';
import '../../styles/admin-table.css';
import '../admin/DashboardPage.css';


export default function MasterDashboardPage() {
  // Сервер рахує статистику лише по заявках цього майстра
  const { data: stats } = useFetch(() => api.stats.byStatus(), []);
  const { data: recentData } = useFetch(() => api.requests.list({ limit: 5 }), []);

  const statusCards = (stats?.statuses ?? []).filter((s) => !['видано', 'скасовано'].includes(s.status));
  const recent = recentData ?? [];
  const avgRating = stats?.averageRating ?? '—';

  return (
    <div className="client-layout">
      <MasterSidebar />

      <main className="admin-dashboard">
        <div className="admin-dashboard__header">
          <h1>Дашборд</h1>
          <Link to="/master/orders" className="btn-filled">Мої замовлення</Link>
        </div>

        <div className="stat-cards">
          <div className="stat-card stat-card--highlight">
            <span className="stat-card__label">Активних замовлень</span>
            <span className="stat-card__value">{stats?.active ?? 0}</span>
          </div>
          <div className="stat-card">
            <span className="stat-card__label">Термінових</span>
            <span className="stat-card__value">{stats?.urgent ?? 0}</span>
          </div>
          <div className="stat-card">
            <span className="stat-card__label">Середня оцінка</span>
            <span className="stat-card__value">{avgRating}</span>
          </div>
          {statusCards.map((s) => (
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
            <h2>Останні замовлення</h2>
            <Link to="/master/orders">Переглянути всі</Link>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>№</th>
                <th>Пристрій</th>
                <th>Клієнт</th>
                <th>Статус</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link to={`/master/orders/${o.id}`} className="admin-table__link">№{o.id}</Link>
                  </td>
                  <td>{o.device}</td>
                  <td>{o.client}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td>{formatDate(o.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
