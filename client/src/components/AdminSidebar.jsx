import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './AdminSidebar.css';

const ADMIN_LINKS = [
    { to: '/admin/dashboard', label: 'Дашборд' },
    { to: '/admin/requests', label: 'Усі заявки' },
    { to: '/admin/clients', label: 'Клієнти' },
    { to: '/admin/devices', label: 'Пристрої' },
    { to: '/admin/warranties', label: 'Гарантії' },
    { to: '/admin/masters', label: 'Майстри' },
    { to: '/admin/parts', label: 'Запчастини' },
    { to: '/admin/reviews', label: 'Відгуки' },
    { to: '/admin/reports', label: 'Звіти' },
    { to: '/admin/users', label: 'Користувачі' },
    { to: '/admin/profile', label: 'Профіль' },
];

// links/title можна підмінити (так цей сайдбар використовує і панель майстра)
export default function AdminSidebar({ links = ADMIN_LINKS, title = 'Адмін-панель' }) {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/auth');
    };

    return (
        <aside className="admin-sidebar">
            <div className="admin-sidebar__brand">
                <img src="/assets/ultimatum_logo.svg"></img>
                <span>{title}</span>
            </div>

            <nav className="admin-sidebar__nav">
                {links.map((link) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) =>
                            `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
                        }
                    >
                        {link.label}
                    </NavLink>
                ))}
            </nav>

            <button type="button" className="admin-sidebar__link admin-sidebar__logout" onClick={handleLogout}>
                Вийти
            </button>
        </aside>
    );
}
