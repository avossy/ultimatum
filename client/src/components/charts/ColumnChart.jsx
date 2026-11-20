import './charts.css';

const W = 640;
const H = 280;
const M = { top: 16, right: 12, bottom: 36, left: 56 };

// «Гарний» максимум осі: 1, 2, 5 × 10^n
function niceMax(v) {
  if (v <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

/**
 * Стовпчикова діаграма зі стеком (SVG, без бібліотек).
 * data: [{ label, values: [число для кожної серії] }]
 * series: [{ name }] — кольори задаються класами .col-chart__bar--0/1/2 у charts.css
 */
export default function ColumnChart({ data, series, format = (v) => v, emptyText = 'Немає даних за обраний період' }) {
  const totals = data.map((d) => d.values.reduce((a, b) => a + b, 0));
  const max = niceMax(Math.max(0, ...totals));
  if (data.length === 0 || Math.max(0, ...totals) === 0) return <p className="chart-empty">{emptyText}</p>;

  const innerW = W - M.left - M.right;
  const innerH = H - M.top - M.bottom;
  const slot = innerW / data.length;
  const barW = Math.min(56, slot * 0.6);
  const y = (v) => M.top + innerH - (v / max) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);

  return (
    <div className="col-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Діаграма">
        {ticks.map((t) => (
          <g key={t}>
            <line className="col-chart__grid" x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} />
            <text className="col-chart__tick" x={M.left - 8} y={y(t) + 4} textAnchor="end">{format(t)}</text>
          </g>
        ))}

        {data.map((d, i) => {
          const x = M.left + slot * i + (slot - barW) / 2;
          let acc = 0;
          return (
            <g key={d.label}>
              {d.values.map((v, si) => {
                const top = y(acc + v);
                const h = y(acc) - top;
                acc += v;
                return h > 0 ? (
                  <rect key={si} className={`col-chart__bar col-chart__bar--${si}`} x={x} y={top} width={barW} height={h} rx="3">
                    <title>{`${d.label} — ${series[si].name}: ${format(v)}`}</title>
                  </rect>
                ) : null;
              })}
              <text className="col-chart__tick" x={x + barW / 2} y={H - M.bottom + 18} textAnchor="middle">{d.label}</text>
            </g>
          );
        })}
      </svg>

      <ul className="col-chart__legend">
        {series.map((s, i) => (
          <li key={s.name}><span className={`col-chart__swatch col-chart__bar--${i}`} />{s.name}</li>
        ))}
      </ul>
    </div>
  );
}
