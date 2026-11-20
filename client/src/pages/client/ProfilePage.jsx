import { Link } from 'react-router-dom';
import Header from '../../components/Header.jsx';
import ProfileCard from '../../components/ProfileCard.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { api } from '../../api/index.js';
import { useFetch } from '../../hooks/useFetch.js';
import { formatDate } from '../../utils/format.js';
import './ProfilePage.css';

export default function ProfilePage() {
  const { data: recent } = useFetch(() => api.requests.list({ limit: 3 }), []);

  return (
    <div>
      <Header />
      <main className="profile-page">
        <ProfileCard roleLabel="Користувач" />

        <section className="recent-card">
          <div className="recent-card__header">
            <h3>Останні записи</h3>
            <Link to="/client/requests">Переглянути всі</Link>
          </div>
          <ul className="recent-list">
            {(recent ?? []).map((r) => (
              <li key={r.id}>
                <Link to={`/client/requests/${r.id}`} className="recent-row">
                  <span className="recent-row__device">{r.device}</span>
                  <StatusBadge status={r.status} />
                  <span className="recent-row__date">{formatDate(r.date)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
