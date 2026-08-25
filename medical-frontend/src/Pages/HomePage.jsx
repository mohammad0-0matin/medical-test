import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import './HomePage.css';

const LogoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12h4l2-5 4 10 2-5h6" />
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l7 2.6v5.1c0 4.6-3 8.9-7 10.3-4-1.4-7-5.7-7-10.3V5.6L12 3z" />
    <path d="M9.2 12l2 2 3.6-3.8" />
  </svg>
);

const ChartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 21h18" />
    <path d="M4 17l4.5-5.5 3.5 3L19 7" />
    <circle cx="19" cy="7" r="1.6" />
  </svg>
);

const FamilyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9" cy="8" r="3.4" />
    <path d="M3.5 20v-1.2A4.8 4.8 0 0 1 8.3 14h1.4a4.8 4.8 0 0 1 4.8 4.8V20" />
    <path d="M16 4.6a3.4 3.4 0 0 1 0 6.8" />
    <path d="M18.5 14a4.8 4.8 0 0 1 3 4.4V20" />
  </svg>
);

const features = [
  {
    icon: <ShieldIcon />,
    tone: 'green',
    title: 'امنیت داده‌ها',
    desc: 'اطلاعات شما با احراز هویت JWT و سطوح دسترسی دقیق محافظت می‌شود؛ فقط شما و افرادی که خودتان تأیید می‌کنید به پرونده سلامت دسترسی دارند.',
  },
  {
    icon: <ChartIcon />,
    tone: 'blue',
    title: 'نمودارهای روند سریع',
    desc: 'روند تغییرات هر آزمایش را با نمودارهای زنده و نمایش بازه نرمال ببینید و وضعیت سلامت خود را در یک نگاه بسنجید.',
  },
  {
    icon: <FamilyIcon />,
    tone: 'teal',
    title: 'دسترسی خانوادگی',
    desc: 'با کد ملی، اعضای خانواده را به پنل خود اضافه کنید و نتایج آزمایش فرزندان یا افراد تحت مراقبت را یکجا مدیریت کنید.',
  },
];

const HomePage = () => {
  return (
    <div className="hp">
      <header className="hp-nav">
        <div className="hp-container hp-nav-inner">
          <Link to="/" className="hp-brand">
            <span className="hp-logo"><LogoIcon /></span>
            <span>سلامت‌یار</span>
          </Link>
          <nav className="hp-nav-links">
            <a href="#features">ویژگی‌ها</a>
            <a href="#about">درباره سازنده</a>
            <a href="#contact">تماس با ما</a>
          </nav>
          <div className="hp-nav-actions">
            <ThemeToggle />
            <Link to="/login" className="hp-btn hp-btn-ghost">ورود</Link>
            <Link to="/register" className="hp-btn hp-btn-primary hp-btn-sm">ساخت حساب</Link>
          </div>
        </div>
      </header>

      <section className="hp-hero">
        <div className="hp-container hp-hero-inner">
          <span className="hp-badge">پلتفرم مدیریت پرونده سلامت</span>
          <h1>
            نتایج آزمایش‌های خود را{' '}
            <span className="hp-gradient-text">یکجا، امن و همیشه در دسترس</span>{' '}
            داشته باشید
          </h1>
          <p className="hp-subtitle">
            سلامت‌یار به شما کمک می‌کند نتایج آزمایش‌های پزشکی، روند تغییرات آن‌ها و
            پرونده سلامت خانواده را در یک داشبورد ساده، سریع و کاملاً امن مدیریت کنید.
          </p>
          <div className="hp-hero-actions">
            <Link to="/login" className="hp-btn hp-btn-primary hp-btn-lg">ورود به سیستم</Link>
            <Link to="/register" className="hp-btn hp-btn-outline hp-btn-lg">ساخت حساب کاربری</Link>
          </div>
          <ul className="hp-hero-trust">
            <li>ثبت‌نام رایگان</li>
            <li>احراز هویت امن JWT</li>
            <li>مناسب برای تمام اعضای خانواده</li>
          </ul>
        </div>
      </section>

      <section id="features" className="hp-features">
        <div className="hp-container">
          <div className="hp-section-head">
            <span className="hp-eyebrow">ویژگی‌ها</span>
            <h2>هر آنچه برای پیگیری سلامتی نیاز دارید</h2>
            <p className="hp-section-sub">
              ابزارهایی ساده اما قدرتمند برای ثبت، تحلیل و اشتراک‌گذاری اطلاعات پزشکی شما و عزیزانتان.
            </p>
          </div>
          <div className="hp-grid">
            {features.map((feature) => (
              <article key={feature.title} className={`hp-card hp-card-${feature.tone}`}>
                <span className="hp-card-icon">{feature.icon}</span>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="hp-footer">
        <div className="hp-container hp-footer-grid">
          <div className="hp-footer-col">
            <div className="hp-brand hp-brand-footer">
              <span className="hp-logo"><LogoIcon /></span>
              <span>سلامت‌یار</span>
            </div>
            <p>
              دستیار هوشمند مدیریت آزمایش‌های پزشکی؛ ساخته‌شده برای اینکه سلامتی شما
              همیشه سازمان‌یافته و در دسترس باشد.
            </p>
          </div>

          <div id="about" className="hp-footer-col">
            <h4>درباره سازنده</h4>
            <p>
              این پروژه با علاقه توسط <strong>ماتین</strong> طراحی و توسعه داده شده است؛
              توسعه‌دهنده فول‌استک متخصص در Django REST Framework و React.
            </p>
          </div>

          <div id="contact" className="hp-footer-col">
            <h4>تماس با ما</h4>
            <ul className="hp-contact-list">
              <li><a href="#">ایمیل</a></li>
              <li><a href="#">گیت‌هاب</a></li>
              <li><a href="#">لینکدین</a></li>
            </ul>
          </div>
        </div>
        <div className="hp-footer-bottom">
          © ۱۴۰۵ سلامت‌یار — تمامی حقوق محفوظ است.
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
