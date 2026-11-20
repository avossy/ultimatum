import ApiCrudPage from '../../components/ApiCrudPage.jsx';
import { api } from '../../api/index.js';
import { formatDate } from '../../utils/format.js';

const COLUMNS = [
  { key: 'name', label: 'ПІБ' },
  { key: 'specialization', label: 'Спеціалізація' },
  { key: 'phone', label: 'Телефон' },
  { key: 'hireDate', label: 'Працює з' },
  { key: 'isActive', label: 'Статус' },
];

const FIELDS = [
  { key: 'name', label: 'ПІБ' },
  { key: 'specialization', label: 'Спеціалізація' },
  { key: 'phone', label: 'Телефон', type: 'tel' },
  { key: 'hireDate', label: 'Дата прийняття', type: 'date' },
  {
    key: 'isActive', label: 'Статус', type: 'select',
    options: [{ value: 'true', label: 'Активний' }, { value: 'false', label: 'Неактивний' }],
  },
];

export default function MastersPage() {
  return (
    <ApiCrudPage
      title="Майстри"
      resource={api.masters}
      load={api.masters.listAll}
      columns={COLUMNS}
      fields={FIELDS}
      searchKeys={['name', 'specialization', 'phone']}
      toPayload={({ name, specialization, phone, hireDate, isActive }) => ({ name, specialization, phone, hireDate, isActive })}
      renderCell={(row, key) => {
        if (key === 'hireDate') return formatDate(row.hireDate);
        if (key === 'isActive') return row.isActive ? 'Активний' : 'Неактивний';
        return row[key];
      }}
    />
  );
}
