import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../../components/Header.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import StatusTimeline from '../../components/StatusTimeline.jsx';
import { api } from '../../api/index.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useConfirm, useToast } from '../../components/Feedback.jsx';
import { formatDate, warrantyText } from '../../utils/format.js';
import './RequestDetailPage.css';

export default function RequestDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const confirm = useConfirm();
  const { data: request, loading, error, reload } = useFetch(() => api.requests.get(id), [id]);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewError, setReviewError] = useState('');

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!rating) return;
    setReviewError('');
    try {
      await api.requests.review(id, rating, reviewText);
      await reload();
      toast.success('Дякуємо за відгук!');
    } catch (err) {
      setReviewError(err.message);
      toast.error(err.message);
    }
  };

  const handleCancel = async () => {
    const ok = await confirm({
      title: 'Скасувати заявку?',
      message: 'Заявку буде закрито зі статусом «скасовано». Це можна зробити, поки її ще не взято в роботу.',
      confirmLabel: 'Скасувати заявку',
      cancelLabel: 'Назад',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.requests.cancel(id);
      await reload();
      toast.success('Заявку скасовано');
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading && !request) return <div><Header /><main className="request-detail"><p>Завантаження...</p></main></div>;
  if (error || !request) {
    return (
        <div>
          <Header />
          <main className="request-detail">
            <Link to="/client/requests" className="request-detail__back">← Назад до списку</Link>
            <p>{error || 'Заявку не знайдено'}</p>
          </main>
        </div>
    );
  }

  const isCompleted = request.status === 'видано';
  const totalCost = request.cost;

  return (
      <div>
        <Header />
        <main className="request-detail">
          <Link to="/client/requests" className="request-detail__back">← Назад до списку</Link>

          <div className="request-detail__header">
            <h1>Заявка №{request.id}</h1>
            <StatusBadge status={request.status} />
            {request.status === 'прийнято' && (
                <button type="button" className="btn-outline" onClick={handleCancel}>Скасувати заявку</button>
            )}
          </div>

          <section className="request-detail__card">
            <div className="device-info">
              <div className="device-info__icon" aria-hidden="true">💻</div>
              <div>
                <h2>{request.device}</h2>
                <p>Проблема: {request.problem}</p>
                <div className="device-info__meta">
                  <span>Дата подачі: {formatDate(request.date)}</span>
                  <span>Серійний номер: {request.serialNumber}</span>
                  <span>Планова дата завершення: {formatDate(request.plannedCompletionDate)}</span>
                  <span>Гарантія: {warrantyText(request)}</span>
                </div>
              </div>
            </div>
          </section>

          <div className="request-detail__grid">
            <section className="request-detail__card">
              <h3>Статус заявки</h3>
              <StatusTimeline
                  steps={request.history.map((h) => ({
                    status: h.status,
                    date: formatDate(h.date),
                    comment: h.comment,
                    author: h.author,
                  }))}
                  currentIndex={request.history.length - 1}
              />
            </section>

            <div className="request-detail__side">
              <section className="request-detail__card cost-card">
              <span className="cost-card__label">
                {isCompleted ? 'Фінальна вартість' : 'Орієнтовна вартість'}
              </span>
                <div className="cost-card__value">{totalCost} ₴</div>
                {!isCompleted && (
                    <p className="cost-card__note">Фінальна сума може змінитися після діагностики</p>
                )}
              </section>

              {request.diagnosis && (
                  <section className="request-detail__card">
                    <h3>Діагноз</h3>
                    <p className="diagnosis-text">{request.diagnosis}</p>
                  </section>
              )}

              {isCompleted && (
                  <section className="request-detail__card review-card">
                    {request.review ? (
                        <p className="review-thanks">Дякуємо за відгук!</p>
                    ) : (
                        <>
                          <h3>Ваш відгук</h3>
                          <p>Поділіться враженнями від нашого сервісу</p>
                          <form onSubmit={handleSubmitReview}>
                            <div className="review-stars" role="radiogroup" aria-label="Оцінка">
                              {[1, 2, 3, 4, 5].map((n) => (
                                  <button
                                      key={n}
                                      type="button"
                                      className={`review-star ${n <= rating ? 'review-star--active' : ''}`}
                                      onClick={() => setRating(n)}
                                      aria-label={`${n} з 5`}
                                  >
                                    ★
                                  </button>
                              ))}
                            </div>
                            {reviewError && <p className="review-thanks">{reviewError}</p>}
                            <textarea
                                rows={3}
                                placeholder="Коментар (необов'язково)"
                                value={reviewText}
                                onChange={(e) => setReviewText(e.target.value)}
                            />
                            <button type="submit" className="btn-filled" disabled={!rating}>
                              Залишити відгук
                            </button>
                          </form>
                        </>
                    )}
                  </section>
              )}
            </div>
          </div>
        </main>
      </div>
  );
}
