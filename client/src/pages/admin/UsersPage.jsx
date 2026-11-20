import { useMemo } from 'react';
import ApiCrudPage from '../../components/ApiCrudPage.jsx';
import { api } from '../../api/index.js';
import { useFetch } from '../../hooks/useFetch.js';
import { formatDate } from '../../utils/format.js';

const ROLE_LABELS = { client: 'клієнт', master: 'майстер', admin: 'адміністратор' };

const COLUMNS = [
  { key: 'login', label: 'Логін' },
  { key: 'name', label: 'ПІБ' },
  { key: 'role', label: 'Роль' },
  { key: 'createdAt', label: 'Створено' },
];

export default function UsersPage() {
  const { data: clients } = useFetch(() => api.clients.list(), []);
  const { data: masters } = useFetch(() => api.masters.listAll(), []);

  const fields = useMemo(() => [
    { key: 'login', label: 'Логін' },
    {
      key: 'role', label: 'Роль', type: 'select',
      options: Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label })),
    },
    // Прив'язка залежить від ролі (обмеження chk_users_role_link у БД)
    {
      key: 'clientId', label: 'Клієнт', type: 'select', show: (d) => d.role === 'client',
      options: (clients ?? []).map((c) => ({ value: c.id, label: c.name })),
    },
    {
      key: 'masterId', label: 'Майстер', type: 'select', show: (d) => d.role === 'master',
      options: (masters ?? []).map((m) => ({ value: m.id, label: m.name })),
    },
    // при редагуванні порожній пароль = не змінювати
    { key: 'password', label: 'Пароль', type: 'password', required: 'add' },
  ], [clients, masters]);

  return (
    <ApiCrudPage
      title="Користувачі"
      resource={api.users}
      columns={COLUMNS}
      fields={fields}
      searchKeys={['login', 'name', 'role']}
      toPayload={(d) => ({
        login: d.login,
        role: d.role,
        clientId: d.role === 'client' ? d.clientId : undefined,
        masterId: d.role === 'master' ? d.masterId : undefined,
        ...(d.password ? { password: d.password } : {}),
      })}
      renderCell={(row, key) => {
        if (key === 'role') return ROLE_LABELS[row.role];
        if (key === 'createdAt') return formatDate(row.createdAt);
        return row[key];
      }}
    />
  );
}
