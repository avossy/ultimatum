import { useMemo } from 'react';
import ApiCrudPage from '../../components/ApiCrudPage.jsx';
import { api } from '../../api/index.js';
import { useFetch } from '../../hooks/useFetch.js';
import { formatDate } from '../../utils/format.js';

const COLUMNS = [
  { key: 'device', label: 'Пристрій' },
  { key: 'type', label: 'Тип' },
  { key: 'serialNumber', label: 'Серійний номер' },
  { key: 'client', label: 'Власник' },
  { key: 'purchaseDate', label: 'Куплено' },
];

export default function DevicesPage() {
  const { data: clients } = useFetch(() => api.clients.list(), []);

  const fields = useMemo(() => [
    { key: 'clientId', label: 'Власник', type: 'select', options: (clients ?? []).map((c) => ({ value: c.id, label: c.name })) },
    { key: 'brand', label: 'Бренд' },
    { key: 'model', label: 'Модель' },
    { key: 'type', label: 'Тип пристрою' },
    { key: 'serialNumber', label: 'Серійний номер' },
    { key: 'purchaseDate', label: 'Дата купівлі', type: 'date', required: false },
  ], [clients]);

  return (
    <ApiCrudPage
      title="Пристрої"
      resource={api.devices}
      columns={COLUMNS}
      fields={fields}
      searchKeys={['brand', 'model', 'serialNumber', 'client', 'type']}
      toPayload={({ clientId, brand, model, type, serialNumber, purchaseDate }) => ({
        clientId, brand, model, type, serialNumber, purchaseDate: purchaseDate || null,
      })}
      renderCell={(row, key) => {
        if (key === 'device') return `${row.brand} ${row.model}`;
        if (key === 'purchaseDate') return formatDate(row.purchaseDate);
        return row[key];
      }}
    />
  );
}
