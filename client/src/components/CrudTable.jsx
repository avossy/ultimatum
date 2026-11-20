import { useEffect, useMemo, useState } from 'react';
import { useConfirm, useToast } from './Feedback.jsx';
import './CrudTable.css';

/**
 * Універсальний шаблон «таблиця зі списком і фільтрами» для адмінських CRUD-сторінок
 * (клієнти, майстри, запчастини, пристрої — будь-яка сутність з однаковими полями).
 *
 * props:
 *  title       — заголовок сторінки, напр. "Клієнти"
 *  columns     — [{ key, label }] — колонки таблиці
 *  fields      — [{ key, label, type, required, options, min, max }] — поля форми додавання/редагування
 *                type: text|number|email|tel|date|password|select
 *                required: true (за замовчуванням) | false | 'add' (обов'язкове лише при додаванні)
 *                options: [string | { value, label }] — варіанти для type: 'select'
 *                show: (draft) => boolean — показувати поле лише за умови (напр. залежно від ролі)
 *                min/max: значення або (draft) => значення — напр. «дата по» не раніше «дати з»
 *  rows        — масив записів (мають містити id)
 *  searchKeys  — за якими полями шукати (масив ключів)
 *  onAdd(data) / onEdit(id, data) / onDelete(id) — колбеки, що міняють дані на стороні сторінки
 *  renderCell(row, columnKey) — опційно, кастомний рендер клітинки (напр. бейдж)
 */
const resolve = (value, draft) => (typeof value === 'function' ? value(draft) : value);
const isRequired = (field, mode) =>
  field.required === 'add' ? mode === 'add' : field.required !== false;

export default function CrudTable({
  title,
  columns,
  fields,
  rows,
  searchKeys = [],
  onAdd,
  onEdit,
  onDelete,
  renderCell,
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null); // null | { mode: 'add' | 'edit', draft }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(q)));
  }, [rows, query, searchKeys]);

  const openAdd = () => {
    const empty = Object.fromEntries(fields.map((f) => [f.key, '']));
    setModal({ mode: 'add', draft: empty });
  };

  const openEdit = (row) => setModal({ mode: 'edit', draft: { ...row } });

  const closeModal = () => setModal(null);

  // Esc закриває форму
  useEffect(() => {
    if (!modal) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setModal(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modal]);

  // Обробники можуть бути async: якщо сервер повернув помилку — показуємо її і не закриваємо форму
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modal.mode === 'add') {
        await onAdd(modal.draft);
        toast.success('Запис додано');
      } else {
        await onEdit(modal.draft.id, modal.draft);
        toast.success('Зміни збережено');
      }
      closeModal();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (row) => {
    const ok = await confirm({
      title: 'Видалити запис?',
      message: `«${row[fields[0]?.key] ?? row.id}» буде видалено без можливості відновлення.`,
      confirmLabel: 'Видалити',
      danger: true,
    });
    if (!ok) return;
    try {
      await onDelete(row.id);
      toast.success('Запис видалено');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="crud">
      <div className="crud__header">
        <div>
          <h1>{title}</h1>
          <p>{rows.length} записів</p>
        </div>
        <button type="button" className="btn-filled" onClick={openAdd}>
          + Додати
        </button>
      </div>

      <div className="crud__toolbar">
        <input
          type="search"
          placeholder="Пошук..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="crud__table-wrap">
        <table className="crud-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
              <th aria-label="Дії" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id}>
                {columns.map((c) => (
                  <td key={c.key}>{renderCell ? renderCell(row, c.key) : row[c.key]}</td>
                ))}
                <td>
                  <button type="button" className="crud-table__edit-btn" onClick={() => openEdit(row)} aria-label="Редагувати">
                    Редагувати
                  </button>
                  <button type="button" className="crud-table__danger" onClick={() => handleDelete(row)} aria-label="Видалити">
                    Видалити
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="crud-table__empty">
                  Нічого не знайдено
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="crud-modal__overlay" role="dialog" aria-modal="true">
          <div className="crud-modal">
            <h2>{modal.mode === 'add' ? 'Додати запис' : 'Редагувати запис'}</h2>
            <form onSubmit={handleSubmit}>
              {fields.filter((f) => !f.show || f.show(modal.draft)).map((f) => (
                <div className="crud-field" key={f.key}>
                  <label htmlFor={f.key}>{f.label}</label>
                  {f.type === 'select' ? (
                    <select
                      id={f.key}
                      value={modal.draft[f.key] ?? ''}
                      onChange={(e) =>
                        setModal((m) => ({ ...m, draft: { ...m.draft, [f.key]: e.target.value } }))
                      }
                      required={isRequired(f, modal.mode)}
                    >
                      <option value="" disabled>Оберіть...</option>
                      {f.options.map((o) => {
                        const opt = typeof o === 'object' ? o : { value: o, label: o };
                        return <option key={opt.value} value={opt.value}>{opt.label}</option>;
                      })}
                    </select>
                  ) : (
                    <input
                      id={f.key}
                      type={f.type ?? 'text'}
                      value={modal.draft[f.key] ?? ''}
                      min={resolve(f.min, modal.draft)}
                      max={resolve(f.max, modal.draft)}
                      onChange={(e) =>
                        setModal((m) => ({ ...m, draft: { ...m.draft, [f.key]: e.target.value } }))
                      }
                      required={isRequired(f, modal.mode)}
                    />
                  )}
                </div>
              ))}
              <div className="crud-modal__actions">
                <button type="button" className="btn-outline" onClick={closeModal}>
                  Скасувати
                </button>
                <button type="submit" className="btn-filled">Зберегти</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
