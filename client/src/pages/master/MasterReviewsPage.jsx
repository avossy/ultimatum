import MasterSidebar from '../../components/MasterSidebar.jsx';
import ReviewsList from '../../components/ReviewsList.jsx';
import { api } from '../../api/index.js';
import { useFetch } from '../../hooks/useFetch.js';

export default function MasterReviewsPage() {
  // Сервер повертає лише відгуки по заявках цього майстра
  const { data, loading, error } = useFetch(() => api.reviews.list(), []);

  return (
    <div className="client-layout">
      <MasterSidebar />
      <ReviewsList
        reviews={data ?? []}
        status={loading ? 'Завантаження...' : error}
        requestLink={(id) => `/master/orders/${id}`}
      />
    </div>
  );
}
