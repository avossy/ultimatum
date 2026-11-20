import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import RequireRole from './components/RequireRole.jsx';
import AuthPage from './pages/AuthPage.jsx';
import MastersPage from './pages/MastersPage.jsx';
import BookingPage from './pages/BookingPage.jsx';
import ServicesPage from './pages/ServicesPage.jsx';
import MyRequestsPage from './pages/client/MyRequestsPage.jsx';
import ProfilePage from './pages/client/ProfilePage.jsx';
import RequestDetailPage from './pages/client/RequestDetailPage.jsx';
import MyOrdersPage from './pages/master/MyOrdersPage.jsx';
import OrderDetailPage from './pages/master/OrderDetailPage.jsx';
import MasterDashboardPage from './pages/master/MasterDashboardPage.jsx';
import MasterReviewsPage from './pages/master/MasterReviewsPage.jsx';
import MasterProfilePage from './pages/master/MasterProfilePage.jsx';
import DashboardPage from './pages/admin/DashboardPage.jsx';
import ClientsPage from './pages/admin/ClientsPage.jsx';
import AdminMastersPage from './pages/admin/MastersPage.jsx';
import PartsPage from './pages/admin/PartsPage.jsx';
import DevicesPage from './pages/admin/DevicesPage.jsx';
import WarrantiesPage from './pages/admin/WarrantiesPage.jsx';
import AllRequestsPage from './pages/admin/AllRequestsPage.jsx';
import ReviewsPage from './pages/admin/ReviewsPage.jsx';
import ReportsPage from './pages/admin/ReportsPage.jsx';
import UsersPage from './pages/admin/UsersPage.jsx';
import AdminProfilePage from './pages/admin/AdminProfilePage.jsx';

// Сторінки додаються сюди по мірі того, як ми їх верстаємо
export default function App() {
  return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/masters" element={<MastersPage />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/client/requests" element={<RequireRole roles={['client']}><MyRequestsPage /></RequireRole>} />
          <Route path="/client/profile" element={<RequireRole roles={['client']}><ProfilePage /></RequireRole>} />
          <Route path="/client/requests/:id" element={<RequireRole roles={['client']}><RequestDetailPage /></RequireRole>} />
          <Route path="/master/dashboard" element={<RequireRole roles={['master']}><MasterDashboardPage /></RequireRole>} />
          <Route path="/master/orders" element={<RequireRole roles={['master']}><MyOrdersPage /></RequireRole>} />
          <Route path="/master/orders/:id" element={<RequireRole roles={['master']}><OrderDetailPage /></RequireRole>} />
          <Route path="/master/reviews" element={<RequireRole roles={['master']}><MasterReviewsPage /></RequireRole>} />
          <Route path="/master/profile" element={<RequireRole roles={['master']}><MasterProfilePage /></RequireRole>} />
          <Route path="/admin/dashboard" element={<RequireRole roles={['admin']}><DashboardPage /></RequireRole>} />
          <Route path="/admin/clients" element={<RequireRole roles={['admin']}><ClientsPage /></RequireRole>} />
          <Route path="/admin/masters" element={<RequireRole roles={['admin']}><AdminMastersPage /></RequireRole>} />
          <Route path="/admin/parts" element={<RequireRole roles={['admin']}><PartsPage /></RequireRole>} />
          <Route path="/admin/devices" element={<RequireRole roles={['admin']}><DevicesPage /></RequireRole>} />
          <Route path="/admin/warranties" element={<RequireRole roles={['admin']}><WarrantiesPage /></RequireRole>} />
          <Route path="/admin/requests" element={<RequireRole roles={['admin']}><AllRequestsPage /></RequireRole>} />
          <Route path="/admin/reviews" element={<RequireRole roles={['admin']}><ReviewsPage /></RequireRole>} />
          <Route path="/admin/reports" element={<RequireRole roles={['admin']}><ReportsPage /></RequireRole>} />
          <Route path="/admin/users" element={<RequireRole roles={['admin']}><UsersPage /></RequireRole>} />
          <Route path="/admin/profile" element={<RequireRole roles={['admin']}><AdminProfilePage /></RequireRole>} />
          {/* Адмін відкриває заявку тією ж сторінкою, що й майстер (сервер дозволяє адміну ті самі дії) */}
          <Route path="/admin/requests/:id" element={<RequireRole roles={['admin']}><OrderDetailPage /></RequireRole>} />
        </Routes>
      </BrowserRouter>
  );
}
