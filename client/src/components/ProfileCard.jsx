import { useState } from 'react';
import { api } from '../api/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { useToast } from './Feedback.jsx';
import '../pages/client/ProfilePage.css';

const FIELD_LABELS = { name: "Ім'я", email: 'Email', phone: 'Телефон' };

/**
 * Спільний блок профілю (заголовок + картка з контактами та формою редагування).
 * Дані завантажуються з GET /profile, зберігаються через PATCH /profile.
 *
 * props:
 *  roleLabel — підпис ролі ('Користувач' | 'Майстер' | 'Адміністратор')
 *  fields    — які поля можна редагувати: ['name', 'email', 'phone'] (у БД у майстра немає email)
 *  editable  — false, якщо профіль цієї ролі в БД не зберігається (адмін)
 */
export default function ProfileCard({
  roleLabel,
  title = 'Мій профіль',
  fields = ['name', 'email', 'phone'],
  editable = true,
}) {
  const { updateUser } = useAuth();
  const toast = useToast();
  const { data: profile, loading, error, setData } = useFetch(() => api.getProfile(), []);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saveError, setSaveError] = useState('');

  const startEditing = () => {
    setDraft({ name: profile.name ?? '', email: profile.email ?? '', phone: profile.phone ?? '' });
    setSaveError('');
    setEditing(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError('');
    try {
      const saved = await api.updateProfile(draft);
      setData(saved);
      updateUser({ name: saved.name });
      setEditing(false);
      toast.success('Профіль збережено');
    } catch (err) {
      setSaveError(err.message);
      toast.error(err.message);
    }
  };

  if (loading) return <p>Завантаження...</p>;
  if (error || !profile) return <p>{error || 'Не вдалося завантажити профіль'}</p>;

  return (
    <>
      <div className="profile-header">
        <h1>{title}</h1>
        {!editing && editable && (
          <button type="button" className="btn-outline" onClick={startEditing}>
            Редагувати профіль
          </button>
        )}
      </div>

      <section className="profile-card">
        <div className="profile-identity">
          <div className="profile-avatar" aria-hidden="true">
            {profile.name.split(' ').map((p) => p[0]).join('').toUpperCase()}
          </div>
          <div>
            <h2>{profile.name}</h2>
            {profile.email && <p>{profile.email}</p>}
            <span className="profile-role-tag">{roleLabel}</span>
          </div>
        </div>

        {editing ? (
          <form className="profile-form" onSubmit={handleSave}>
            {fields.map((key) => (
              <div className="profile-field" key={key}>
                <label htmlFor={key}>{FIELD_LABELS[key]}</label>
                <input
                  id={key}
                  type={key === 'email' ? 'email' : 'text'}
                  value={draft[key]}
                  onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                  required={key !== 'email'}
                />
              </div>
            ))}
            {saveError && <p className="auth-error">{saveError}</p>}
            <div className="profile-form__actions">
              <button type="button" className="btn-outline" onClick={() => setEditing(false)}>Скасувати</button>
              <button type="submit" className="btn-filled">Зберегти</button>
            </div>
          </form>
        ) : (
          (profile.phone || profile.email) && (
            <div className="profile-contacts">
              <h3>Мої контакти</h3>
              {profile.phone && <p>{profile.phone}</p>}
              {profile.email && <p>{profile.email}</p>}
            </div>
          )
        )}
      </section>
    </>
  );
}
