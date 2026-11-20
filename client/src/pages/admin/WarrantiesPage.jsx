import { useMemo } from 'react';
import ApiCrudPage from '../../components/ApiCrudPage.jsx';
import { api } from '../../api/index.js';
import { useFetch } from '../../hooks/useFetch.js';
import { formatDate } from '../../utils/format.js';

const TYPES = ['виробника', 'сервісного центру'];

const COLUMNS = [
  { key: 'device', label: 'Пристрій' },
  { key: 'serialNumber', label: 'Серійний номер' },
  { key: 'client', label: 'Власник' },
  { key: 'type', label: 'Тип гарантії' },
  { key: 'startDate', label: 'Початок' },
  { key: 'endDate', label: 'Кінець' },
  { key: 'isActive', label: 'Стан' },
];

export default function WarrantiesPage() {
  const { data: devices } = useFetch(() => api.devices.list(), []);

  const fields = useMemo(() => [
    {
      key: 'deviceId', label: 'Пристрій', type: 'select',
      options: (devices ?? []).map((d) => ({
        value: d.id,
        label: `${d.brand} ${d.model} (${d.serialNumber})${d.client ? ` — ${d.client}` : ''}`,
      })),
    },
    { key: 'type', label: 'Тип гарантії', type: 'select', options: TYPES },
    { key: 'startDate', label: 'Початок гарантії', type: 'date' },
    { key: 'endDate', label: 'Кінець гарантії', type: 'date', min: (draft) => draft.startDate || undefined },
  ], [devices]);

  return (
    <ApiCrudPage
      title="Гарантії"
      resource={api.warranties}
      columns={COLUMNS}
      fields={fields}
      searchKeys={['device', 'serialNumber', 'client', 'type']}
      toPayload={({ deviceId, type, startDate, endDate }) => ({
        deviceId: Number(deviceId), type, startDate, endDate,
      })}
      renderCell={(row, key) => {
        if (key === 'startDate' || key === 'endDate') return formatDate(row[key]);
        if (key === 'isActive') return row.isActive ? 'діє' : 'закінчилась';
        return row[key];
      }}
    />
  );
}
