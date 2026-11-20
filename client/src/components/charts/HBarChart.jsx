import './charts.css';

/**
 * Горизонтальна стовпчикова діаграма для категорій з довгими підписами.
 * items: [{ label, value }]; format — як показувати значення.
 */
export default function HBarChart({ items, format = (v) => v, emptyText = 'Немає даних за обраний період' }) {
  const max = Math.max(0, ...items.map((i) => i.value));
  if (items.length === 0 || max === 0) return <p className="chart-empty">{emptyText}</p>;

  return (
    <ul className="hbar">
      {items.map((item) => (
        <li key={item.label} className="hbar__row">
          <span className="hbar__label">{item.label}</span>
          <div className="hbar__track" role="img" aria-label={`${item.label}: ${format(item.value)}`}>
            <div className="hbar__fill" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
          <span className="hbar__value">{format(item.value)}</span>
        </li>
      ))}
    </ul>
  );
}
