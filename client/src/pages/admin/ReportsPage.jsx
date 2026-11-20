import { useState } from 'react';
import AdminSidebar from '../../components/AdminSidebar.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import HBarChart from '../../components/charts/HBarChart.jsx';
import ColumnChart from '../../components/charts/ColumnChart.jsx';
import { api } from '../../api/index.js';
import { useFetch } from '../../hooks/useFetch.js';
import { formatMoney, todayISO } from '../../utils/format.js';
import '../../styles/admin-table.css';
import './DashboardPage.css';
import './ReportsPage.css';

const TABS = [
  { id: 'requests', label: 'Заявки' },
  { id: 'masters', label: 'Майстри' },
  { id: 'finance', label: 'Фінанси' },
  { id: 'parts', label: 'Запчастини' },
];

const monthLabel = (ym) => ym.split('-').reverse().join('.');
const num = (v) => (v === null || v === undefined ? '—' : v);

// Експорт поточної таблиці у CSV (BOM, щоб Excel коректно відкрив кирилицю)
function downloadCsv(filename, header, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map((r) => r.map(esc).join(';')).join('\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function shiftDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('sv-SE');
}

export default function ReportsPage() {
  const today = todayISO();
  const [tab, setTab] = useState('requests');
  const [from, setFrom] = useState(`${today.slice(0, 4)}-01-01`);
  const [to, setTo] = useState(today);

  const periodValid = Boolean(from && to && to >= from);
  // Результат зберігається разом із вкладкою, якій належить: після перемикання вкладки
  // не можна показати дані попередньої (в іншому форматі), поки не прийде нова відповідь
  const { data: result, loading, error } = useFetch(
    async () => (periodValid ? { tab, payload: await api.reports[tab]({ from, to }) } : null),
    [tab, from, to]
  );
  const data = result?.tab === tab ? result.payload : null;

  const presets = [
    { label: '30 днів', from: shiftDays(-30), to: today },
    { label: 'Цей місяць', from: `${today.slice(0, 7)}-01`, to: today },
    { label: 'Цей рік', from: `${today.slice(0, 4)}-01-01`, to: today },
    { label: 'Увесь час', from: '2000-01-01', to: today },
  ];

  return (
    <div className="client-layout">
      <AdminSidebar />

      <main className="admin-dashboard">
        <div className="admin-dashboard__header">
          <h1>Звіти</h1>
        </div>

        <div className="reports__toolbar">
          <div className="reports__tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={tab === t.id ? 'reports__tab--active' : ''}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="reports__period">
          <label>
            З
            <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            По
            <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </label>
          <div className="reports__presets">
            {presets.map((p) => (
              <button key={p.label} type="button" onClick={() => { setFrom(p.from); setTo(p.to); }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {!periodValid && <p className="reports__message">Оберіть коректний період: дата «По» не може бути раніше за «З».</p>}
        {periodValid && error && <p className="reports__message">{error}</p>}
        {periodValid && loading && !data && <p className="reports__message">Завантаження...</p>}

        {periodValid && data && !error && (
          <>
            {tab === 'requests' && <RequestsReport data={data} />}
            {tab === 'masters' && <MastersReport rows={data} />}
            {tab === 'finance' && <FinanceReport rows={data} />}
            {tab === 'parts' && <PartsReport rows={data} />}
          </>
        )}
      </main>
    </div>
  );
}

function RequestsReport({ data }) {
  const total = data.total || 0;
  return (
    <>
      <div className="stat-cards">
        <div className="stat-card stat-card--highlight">
          <span className="stat-card__label">Заявок за період</span>
          <span className="stat-card__value">{total}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Виручка (видані)</span>
          <span className="stat-card__value">{formatMoney(data.revenue)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Сер. днів до видачі</span>
          <span className="stat-card__value">{num(data.avgDaysToComplete)}</span>
        </div>
      </div>

      <section className="reports__panel">
        <h2>Розподіл заявок за статусами</h2>
        <HBarChart items={data.byStatus.map((s) => ({ label: s.status, value: s.count }))} />
      </section>

      <section className="reports__panel">
        <div className="reports__panel-head">
          <h2>Таблиця</h2>
          <button type="button" className="btn-outline" onClick={() =>
            downloadCsv('zvit-zayavky.csv', ['Статус', 'Кількість', 'Частка, %'],
              data.byStatus.map((s) => [s.status, s.count, total ? Math.round((s.count / total) * 100) : 0]))}>
            Експорт CSV
          </button>
        </div>
        <table className="admin-table">
          <thead>
            <tr><th>Статус</th><th className="reports__num">Кількість</th><th className="reports__num">Частка</th></tr>
          </thead>
          <tbody>
            {data.byStatus.map((s) => (
              <tr key={s.status}>
                <td><StatusBadge status={s.status} /></td>
                <td className="reports__num">{s.count}</td>
                <td className="reports__num">{total ? `${Math.round((s.count / total) * 100)}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function MastersReport({ rows }) {
  return (
    <>
      <section className="reports__panel">
        <h2>Виконано заявок</h2>
        <HBarChart items={rows.map((m) => ({ label: m.name, value: m.completed }))} />
      </section>

      <section className="reports__panel">
        <h2>Виручка по майстрах</h2>
        <HBarChart items={rows.map((m) => ({ label: m.name, value: m.revenue }))} format={formatMoney} />
      </section>

      <section className="reports__panel">
        <div className="reports__panel-head">
          <h2>Таблиця</h2>
          <button type="button" className="btn-outline" onClick={() =>
            downloadCsv('zvit-mastery.csv',
              ['Майстер', 'Усього', 'Виконано', 'Активні', 'Сер. днів', 'Виручка', 'Рейтинг'],
              rows.map((m) => [m.name, m.requestsTotal, m.completed, m.active, m.avgDaysToComplete, m.revenue, m.averageRating]))}>
            Експорт CSV
          </button>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Майстер</th><th className="reports__num">Усього</th><th className="reports__num">Виконано</th>
              <th className="reports__num">Активні</th><th className="reports__num">Сер. днів</th>
              <th className="reports__num">Виручка</th><th className="reports__num">Рейтинг</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td className="reports__num">{m.requestsTotal}</td>
                <td className="reports__num">{m.completed}</td>
                <td className="reports__num">{m.active}</td>
                <td className="reports__num">{num(m.avgDaysToComplete)}</td>
                <td className="reports__num">{formatMoney(m.revenue)}</td>
                <td className="reports__num">{m.averageRating ? `★ ${m.averageRating}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function FinanceReport({ rows }) {
  const sum = (key) => rows.reduce((acc, r) => acc + r[key], 0);
  return (
    <>
      <div className="stat-cards">
        <div className="stat-card stat-card--highlight">
          <span className="stat-card__label">Загальна виручка</span>
          <span className="stat-card__value">{formatMoney(sum('total'))}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Роботи</span>
          <span className="stat-card__value">{formatMoney(sum('works'))}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Запчастини</span>
          <span className="stat-card__value">{formatMoney(sum('parts'))}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Виданих заявок</span>
          <span className="stat-card__value">{sum('requests')}</span>
        </div>
      </div>

      <section className="reports__panel">
        <h2>Виручка по місяцях, ₴</h2>
        <ColumnChart
          data={rows.map((r) => ({ label: monthLabel(r.month), values: [r.works, r.parts] }))}
          series={[{ name: 'Роботи' }, { name: 'Запчастини' }]}
          format={(v) => Number(v).toLocaleString('uk-UA')}
        />
      </section>

      <section className="reports__panel">
        <div className="reports__panel-head">
          <h2>Таблиця</h2>
          <button type="button" className="btn-outline" onClick={() =>
            downloadCsv('zvit-finansy.csv', ['Місяць', 'Заявок', 'Роботи', 'Запчастини', 'Разом'],
              rows.map((r) => [monthLabel(r.month), r.requests, r.works, r.parts, r.total]))}>
            Експорт CSV
          </button>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Місяць</th><th className="reports__num">Заявок</th><th className="reports__num">Роботи</th>
              <th className="reports__num">Запчастини</th><th className="reports__num">Разом</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.month}>
                <td>{monthLabel(r.month)}</td>
                <td className="reports__num">{r.requests}</td>
                <td className="reports__num">{formatMoney(r.works)}</td>
                <td className="reports__num">{formatMoney(r.parts)}</td>
                <td className="reports__num">{formatMoney(r.total)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="reports__message">Немає виданих заявок за обраний період</td></tr>
            )}
            {rows.length > 0 && (
              <tr className="reports__total-row">
                <td>Разом</td>
                <td className="reports__num">{sum('requests')}</td>
                <td className="reports__num">{formatMoney(sum('works'))}</td>
                <td className="reports__num">{formatMoney(sum('parts'))}</td>
                <td className="reports__num">{formatMoney(sum('total'))}</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}

function PartsReport({ rows }) {
  const used = rows.filter((p) => p.usedQuantity > 0).slice(0, 8);
  const low = rows.filter((p) => p.lowStock).length;
  return (
    <>
      <div className="stat-cards">
        <div className="stat-card stat-card--highlight">
          <span className="stat-card__label">Використано одиниць</span>
          <span className="stat-card__value">{rows.reduce((a, p) => a + p.usedQuantity, 0)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">На суму</span>
          <span className="stat-card__value">{formatMoney(rows.reduce((a, p) => a + p.usedAmount, 0))}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Закінчуються на складі</span>
          <span className="stat-card__value">{low}</span>
        </div>
      </div>

      <section className="reports__panel">
        <h2>Найчастіше використовувані запчастини</h2>
        <HBarChart items={used.map((p) => ({ label: p.name, value: p.usedQuantity }))} format={(v) => `${v} шт.`} />
      </section>

      <section className="reports__panel">
        <div className="reports__panel-head">
          <h2>Таблиця</h2>
          <button type="button" className="btn-outline" onClick={() =>
            downloadCsv('zvit-zapchastyny.csv', ['Назва', 'Артикул', 'Використано', 'Сума', 'Залишок', 'Закінчується'],
              rows.map((p) => [p.name, p.partNumber, p.usedQuantity, p.usedAmount, p.stockQuantity, p.lowStock ? 'так' : 'ні']))}>
            Експорт CSV
          </button>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Назва</th><th>Артикул</th><th className="reports__num">Використано</th>
              <th className="reports__num">Сума</th><th className="reports__num">Залишок</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.partNumber}</td>
                <td className="reports__num">{p.usedQuantity}</td>
                <td className="reports__num">{formatMoney(p.usedAmount)}</td>
                <td className="reports__num">{p.lowStock ? `${p.stockQuantity} ⚠` : p.stockQuantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
