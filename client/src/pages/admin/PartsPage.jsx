import ApiCrudPage from '../../components/ApiCrudPage.jsx';
import { api } from '../../api/index.js';

const COLUMNS = [
  { key: 'name', label: 'Назва' },
  { key: 'partNumber', label: 'Артикул' },
  { key: 'manufacturer', label: 'Виробник' },
  { key: 'unitPrice', label: 'Ціна, ₴' },
  { key: 'stockQuantity', label: 'Залишок' },
  { key: 'minStockLevel', label: 'Мін. залишок' },
];

const FIELDS = [
  { key: 'name', label: 'Назва' },
  { key: 'partNumber', label: 'Артикул' },
  { key: 'manufacturer', label: 'Виробник', required: false },
  { key: 'unitPrice', label: 'Ціна, ₴', type: 'number', min: 0 },
  { key: 'stockQuantity', label: 'Залишок на складі', type: 'number', min: 0 },
  { key: 'minStockLevel', label: 'Мінімальний залишок', type: 'number', min: 0 },
];

export default function PartsPage() {
  return (
    <ApiCrudPage
      title="Запчастини"
      resource={api.parts}
      columns={COLUMNS}
      fields={FIELDS}
      searchKeys={['name', 'partNumber', 'manufacturer']}
      toPayload={({ name, partNumber, manufacturer, unitPrice, stockQuantity, minStockLevel }) => ({
        name, partNumber, manufacturer: manufacturer || null, unitPrice, stockQuantity, minStockLevel,
      })}
      renderCell={(row, key) => {
        if (key === 'stockQuantity') return row.lowStock ? `${row.stockQuantity} ⚠` : row.stockQuantity;
        return row[key] ?? '—';
      }}
    />
  );
}
