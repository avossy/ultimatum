import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import './ServicesPage.css';

const SERVICES = [
  {
    title: 'Ремонт ноутбуків',
    icon: '/assets/laptop.png',
    desc: 'Від чистки до складного ремонту материнської плати.',
    items: ['Заміна матриці та клавіатури', 'Чистка від пилу, заміна термопасти', 'Ремонт живлення та роз’ємів'],
  },
  {
    title: 'Ремонт смартфонів',
    icon: '/assets/phone.png',
    desc: 'Повертаємо до життя телефони після падінь і вологи.',
    items: ['Заміна екрана та акумулятора', 'Ремонт після потрапляння вологи', 'Відновлення роз’єму заряджання'],
  },
  {
    title: 'Ремонт планшетів',
    icon: '/assets/tablet.png',
    desc: 'Діагностика та ремонт планшетів будь-яких брендів.',
    items: ['Заміна скла та дисплея', 'Заміна акумулятора', 'Усунення програмних збоїв'],
  },
  {
    title: 'Ремонт комп’ютерів',
    icon: '/assets/computer.png',
    desc: 'Системні блоки: від діагностики до апгрейду.',
    items: ['Збирання та апгрейд', 'Заміна блока живлення й охолодження', 'Усунення несправностей'],
  },
  {
    title: 'Ремонт ігрових пристроїв',
    icon: '/assets/console.png',
    desc: 'Консолі та контролери без зайвого очікування.',
    items: ['Ремонт консолей', 'Заміна механізмів контролерів', 'Чистка та обслуговування'],
  },
  {
    title: 'Технічне обслуговування',
    icon: '/assets/station.png',
    desc: 'Профілактика, щоб техніка не підводила в найгірший момент.',
    items: ['Планова діагностика', 'Профілактична чистка', 'Консультації щодо експлуатації'],
  },
];

const STEPS = [
  { title: 'Заявка', text: 'Оберіть пристрій, опишіть проблему та зручний час.' },
  { title: 'Діагностика', text: 'Майстер визначає причину несправності та вартість.' },
  { title: 'Ремонт', text: 'Ремонтуємо з оригінальними запчастинами.' },
  { title: 'Видача', text: 'Повертаємо пристрій із гарантією на роботи.' },
];

export default function ServicesPage() {
  return (
    <div className="services-page">
      <Header />

      <section className="services-hero">
        <img className="services-hero__art" src="/assets/services.jpg"></img>
        <div className="services-hero__text">
          <span className="services-hero__eyebrow">Послуги</span>
          <h1>Ремонт <b>будь-якої</b> електроніки</h1>
          <p>
            Точна діагностика, оригінальні запчастини та гарантія на всі види робіт.
            Оберіть свій тип пристрою — і запишіться на ремонт онлайн.
          </p>
          <div className="services-hero__actions">
            <Link to="/booking" className="btn-filled services-btn-lg">Записатися на ремонт</Link>
            <a href="#services-list" className="btn-outline services-btn-lg">Усі послуги</a>
          </div>
        </div>

      </section>

      <section id="services-list" className="services-grid">
        {SERVICES.map((s) => (
          <article key={s.title} className="services-card">
            <img src={s.icon} alt="" className="services-card__icon" />
            <h2>{s.title}</h2>
            <p>{s.desc}</p>
            <ul>
              {s.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Link to="/booking" className="services-card__link">Записатися →</Link>
          </article>
        ))}
      </section>

      <section className="services-steps">
        <h2>Як ми працюємо</h2>
        <ol>
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="services-steps__num">{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="services-cta">
        <div>
          <h2>Не знайшли свій пристрій?</h2>
          <p>Оберіть «Інша техніка» під час запису — майстер розбереться.</p>
        </div>
        <Link to="/booking" className="btn-filled services-btn-lg">Запис на ремонт</Link>
      </section>

      <footer className="services-footer">
        <span>© 2026 Сервісний центр Ультиматум</span>
        <div>
          <Link to="/">Головна</Link>
          <Link to="/masters">Наші майстри</Link>
          <Link to="/auth">Вхід</Link>
        </div>
      </footer>
    </div>
  );
}
