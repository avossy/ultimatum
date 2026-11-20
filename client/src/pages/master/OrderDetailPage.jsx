import { useEffect, useState } from 'react';
import { useConfirm, useToast } from '../../components/Feedback.jsx';
import { Link, useParams } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar.jsx';
import MasterSidebar from '../../components/MasterSidebar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import StatusBadge from '../../components/StatusBadge';
import StatusTimeline from '../../components/StatusTimeline';
import { api } from '../../api/index.js';
import { useFetch } from '../../hooks/useFetch.js';
import { formatDate, warrantyText } from '../../utils/format.js';
import './OrderDetailPage.css';

// Статуси йдуть у фіксованому порядку з довідника statuses
const STATUS_FLOW = ['прийнято', 'діагностика', 'очікування запчастини', 'у ремонті', 'готово', 'видано'];

// Значення відповідають CHECK-обмеженню repair_requests.priority у БД
const PRIORITY_OPTIONS = ['низький', 'звичайний', 'високий', 'терміновий'];

export default function OrderDetailPage() {
  const { id } = useParams();
  const { role } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const Sidebar = role === 'admin' ? AdminSidebar : MasterSidebar;
  const backTo = role === 'admin' ? '/admin/requests' : '/master/orders';
  const { data: order, loading, error, setData } = useFetch(() => api.requests.get(id), [id]);
  const { data: catalog } = useFetch(() => api.parts.list(), []);
  const { data: mastersData } = useFetch(
      () => (role === 'admin' ? api.masters.listAll() : Promise.resolve([])),
      [role]
  );
  const [masterDraft, setMasterDraft] = useState('');
  const [diagnosisDraft, setDiagnosisDraft] = useState('');
  const [workCostDraft, setWorkCostDraft] = useState('');
  const [plannedDraft, setPlannedDraft] = useState('');
  const [newPart, setNewPart] = useState({ partId: '', qty: 1 });

  // Чернетки полів синхронізуються з даними заявки після завантаження
  useEffect(() => {
    if (order) {
      setDiagnosisDraft(order.diagnosis ?? '');
      setWorkCostDraft(String(order.workCost ?? 0));
      setPlannedDraft(order.plannedCompletionDate ?? '');
      setMasterDraft(order.masterId ? String(order.masterId) : '');
    }
  }, [order?.id, order?.diagnosis, order?.workCost, order?.masterId, order?.plannedCompletionDate]);

  // Виконує запит, оновлює заявку з відповіді сервера, помилки показує повідомленням
  const run = async (action, successMessage) => {
    try {
      setData(await action());
      if (successMessage) toast.success(successMessage);
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading && !order) {
    return (
        <div className="client-layout">
          <Sidebar />
          <main className="admin-dashboard"><p>Завантаження...</p></main>
        </div>
    );
  }
  if (error || !order) {
    return (
        <div className="client-layout">
          <Sidebar />
          <main className="admin-dashboard">
            <Link to={backTo} className="order-back">← Назад до списку</Link>
            <p>{error || 'Заявку не знайдено'}</p>
          </main>
        </div>
    );
  }

  const isCompleted = ['видано', 'скасовано'].includes(order.status);
  const partsTotal = order.partsCost;
  const selectedPart = (catalog ?? []).find((p) => String(p.id) === String(newPart.partId));

  const handleStatusChange = (e) => run(() => api.requests.updateStatus(id, e.target.value), 'Статус оновлено');
  const handlePriorityChange = (e) => run(() => api.requests.update(id, { priority: e.target.value }), 'Пріоритет оновлено');
  const handleSaveDiagnosis = () => run(() => api.requests.update(id, { diagnosis: diagnosisDraft }), 'Діагноз збережено');
  const handleSavePlanned = () => run(
      () => api.requests.update(id, { plannedCompletionDate: plannedDraft || null }),
      plannedDraft ? 'Планову дату збережено' : 'Планову дату очищено'
  );
  const handleSaveWorkCost = () => run(() => api.requests.update(id, { workCost: Number(workCostDraft) }), 'Вартість робіт збережено');

  const handleAddPart = (e) => {
    e.preventDefault();
    if (!newPart.partId) return;
    run(async () => {
      const updated = await api.requests.addPart(id, Number(newPart.partId), Number(newPart.qty));
      setNewPart({ partId: '', qty: 1 });
      return updated;
    }, 'Запчастину додано');
  };

  const handleAssignMaster = () => run(() => api.requests.update(id, { masterId: Number(masterDraft) }), 'Майстра призначено');

  const handleCompleteRepair = async () => {
    const ok = await confirm({
      title: 'Завершити ремонт?',
      message: 'Пристрій буде видано клієнту, а заявку закрито — далі її змінити не можна.',
      confirmLabel: 'Завершити ремонт',
    });
    if (ok) run(() => api.requests.complete(id), 'Ремонт завершено, заявку закрито');
  };

  return (
      <div className="client-layout">
        <Sidebar />
        <main className="admin-dashboard">
          <div className="order-inner">
            <Link to={backTo} className="order-back">← Назад до списку</Link>

            <div className="order-card">
              {/* Шапка */}
              <div className="order-header">
                <div>
                  <h1>Заявка №{order.id}</h1>
                  <p className="order-device">{order.device}</p>
                </div>
                <div className="order-header__right">
                  <select
                      className={`priority-select priority-select--${order.priority}`}
                      value={order.priority}
                      onChange={handlePriorityChange}
                      disabled={isCompleted}
                      aria-label="Пріоритет заявки"
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <StatusBadge status={order.status} />
                </div>
              </div>

              <div className="order-meta">
                <div>
                  <span className="order-meta__label">Клієнт</span>
                  <span>{order.client}</span>
                </div>
                <div>
                  <span className="order-meta__label">Телефон</span>
                  <span>{order.clientPhone}</span>
                </div>
                <div>
                  <span className="order-meta__label">Дата подачі</span>
                  <span>{formatDate(order.date)}</span>
                </div>
                <div>
                  <span className="order-meta__label">Серійний номер</span>
                  <span>{order.serialNumber}</span>
                </div>
                <div>
                  <span className="order-meta__label">Майстер</span>
                  <span>{order.master ?? 'не призначено'}</span>
                </div>
                <div>
                  <span className="order-meta__label">Планова дата завершення</span>
                  <span>{formatDate(order.plannedCompletionDate)}</span>
                </div>
                <div>
                  <span className="order-meta__label">Гарантія</span>
                  <span>{warrantyText(order)}</span>
                </div>
              </div>

              <p className="order-problem"><strong>Проблема:</strong> {order.problem}</p>

              <div className="order-grid">
                {/* Ліва колонка: дії майстра */}
                <div className="order-col">
                  {role === 'admin' && (
                      <section className="order-section">
                        <h2>Майстер</h2>
                        <select value={masterDraft} onChange={(e) => setMasterDraft(e.target.value)} disabled={isCompleted}>
                          <option value="">{order.masterId ? 'Оберіть майстра...' : 'Не призначено — оберіть майстра...'}</option>
                          {(mastersData ?? [])
                              .filter((m) => m.isActive || String(m.id) === String(order.masterId))
                              .map((m) => (
                                  <option key={m.id} value={m.id}>{m.name}{m.specialization ? ` — ${m.specialization}` : ''}</option>
                              ))}
                        </select>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={handleAssignMaster}
                            disabled={isCompleted || !masterDraft || String(order.masterId ?? '') === masterDraft}
                        >
                          {order.masterId ? 'Змінити майстра' : 'Призначити майстра'}
                        </button>
                      </section>
                  )}

                  <section className="order-section">
                    <h2>Статус заявки</h2>
                    <select value={order.status} onChange={handleStatusChange} disabled={isCompleted}>
                      {(STATUS_FLOW.includes(order.status) ? STATUS_FLOW : [...STATUS_FLOW, order.status]).map((s) => (
                          <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </section>

                  <section className="order-section">
                    <h2>Діагноз</h2>
                    <textarea
                        rows={4}
                        value={diagnosisDraft}
                        onChange={(e) => setDiagnosisDraft(e.target.value)}
                        placeholder="Опишіть результат діагностики..."
                        disabled={isCompleted}
                    />
                    <button type="button" className="btn-secondary" onClick={handleSaveDiagnosis} disabled={isCompleted}>
                      Зберегти діагноз
                    </button>
                  </section>

                  <section className="order-section">
                    <h2>Планова дата завершення</h2>
                    <input
                        type="date"
                        min={order.date}
                        value={plannedDraft}
                        onChange={(e) => setPlannedDraft(e.target.value)}
                        disabled={isCompleted}
                    />
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleSavePlanned}
                        disabled={isCompleted || plannedDraft === (order.plannedCompletionDate ?? '')}
                    >
                      Зберегти дату
                    </button>
                  </section>

                  <section className="order-section">
                    <h2>Вартість робіт, ₴</h2>
                    <input
                        type="number"
                        min="0"
                        value={workCostDraft}
                        onChange={(e) => setWorkCostDraft(e.target.value)}
                        disabled={isCompleted}
                    />
                    <button type="button" className="btn-secondary" onClick={handleSaveWorkCost} disabled={isCompleted}>
                      Зберегти вартість
                    </button>
                  </section>

                  <section className="order-section">
                    <h2>Запчастини</h2>
                    <ul className="parts-list">
                      {order.parts.map((p) => (
                          <li key={p.partId}>
                            <span>{p.name} × {p.qty}</span>
                            <span>{p.qty * p.price} ₴</span>
                          </li>
                      ))}
                    </ul>
                    <div className="parts-total">
                      <span>Разом за запчастини</span>
                      <strong>{partsTotal} ₴</strong>
                    </div>

                    {!isCompleted && (
                        <form className="parts-form" onSubmit={handleAddPart}>
                          <select
                              value={newPart.partId}
                              onChange={(e) => setNewPart((p) => ({ ...p, partId: e.target.value }))}
                          >
                            <option value="">Запчастина зі складу...</option>
                            {(catalog ?? []).map((p) => (
                                <option key={p.id} value={p.id} disabled={p.stockQuantity === 0}>
                                  {p.name} (залишок {p.stockQuantity})
                                </option>
                            ))}
                          </select>
                          <input
                              type="number"
                              min="1"
                              max={selectedPart?.stockQuantity}
                              placeholder="К-сть"
                              value={newPart.qty}
                              onChange={(e) => setNewPart((p) => ({ ...p, qty: e.target.value }))}
                          />
                          <input
                              placeholder="Ціна, ₴"
                              value={selectedPart ? selectedPart.unitPrice : ''}
                              readOnly
                          />
                          <button type="submit" className="btn-secondary">Додати</button>
                        </form>
                    )}
                  </section>

                  {!isCompleted && (
                      <button type="button" className="btn-primary" onClick={handleCompleteRepair}>
                        Завершити ремонт
                      </button>
                  )}
                </div>

                {/* Права колонка: вартість + хронологія */}
                <div className="order-col">
                  <section className="order-section order-cost">
                    <span className="order-meta__label">{isCompleted ? 'Фінальна вартість' : 'Орієнтовна вартість'}</span>
                    <div className="order-cost__value">{order.cost} ₴</div>
                    <p className="order-cost__note">Деталі + вартість робіт, фінальна сума може змінитися</p>
                  </section>

                  <section className="order-section">
                    <h2>Історія оновлень</h2>
                    <StatusTimeline
                        steps={order.history.map((h) => ({
                          status: h.status,
                          date: formatDate(h.date),
                          comment: h.comment,
                          author: h.author,
                        }))}
                        currentIndex={order.history.length - 1}
                    />
                  </section>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
  );
}
