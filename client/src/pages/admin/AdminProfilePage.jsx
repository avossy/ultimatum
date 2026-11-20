import AdminSidebar from '../../components/AdminSidebar.jsx';
import ProfileCard from '../../components/ProfileCard.jsx';
import './DashboardPage.css';

export default function AdminProfilePage() {
  return (
    <div className="client-layout">
      <AdminSidebar />
      <main className="admin-dashboard">
        <ProfileCard roleLabel="Адміністратор" editable={false} />
      </main>
    </div>
  );
}
