import MasterSidebar from '../../components/MasterSidebar.jsx';
import ProfileCard from '../../components/ProfileCard.jsx';
import '../admin/DashboardPage.css';

export default function MasterProfilePage() {
  return (
    <div className="client-layout">
      <MasterSidebar />
      <main className="admin-dashboard">
        <ProfileCard roleLabel="Майстер" fields={['name', 'phone']} />
      </main>
    </div>
  );
}
