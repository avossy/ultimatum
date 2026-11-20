import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './Header.css';

const NAV_LINKS = [
  { to: '/masters', label: 'Наші майстри' },
  { to: '/booking', label: 'Запис на ремонт' },
  { to: '/services', label: 'Послуги' },
];

// Пункти випадного меню профілю — свої для кожної ролі
const ROLE_MENU = {
  client: [
    { to: '/client/requests', label: 'Мої заявки' },
    { to: '/client/profile', label: 'Мій профіль' },
  ],
  master: [
    { to: '/master/dashboard', label: 'Дашборд' },
    { to: '/master/orders', label: 'Мої замовлення' },
    { to: '/master/reviews', label: 'Відгуки' },
    { to: '/master/profile', label: 'Профіль' },
  ],
  admin: [
    { to: '/admin/dashboard', label: 'Дашборд' },
    { to: '/admin/requests', label: 'Усі заявки' },
    { to: '/admin/profile', label: 'Профіль' },
  ],
};

function getInitials(value) {
  if (!value) return '?';
  const parts = value.trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

export default function Header() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate('/');
  };

  const menuItems = role ? ROLE_MENU[role] : [];
  // Публічні вкладки (майстри, запис, послуги) призначені для клієнтів і гостей
  const navLinks = role === 'master' || role === 'admin' ? [] : NAV_LINKS;

  return (
    <header className="site-header">
      <nav className="site-header__inner">
        <Link to="/" className="site-header__logo">
          <img src="/assets/ultimatum_logo.svg"></img>
        </Link>

        <div className="site-header__links">
          {navLinks.map((l) => (
            <Link key={l.to} to={l.to}>{l.label}</Link>
          ))}
        </div>

        {role ? (
          <div className="profile-menu" ref={menuRef}>
            <button
              type="button"
              className="profile-menu__avatar"
              onClick={() => setOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={open}
            >
              {getInitials(user?.name)}
            </button>

            {open && (
              <div className="profile-menu__dropdown" role="menu">
                {menuItems.map((item) => (
                  <Link key={item.to} to={item.to} role="menuitem" onClick={() => setOpen(false)}>
                    {item.label}
                  </Link>
                ))}
                <button type="button" className="profile-menu__logout" role="menuitem" onClick={handleLogout}>
                  Вийти
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="site-header__auth">
            <Link to="/auth" className="btn-outline">Вхід</Link>
            <Link to="/auth?tab=register" className="btn-filled">Реєстрація</Link>
          </div>
        )}
      </nav>
    </header>
  );
}
