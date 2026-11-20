import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/index.js';
import './AuthPage.css';

const REDIRECT_BY_ROLE = {
  client: '/client/requests',
  master: '/master/dashboard',
  admin: '/admin/dashboard',
};

// Лишає лише цифри, +, пробіли, дужки та дефіси — літери відсікаються одразу при введенні
const sanitizePhone = (value) => value.replace(/[^\d+\s()-]/g, '');

// 10 цифр (0XXXXXXXXX) або 12 (380XXXXXXXXX); "+" лише на початку
const isValidPhone = (value) => {
  const digits = value.replace(/\D/g, '');

  return (
      /^\+?[\d\s()-]+$/.test(value) &&
      !value.slice(1).includes('+') &&
      (digits.length === 10 || digits.length === 12)
  );
};

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [tab, setTab] = useState(searchParams.get('tab') === 'register' ? 'register' : 'login');

  useEffect(() => {
    setTab(searchParams.get('tab') === 'register' ? 'register' : 'login');
  }, [searchParams]);
  const [form, setForm] = useState({
    login: '',
    password: '',
    remember: false,
    name: '',
    phone: '',
    email: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (tab === 'register' && !isValidPhone(form.phone)) {
      setError(
          'Введіть коректний номер телефону, наприклад +380 50 123 45 67'
      );
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const result =
          tab === 'login'
              ? await api.login(form.login, form.password)
              : await api.register({
                login: form.login,
                password: form.password,
                name: form.name,
                phone: form.phone,
                email: form.email,
              });

      login(result);
      navigate(REDIRECT_BY_ROLE[result.user.role]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Ліва панель */}
        <div className="auth-side">
          <div className="auth-brand">
            <div>
              <img className="auth-brand__logo" src="/assets/ultimatum_logo.svg"></img>
              <div className="auth-brand__tagline">Сервісний центр електроніки</div>
            </div>
          </div>


          <div className="auth-side__content">
            <h1>Твоя техніка у надійних руках</h1>
            <p>
              Відстежуйте статус ремонту, записуйтесь на діагностику й отримуйте
              оновлення в одному місці.
            </p>
            <img className="auth-side__illustration" src="/assets/login-device.gif"/>
          </div>

          <div className="auth-side__footer">© 2026 Сервісний центр Ультиматум</div>
        </div>

        {/* Права панель */}
        <div className="auth-form-side">
          <div className="auth-form-wrap">
            <h2>Ласкаво просимо</h2>
            <p className="auth-subtitle">Увійдіть у свій акаунт або створіть новий</p>

            <div className="auth-tabs" role="tablist" aria-label="Форма входу або реєстрації">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'login'}
                className={`auth-tab ${tab === 'login' ? 'auth-tab--active' : ''}`}
                onClick={() => setTab('login')}
              >
                Вхід
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'register'}
                className={`auth-tab ${tab === 'register' ? 'auth-tab--active' : ''}`}
                onClick={() => setTab('register')}
              >
                Реєстрація
              </button>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              {tab === 'register' && (
                <>
                  <Field label="Ім'я" id="name" name="name" value={form.name} onChange={handleChange} placeholder="Ярослава Семенова" />
                  <div className="auth-field"> <label htmlFor="phone">Телефон</label> <input id="phone" name="phone" type="tel" inputMode="tel" placeholder="+380 50 123 45 67" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: sanitizePhone(e.target.value), })) } required /> </div>
                  <Field label="Email" id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="semenovaya@email.com" />
                </>
              )}

              <Field
                label="Логін"
                id="login"
                name="login"
                value={form.login}
                onChange={handleChange}
                placeholder="semenovaya"
              />
              <Field
                label="Пароль"
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
              />

              {tab === 'login' && (
                <div className="auth-row">
                  <label className="auth-checkbox">
                    <input
                      type="checkbox"
                      name="remember"
                      checked={form.remember}
                      onChange={handleChange}
                    />
                    Запам&apos;ятати мене
                  </label>
                </div>
              )}

              {error && <p className="auth-error">{error}</p>}

              <button type="submit" className="auth-submit" disabled={submitting}>
                {tab === 'login' ? 'Увійти' : 'Зареєструватися'}
              </button>
            </form>

            {tab === 'login' && (
              <div className="auth-test-accounts">
                <p>Тестові акаунти (створює seed сервера):</p>
                <ul>
                  <li><strong>Клієнт:</strong> client1 / client123</li>
                  <li><strong>Майстер:</strong> master1 / master123</li>
                  <li><strong>Адмін:</strong> admin / admin123</li>
                </ul>
              </div>
            )}

            <p className="auth-switch">
              {tab === 'login' ? (
                <>Ще немає акаунту?{' '}
                  <button type="button" className="auth-link-btn" onClick={() => setTab('register')}>
                    Зареєструватися
                  </button>
                </>
              ) : (
                <>Вже є акаунт?{' '}
                  <button type="button" className="auth-link-btn" onClick={() => setTab('login')}>
                    Увійти
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, id, name, value, onChange, placeholder, type = 'text' }) {
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required
      />
    </div>
  );
}
