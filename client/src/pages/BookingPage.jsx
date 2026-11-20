import { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import { api } from '../api/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import './BookingPage.css';

const STEPS = ['Пристрій', 'Проблема', 'Час', 'Підтвердження'];

const DEVICE_TYPES = [
  { id: 'laptop', label: 'Ноутбук', icon: '/assets/laptop.png' },
  { id: 'phone', label: 'Смартфон', icon: '/assets/phone.png'},
  { id: 'tablet', label: 'Планшет', icon: '/assets/tablet.png' },
  { id: 'desktop', label: "Комп'ютер", icon: '/assets/computer.png' },
  { id: 'console', label: 'Ігрова консоль', icon: '/assets/console.png' },
  { id: 'other', label: 'Інша техніка', icon: '/assets/station.png' },
];

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];

// Локальна дата у форматі YYYY-MM-DD (toISOString дав би дату за UTC)
function getTodayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Чи вже минув слот (HH:MM) сьогодні
function isSlotPast(time) {
  const [h, m] = time.split(':').map(Number);
  const now = new Date();
  return h * 60 + m <= now.getHours() * 60 + now.getMinutes();
}

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const masterId = searchParams.get('master');
  const { user } = useAuth();
  const { data: masters } = useFetch(() => api.masters.list(), []);
  const masterName = masterId ? (masters ?? []).find((m) => String(m.id) === masterId)?.name ?? null : null;

  // Власні пристрої клієнта — щоб не вводити їх щоразу (серійний номер унікальний)
  const { data: myDevices } = useFetch(
    () => (user?.role === 'client' ? api.devices.list() : Promise.resolve([])),
    [user?.role]
  );

  const today = getTodayISO();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    deviceType: null,
    deviceId: '',
    brand: '',
    model: '',
    serialNumber: '',
    problem: '',
    date: today,
    time: null,
  });
  const [submitted, setSubmitted] = useState(null); // створена заявка
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canGoNext = useMemo(() => {
    if (step === 0) {
      return Boolean(form.deviceId) ||
        Boolean(form.deviceType && form.brand.trim() && form.model.trim() && form.serialNumber.trim());
    }
    if (step === 1) return form.problem.trim().length > 0;
    if (step === 2) return Boolean(form.date) && form.date >= today && Boolean(form.time);
    return true;
  }, [step, form]);

  // Минулі слоти сьогоднішнього дня недоступні
  const availableSlots = form.date === today ? TIME_SLOTS.filter((t) => !isSlotPast(t)) : TIME_SLOTS;

  const handleDateChange = (value) => {
    // Дату в минулому обрати не можна (min у календарі + перевірка на випадок ручного вводу)
    if (value && value < today) {
      setForm((f) => ({ ...f, date: today, time: null }));
      return;
    }
    setForm((f) => ({ ...f, date: value, time: null }));
  };

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleConfirm = async () => {
    if (form.date < today) return; // захист: минулу дату відправити не можна
    setSubmitError('');
    setSubmitting(true);
    try {
      const typeLabel = DEVICE_TYPES.find((d) => d.id === form.deviceType)?.label;
      const created = await api.requests.create({
        ...(form.deviceId
          ? { deviceId: Number(form.deviceId) }
          : { device: { type: typeLabel, brand: form.brand, model: form.model, serialNumber: form.serialNumber } }),
        problem: form.problem,
        date: form.date,
        time: form.time,
        masterId: masterId ? Number(masterId) : undefined,
      });
      setSubmitted(created);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const chosenDevice = (myDevices ?? []).find((d) => String(d.id) === String(form.deviceId));
  const deviceSummary = chosenDevice
    ? `${chosenDevice.brand} ${chosenDevice.model}`
    : `${DEVICE_TYPES.find((d) => d.id === form.deviceType)?.label ?? ''} ${form.brand} ${form.model}`.trim();

  if (submitted) {
    return (
      <div className="booking-page">
        <Header />
        <div className="booking-container booking-success">
          <h1>Заявку №{submitted.id} прийнято!</h1>
          <p>
            Ми підтвердимо запис найближчим часом. Статус можна відстежити у розділі
            «Мої заявки».
          </p>
          <Link to="/client/requests" className="btn-filled btn-lg">Мої заявки</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-page">
      <Header />

      <div className="booking-container">
      <div className="booking-inner">
        <Link to="/" className="booking-back">← Назад</Link>
        <h1>Запис на ремонт</h1>
        <p className="booking-subtitle">
          Оберіть пристрій, опишіть проблему та зручний час — ми подбаємо про решту.
        </p>

        {masterName && (
          <div className="booking-master-tag">Майстер: {masterName}</div>
        )}

        <ol className="booking-steps">
          {STEPS.map((label, i) => (
            <li
              key={label}
              className={`booking-step ${i === step ? 'booking-step--current' : ''} ${
                i < step ? 'booking-step--done' : ''
              }`}
            >
              <span className="booking-step__num">{i + 1}</span>
              <span>{label}</span>
            </li>
          ))}
        </ol>

        <div className="booking-panel">
          {step === 0 && (
            <>
            {(myDevices ?? []).length > 0 && (
              <div className="booking-device-fields">
                <select
                  value={form.deviceId}
                  onChange={(e) => setForm((f) => ({ ...f, deviceId: e.target.value }))}
                  aria-label="Ваш пристрій"
                >
                  <option value="">Новий пристрій</option>
                  {myDevices.map((d) => (
                    <option key={d.id} value={d.id}>{d.brand} {d.model} ({d.serialNumber})</option>
                  ))}
                </select>
              </div>
            )}
            {!form.deviceId && (
            <>
            <div className="booking-devices">
              {DEVICE_TYPES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`device-tile ${form.deviceType === d.id ? 'device-tile--active' : ''}`}
                  onClick={() => setForm((f) => ({ ...f, deviceType: d.id }))}                >
                  {d.label}
                  <img src={d.icon}></img>
                </button>
              ))}
            </div>
            <div className="booking-device-fields">
              <input placeholder="Бренд" value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
              <input placeholder="Модель" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} />
              <input placeholder="Серійний номер" value={form.serialNumber} onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))} />
            </div>
            </>
            )}
            </>
          )}

          {step === 1 && (
            <div className="booking-problem">
              <textarea
                rows={6}
                maxLength={500}
                value={form.problem}
                onChange={(e) => setForm((f) => ({ ...f, problem: e.target.value }))}
                placeholder="Наприклад: не вмикається, перегрівається, пошкоджений екран..."
              />
              <div className="booking-problem__count">{form.problem.length}/500</div>
              <p className="booking-hint">Чим детальніше опис — тим швидше ми зможемо допомогти!</p>
            </div>
          )}

          {step === 2 && (
            <div className="booking-time">
              <label className="booking-date-label">
                Дата
                <input
                  type="date"
                  value={form.date}
                  min={today}
                  onChange={(e) => handleDateChange(e.target.value)}
                />
              </label>
              <div className="booking-slots">
                {availableSlots.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`time-slot ${form.time === t ? 'time-slot--active' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, time: t }))}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {availableSlots.length === 0 && (
                <p className="booking-hint">На сьогодні вільних годин уже немає — оберіть іншу дату.</p>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="booking-summary">
              <SummaryRow label="Пристрій" value={deviceSummary} />
              <SummaryRow label="Проблема" value={form.problem} />
              <SummaryRow label="Дата і час" value={`${form.date}, ${form.time}`} />
              {masterName && <SummaryRow label="Майстер" value={masterName} />}
            </div>
          )}
        </div>

        <div className="booking-footer">
          <p>
            Потрібна допомога? <a href="#contact">Зв&apos;язатися з нами</a>
          </p>

          <div className="booking-nav">
            {step > 0 && (
              <button type="button" className="btn-outline" onClick={goBack}>
                Назад
              </button>
            )}
            {submitError && <p className="booking-hint">{submitError}</p>}
            {step === STEPS.length - 1 && user?.role !== 'client' && (
              <p className="booking-hint">
                Щоб записатися, <Link to="/auth">увійдіть як клієнт</Link>.
              </p>
            )}
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn-filled" disabled={!canGoNext} onClick={goNext}>
                Далі
              </button>
            ) : (
              <button type="button" className="btn-filled" onClick={handleConfirm} disabled={submitting || user?.role !== 'client'}>
                Підтвердити запис
              </button>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="summary-row">
      <span className="summary-row__label">{label}</span>
      <span>{value}</span>
    </div>
  );
}
