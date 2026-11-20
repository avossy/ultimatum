import AdminSidebar from './AdminSidebar.jsx';

const MASTER_LINKS = [
  { to: '/master/dashboard', label: 'Дашборд' },
  { to: '/master/orders', label: 'Мої замовлення' },
  { to: '/master/reviews', label: 'Відгуки' },
  { to: '/master/profile', label: 'Профіль' },
];

export default function MasterSidebar() {
  return <AdminSidebar links={MASTER_LINKS} title="Панель майстра" />;
}
