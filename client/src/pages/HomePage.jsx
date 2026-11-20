import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import './HomePage.css';

const SERVICES = [
  { title: 'Ремонт ноутбуків', desc: 'Заміна матриці, клавіатури, чистка від пилу, заміна термопасти' },
  { title: 'Ремонт смартфонів', desc: 'Заміна екрана, акумулятора, ремонт після вологи' },
  { title: 'Ремонт планшетів', desc: 'Діагностика, заміна скла та акумулятора' },
  { title: 'Ремонт комп\'ютерів', desc: 'Збирання, апгрейд, усунення несправностей' },
  { title: 'Ремонт ігрових пристроїв', desc: 'Консолі, контролери, заміна механізмів' },
  { title: 'Технічне обслуговування', desc: 'Профілактика та планова діагностика техніки' },
];

export default function HomePage() {
  return (
    <div className="home">
      <Header />

      <section className="hero">
        <div className="hero__text">
          <span className="hero__eyebrow">Швидко · Надійно · Професійно</span>
            <h1>Сервісний центр електроніки <b>Ультиматум</b></h1>
          <p>Точна діагностика та ідеальний ремонт без зайвих слів. Повертаємо до життя навіть складну електроніку, від якої відмовилися в інших сервісах.</p>
          <div className="hero__actions">
            <Link to="/booking" className="btn-filled btn-lg">Записатися на ремонт</Link>
            <a href="#about" className="btn-outline btn-lg">Дізнатися більше</a>
          </div>
        </div>
        <video autoPlay muted loop className="hero__art" aria-hidden="true" src="/assets/hero_work.mp4"></video>
      </section>

      <section className="services">
        {SERVICES.map((s) => (
          <article key={s.title} className="service-card">
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
          </article>
        ))}
      </section>

      <section id="about" className="about">
        <img className="about__media" src="/assets/repair-bench.jpg"></img>
        <div className="about__text">
          <span className="about__eyebrow">Про нас</span>
          <h2>Якість, якій можна довіряти</h2>
          <p>
            Ми поєднуємо сучасне обладнання, досвідчених майстрів та турботу про
            кожного клієнта, щоб ваша техніка працювала бездоганно.
          </p>
          <ul className="about__list">
            <li>Оперативний ремонт</li>
            <li>Оригінальні запчастини</li>
            <li>Гарантія на всі види робіт</li>
          </ul>
        </div>
      </section>

      <section className="cta">
        <div>
          <h2>Потрібен ремонт просто зараз?</h2>
          <p>Запишіться онлайн — оберете пристрій, опишете проблему та зручний час.</p>
        </div>
        <Link to="/booking" className="btn-filled btn-lg">Запис на ремонт</Link>
      </section>

      <footer className="site-footer">
        <span>© 2026 Сервісний центр Ультиматум</span>
        <div className="site-footer__links">
          <Link to="/masters">Наші майстри</Link>
          <Link to="/services">Послуги</Link>
          <Link to="/auth">Вхід</Link>
        </div>
      </footer>
    </div>
  );
}
