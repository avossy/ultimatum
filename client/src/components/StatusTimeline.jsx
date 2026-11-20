import './StatusTimeline.css';

// steps: [{ status, date, comment, author }], у хронологічному порядку
export default function StatusTimeline({ steps, currentIndex }) {
  return (
    <ol className="timeline">
      {steps.map((step, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <li
            key={step.status}
            className={`timeline__item ${isDone ? 'timeline__item--done' : ''} ${
              isCurrent ? 'timeline__item--current' : ''
            }`}
          >
            <span className="timeline__dot" aria-hidden="true" />
            <div className="timeline__body">
              <div className="timeline__status">
                {step.status}
                {isCurrent && <span className="timeline__tag">Поточний етап</span>}
              </div>
              {step.date && <div className="timeline__date">{step.date}</div>}
              {step.comment && (
                <div className="timeline__comment">
                  {step.author && <strong>{step.author}: </strong>}
                  {step.comment}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
