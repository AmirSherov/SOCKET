import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.scss';

const LandingPage = () => {
  const navigate = useNavigate();
  const featuresRef = useRef(null);
  const cursorFollowerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    const features = document.querySelectorAll('.feature-card');
    features.forEach((feature) => observer.observe(feature));

    // Add cursor follower effect
    const handleMouseMove = (e) => {
      if (cursorFollowerRef.current) {
        const { clientX, clientY } = e;
        cursorFollowerRef.current.style.transform = 
          `translate(${clientX - 150}px, ${clientY - 150}px)`;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      observer.disconnect();
    };
  }, []);

  const handleGetStarted = () => {
    navigate('/login');
  };

  return (
    <>
      <div className="cursor-follower" ref={cursorFollowerRef}></div>
      <div className="landing">
        <header className="landing__header">
          <div className="landing__logo">SOCKET Messenger</div>
          <button className="landing__cta-button" onClick={handleGetStarted}>
            Войти
          </button>
        </header>

        <section className="landing__hero">
          <div className="landing__hero-content">
            <h1>Общайтесь без границ</h1>
            <p className="gradient-text">Быстрый и безопасный способ оставаться на связи с близкими</p>
            <div className="landing__hero-image">
              {/* Add hero image or animation here */}
            </div>
            <button className="landing__start-button" onClick={handleGetStarted}>
              Начать сейчас
              <span className="button-glow"></span>
            </button>
          </div>
        </section>

        <section className="landing__features">
          <h2>Почему выбирают нас</h2>
          <div className="features-grid">
            <div className="feature-card">
              <i className="feature-icon speed"></i>
              <h3>Молниеносная скорость</h3>
              <p>Мгновенная доставка сообщений</p>
            </div>
            <div className="feature-card">
              <i className="feature-icon security"></i>
              <h3>Безопасность</h3>
              <p>Надёжная защита ваших данных</p>
            </div>
            <div className="feature-card">
              <i className="feature-icon interface"></i>
              <h3>Удобный интерфейс</h3>
              <p>Простой и понятный дизайн</p>
            </div>
          </div>
        </section>

        <section className="landing__cta">
          <h2>Присоединяйтесь к нам</h2>
          <p>Миллионы людей уже используют наш мессенджер</p>
          <button className="landing__cta-button" onClick={handleGetStarted}>
            Начать сейчас
          </button>
        </section>
      </div>
    </>
  );
};

export default LandingPage;
