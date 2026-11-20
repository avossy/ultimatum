import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import './Feedback.css';

/**
 * Тости і модалка підтвердження для всього застосунку.
 *
 *   const toast = useToast();      toast.success('Збережено'); toast.error(err.message);
 *   const confirm = useConfirm();  if (!(await confirm({ title, message, confirmLabel, danger }))) return;
 */
const FeedbackContext = createContext(null);

const TOAST_TTL = { success: 3500, info: 4000, error: 6000 };
const ICONS = { success: '✓', error: '!', info: 'i' };

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null); // { options, resolve }
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback((type, message) => {
    const id = nextId.current++;
    setToasts((list) => [...list.slice(-3), { id, type, message }]);
    setTimeout(() => dismiss(id), TOAST_TTL[type]);
  }, [dismiss]);

  const toast = useMemo(() => ({
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  }), [push]);

  const confirm = useCallback(
    (options) => new Promise((resolve) => setDialog({ options, resolve })),
    []
  );

  const closeDialog = (result) => {
    dialog?.resolve(result);
    setDialog(null);
  };

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}

      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>
            <span className="toast__icon" aria-hidden="true">{ICONS[t.type]}</span>
            <span className="toast__text">{t.message}</span>
            <button type="button" className="toast__close" onClick={() => dismiss(t.id)} aria-label="Закрити">×</button>
          </div>
        ))}
      </div>

      {dialog && <ConfirmDialog options={dialog.options} onClose={closeDialog} />}
    </FeedbackContext.Provider>
  );
}

function ConfirmDialog({ options, onClose }) {
  const {
    title = 'Підтвердіть дію',
    message,
    confirmLabel = 'Підтвердити',
    cancelLabel = 'Скасувати',
    danger = false,
  } = options;
  const confirmRef = useRef(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="dialog-overlay"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(false); }}
    >
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-message">
        <h2 id="dialog-title">{title}</h2>
        {message && <p id="dialog-message">{message}</p>}
        <div className="dialog__actions">
          <button type="button" className="btn-outline" onClick={() => onClose(false)}>{cancelLabel}</button>
          <button
            type="button"
            ref={confirmRef}
            className={`btn-filled ${danger ? 'dialog__danger' : ''}`}
            onClick={() => onClose(true)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('FeedbackProvider відсутній');
  return ctx;
}

export const useToast = () => useFeedback().toast;
export const useConfirm = () => useFeedback().confirm;
