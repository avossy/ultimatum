import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const HOME_BY_ROLE = {
  client: '/client/requests',
  master: '/master/dashboard',
  admin: '/admin/dashboard',
};

// Пускає на сторінку лише вказані ролі: гостя відправляє на вхід, чужу роль — на її домашню сторінку
export default function RequireRole({ roles, children }) {
  const { role } = useAuth();
  if (!role) return <Navigate to="/auth" replace />;
  if (!roles.includes(role)) return <Navigate to={HOME_BY_ROLE[role]} replace />;
  return children;
}
