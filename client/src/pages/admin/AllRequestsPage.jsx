import { useMemo, useState } from 'react';
import { useConfirm, useToast } from '../../components/Feedback.jsx';
import { Link } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { api } from '../../api/index.js';
import { useFetch } from '../../hooks/useFetch.js';
import { formatDate } from '../../utils/format.js';
import '../../styles/admin-table.css';
import './AllRequestsPage.css';

const STATUSES = ['прийнято', 'діагностика', 'очікування запчастини', 'у ремонті', 'готово', 'видано', 'скасовано'];

export default function AllRequestsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useFetch(() => api.requests.list(), []);
  const { data: mastersData } = useFetch(() => api.masters.listAll(), []);
  const requests = data ?? [];
  const masters = mastersData ?? [];
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [masterFilter, setMasterFilter] = useState('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter((r) => {
      const matchesQuery =
        !q || r.client.toLowerCase().includes(q) || r.device.toLowerCase().includes(q) || String(r.id).includes(q);
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchesMaster = masterFilter === 'all' || String(r.masterId) === masterFilter;
      return matchesQuery && matchesStatus && matchesMaster;
    });
  }, [requests, query, statusFilter, masterFilter]);

  const handleCancel = async (id) => {
    const ok = await confirm({
      title: `Скасувати заявку №${id}?`,
      message: 'Заявку буде закрито зі статусом «скасовано», далі її змінити не можна.',
      confirmLabel: 'Скасувати заявку',
      cancelLabel: 'Назад',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.requests.updateStatus(id, 'скасовано', 'Скасовано адміністратором');
      await reload();
      toast.success(`Заявку №${id} скасовано`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAssign = async (id, masterId) => {
    if (!masterId) return;
    try {
      await api.requests.update(id, { masterId: Number(masterId) });
      await reload();
      toast.success(`Майстра призначено для заявки №${id}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const activeMasters = masters.filter((m) => m.isActive);

  return (
    <div className="client-layout">
      <AdminSidebar />

      <main className="all-requests">
        <div className="all-requests__header">
          <div>
            <h1>Усі заявки</h1>
            <p>{filtered.length} із {requests.length} заявок</p>
          </div>
        </div>

        <div className="all-requests__filters">
          <input
            type="search"
            placeholder="Пошук за клієнтом, пристроєм або №..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Усі статуси</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select value={masterFilter} onChange={(e) => setMasterFilter(e.target.value)}>
            <option value="all">Усі майстри</option>
            {masters.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div className="all-requests__table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>№</th>
                <th>Клієнт</th>
                <th>Пристрій</th>
                <th>Майстер</th>
                <th>Статус</th>
                <th>Дата</th>
                <th>Вартість</th>
                <th aria-label="Дії" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to={`/admin/requests/${r.id}`} className="admin-table__link">№{r.id}</Link>
                  </td>
                  <td>{r.client}</td>
                  <td>{r.device}</td>
                  <td>
                    {r.master ? r.master : ['видано', 'скасовано'].includes(r.status) ? 'не призначено' : (
                      <select
                        className="all-requests__assign"
                        value=""
                        onChange={(e) => handleAssign(r.id, e.target.value)}
                        aria-label={`Призначити майстра для заявки №${r.id}`}
                      >
                        <option value="">Призначити майстра...</option>
                        {activeMasters.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>{formatDate(r.date)}</td>
                  <td>{r.cost ? `${r.cost} ₴` : '—'}</td>
                  <td>
                    {!['видано', 'скасовано'].includes(r.status) && (
                      <button type="button" className="all-requests__cancel" onClick={() => handleCancel(r.id)}>
                        Скасувати
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="all-requests__empty">
                    {loading ? 'Завантаження...' : error || 'Нічого не знайдено'}
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
