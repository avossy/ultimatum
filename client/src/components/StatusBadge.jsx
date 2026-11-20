import './StatusBadge.css';

// Відповідність статусів кольорам; підлаштуйте під реальні значення з таблиці statuses
const STATUS_STYLES = {
  'прийнято': 'status--neutral',
  'діагностика': 'status--progress',
  'очікування запчастини': 'status--waiting',
  'у ремонті': 'status--progress',
  'готово': 'status--success',
  'видано': 'status--success',
  'скасовано': 'status--cancelled',
};

export default function StatusBadge({ status }) {
  const className = STATUS_STYLES[status?.toLowerCase()] ?? 'status--neutral';
  return <span className={`status-badge ${className}`}>{status}</span>;
}
