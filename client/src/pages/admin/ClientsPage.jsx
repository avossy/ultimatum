import ApiCrudPage from '../../components/ApiCrudPage.jsx';
import { api } from '../../api/index.js';
import { formatDate } from '../../utils/format.js';

const COLUMNS = [
  { key: 'name', label: 'ПІБ' },
  { key: 'phone', label: 'Телефон' },
  { key: 'email', label: 'Email' },
  { key: 'address', label: 'Адреса' },
  { key: 'registrationDate', label: 'Зареєстровано' },
];

const FIELDS = [
  { key: 'name', label: 'ПІБ' },
  { key: 'phone', label: 'Телефон', type: 'tel' },
  { key: 'email', label: 'Email', type: 'email', required: false },
  { key: 'address', label: 'Адреса', required: false },
];

const pick = ({ name, phone, email, address }) => ({ name, phone, email, address });

export default function ClientsPage() {
  return (
    <ApiCrudPage
      title="Клієнти"
      resource={api.clients}
      columns={COLUMNS}
      fields={FIELDS}
      searchKeys={['name', 'phone', 'email', 'address']}
      toPayload={pick}
      renderCell={(row, key) => (key === 'registrationDate' ? formatDate(row.registrationDate) : row[key] ?? '—')}
    />
  );
}
