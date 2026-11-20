import AdminSidebar from '../../components/AdminSidebar.jsx';
import ReviewsList from '../../components/ReviewsList.jsx';
import { api } from '../../api/index.js';
import { useFetch } from '../../hooks/useFetch.js';

export default function ReviewsPage() {
  const { data, loading, error } = useFetch(() => api.reviews.list(), []);
  return (
    <div className="client-layout">
      <AdminSidebar />
      <ReviewsList
        reviews={data ?? []}
        status={loading ? 'Завантаження...' : error}
        showMaster
        requestLink={(id) => `/admin/requests/${id}`}
      />
    </div>
  );
}
