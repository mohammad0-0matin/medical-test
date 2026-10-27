import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import './HomePage.css';

/** Brand pulse logo rendered in nav + hero + footer. */
const LogoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12h4l2-5 4 10 2-5h6" />
  </svg>
);

/** Icon: Security & data privacy. */
const ShieldCheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l7 2.6v5.1c0 4.6-3 8.9-7 10.3-4-1.4-7-5.7-7-10.3V5.6L12 3z" />
    <path d="M9.2 12l2 2 3.6-3.8" />
  </svg>
);

/** Icon: Trend charts. */
const TrendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 21h18" />
    <path d="M4 17l4.5-5.5 3.5 3L19 7" />
    <circle cx="19" cy="7" r="1.6" />
  </svg>
);

/** Icon: Prescription & medication. */
const PrescriptionIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M9 13h6" />
    <path d="M9 17h4" />
    <path d="M12 10v6" />
  </svg>
);

/** Icon: Emergency health pass. */
const EmergencyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M12 8v8" />
    <path d="M8 12h8" />
  </svg>
);

/** Icon: Doctor share & permissions. */
const ShareDoctorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

/** Arrow icon for links. */
const ArrowLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 12H5" />
    <path d="M12 19l-7-7 7-7" />
  </svg>
);

/** 4 Essential Pillars — Streamlined & patient-centric. */
const features = [
  {
    icon: <TrendIcon />,
    title: 'پایش نتایج انواع آزمایش‌ها',
    desc: 'ثبت و پیگیری دقیق آزمایش‌های خونی، بیوشیمی و هورمونی همراه با تشخیص فوری وضعیت طبیعی هر شاخص بدون سردرگمی.',
  },
  {
    icon: <PrescriptionIcon />,
    title: 'مدیریت داروها و نسخه‌های پزشک',
    desc: 'دسترسی همیشگی به دستور مصرف داروها و سوابق تجویزی برای جلوگیری از فراموشی مصرف یا تداخل دارویی.',
  },
  {
    icon: <EmergencyIcon />,
    title: 'شناسنامه و کارت سلامت هوشیار',
    desc: 'کارت دیجیتال شامل اطلاعات ضروری، گروه خونی، آلرژی‌ها و دسترسی اضطراری امن برای کادر درمان و اورژانس.',
  },
  {
    icon: <ShareDoctorIcon />,
    title: 'اشتراک‌گذاری امن با پزشک معالج',
    desc: 'ارائه سریع سوابق چکاپ‌ها هنگام ویزیت مطب، با این اطمینان که کنترل و لغو دسترسی‌ها ۱۰۰٪ در دست خودتان است.',
  },
];

/** 3-step simple workflow. */
const steps = [
  {
    num: '1',
    title: 'ایجاد حساب در 1 دقیقه',
    desc: 'ثبت‌نام سریع بدون نیاز به مدارک یا فرم‌های پیچیده.',
  },
  {
    num: '2',
    title: 'ثبت آزمایش یا نسخه',
    desc: 'وارد کردن آسان فاکتورهای آزمایشگاهی یا داروهای تجویزی.',
  },
  {
    num: '3',
    title: 'پایش و آرامش خاطر',
    desc: 'مشاهده منظم روند سلامت و همراه داشتن پرونده در هر زمان و مکان.',
  },
];

/** Trust stats (Latin digits 0-9). */
const stats = [
  { value: '100%', label: 'محرمانگی سوابق پزشکی' },
  { value: '0 تومان', label: 'استفاده رایگان برای بیماران' },
  { value: '1 دقیقه', label: 'زمان ساخت حساب و شروع کار' },
  { value: '24/7', label: 'دسترسی همیشگی از هر دستگاه' },
];

/**
 * Calm, streamlined, and uncluttered public landing page for Salamat Yar.
 *
 * Implements DESIGN.md Public Surface requirements:
 * - Generous whitespace, quiet surfaces, single primary accent.
 * - Minimal, peaceful preview card replacing noisy clinical mockup.
 * - Latin digits (0-9) throughout all text and statistics.
 * - Strict RTL logical properties and accessible contrast.
 *
 * @returns {JSX.Element} Landing page shell.
 */
const HomePage = () => {
  return (
    <div className="hp">
      {/* 1. Header Navigation */}
      <header className="hp-nav">
        <div className="hp-container hp-nav-inner">
          <Link to="/" className="hp-brand" aria-label="سلامت‌یار — صفحه اصلی">
            <span className="hp-logo">
              <LogoIcon />
            </span>
            <span className="hp-brand-name">سلامت‌یار</span>
          </Link>

          <nav className="hp-nav-links" aria-label="ناوبری اصلی">
            <a href="#features">امکانات</a>
            <a href="#workflow">نحوه استفاده</a>
            <a href="#security">امنیت و حریم خصوصی</a>
            <a href="#about">درباره سامانه</a>
          </nav>

          <div className="hp-nav-actions">
            <ThemeToggle />
            <Link to="/login" className="hp-btn hp-btn-ghost">ورود</Link>
            <Link to="/register" className="hp-btn hp-btn-primary hp-btn-sm">
              ثبت‌نام رایگان
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="hp-hero">
        <div className="hp-container hp-hero-inner">
          <div className="hp-hero-content">
            <div className="hp-badge">
              <span className="hp-badge-dot" />
              <span>سامانه هوشمند پرونده سلامت</span>
            </div>

            <h1 className="hp-hero-title">
              مدیریت هوشمند و آسان{' '}
              <span className="hp-hero-highlight">آزمایش‌های پزشکی شما</span>
            </h1>

            <p className="hp-hero-sub">
              سوابق انواع آزمایش‌ها، روند شاخص‌های بالینی و نسخه‌های دارویی خود و خانواده‌تان را در فضایی امن، خلوت و همیشه در دسترس داشته باشید.
            </p>

            <div className="hp-hero-actions">
              <Link to="/register" className="hp-btn hp-btn-primary hp-btn-lg">
                شروع رایگان در 1 دقیقه
                <span className="hp-btn-arrow"><ArrowLeftIcon /></span>
              </Link>
              <Link to="/login" className="hp-btn hp-btn-outline hp-btn-lg">
                ورود به حساب کاربری
              </Link>
            </div>
          </div>

          {/* Hero Minimal Preview Card */}
          <div className="hp-hero-visual" aria-hidden="true">
            <div className="hp-preview-card">
              <div className="hp-preview-header">
                <div className="hp-preview-title-row">
                  <span className="hp-preview-icon">🩺</span>
                  <div className="hp-preview-titles">
                    <strong>خلاصه پرونده سلامت</strong>
                    <span>وضعیت و سوابق جاری</span>
                  </div>
                </div>
                <span className="hp-preview-status-pill">
                  <span className="hp-preview-dot" />
                  فعال و معتبر
                </span>
              </div>

              <div className="hp-preview-items">
                <div className="hp-preview-row">
                  <div className="hp-preview-row-info">
                    <span className="hp-preview-row-label">آخرین آزمایش پزشکی</span>
                    <span className="hp-preview-row-sub">چکاپ فاکتورهای خونی — اردیبهشت 1404</span>
                  </div>
                  <span className="hp-preview-badge-success">نرمال ✓</span>
                </div>

                <div className="hp-preview-row">
                  <div className="hp-preview-row-info">
                    <span className="hp-preview-row-label">نسخه و داروی جاری</span>
                    <span className="hp-preview-row-sub">تجویز شده توسط پزشک معالج</span>
                  </div>
                  <span className="hp-preview-badge-neutral">1 نسخه فعال</span>
                </div>

                <div className="hp-preview-row">
                  <div className="hp-preview-row-info">
                    <span className="hp-preview-row-label">دسترسی اضطراری پزشک</span>
                    <span className="hp-preview-row-sub">کارت سلامت هوشیار و رمز موقت</span>
                  </div>
                  <span className="hp-preview-badge-teal">آماده صدور</span>
                </div>
              </div>

              <div className="hp-preview-footer">
                <div className="hp-preview-progress-label">
                  <span>پایش پیوسته فاکتورهای سلامت</span>
                  <span>100% منظم</span>
                </div>
                <div className="hp-preview-progress-track">
                  <div className="hp-preview-progress-bar" style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Quiet Stats Strip */}
      <section className="hp-stats-band">
        <div className="hp-container">
          <div className="hp-stats-grid">
            {stats.map((stat, i) => (
              <div key={i} className="hp-stat-card">
                <span className="hp-stat-num">{stat.value}</span>
                <span className="hp-stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Features Section (4 Clean Pillars) */}
      <section id="features" className="hp-features-section">
        <div className="hp-container">
          <div className="hp-section-head">
            <span className="hp-eyebrow">امکانات اصلی</span>
            <h2>ابزارهای مراقبت از سلامت در یک نگاه</h2>
            <p className="hp-section-sub">
              طراحی‌شده برای پایش آسان، دقیق و بدون پیچیدگی سوابق پزشکی شما و اعضای خانواده.
            </p>
          </div>

          <div className="hp-grid">
            {features.map((feature, idx) => (
              <article key={idx} className="hp-card">
                <div className="hp-card-icon-wrap">
                  {feature.icon}
                </div>
                <h3 className="hp-card-title">{feature.title}</h3>
                <p className="hp-card-desc">{feature.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Workflow Section (3 Simple Steps) */}
      <section id="workflow" className="hp-workflow-section">
        <div className="hp-container">
          <div className="hp-section-head">
            <span className="hp-eyebrow">استفاده آسان</span>
            <h2>در 3 گام ساده پرونده خود را منظم کنید</h2>
            <p className="hp-section-sub">
              شروع کار با سلامت‌یار سریع است و نیازی به دانش فنی خاصی ندارد.
            </p>
          </div>

          <div className="hp-steps-grid">
            {steps.map((step) => (
              <div key={step.num} className="hp-step-card">
                <div className="hp-step-num">{step.num}</div>
                <h3 className="hp-step-title">{step.title}</h3>
                <p className="hp-step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Security & Privacy Showcase */}
      <section id="security" className="hp-security-section">
        <div className="hp-container">
          <div className="hp-security-card">
            <div className="hp-security-icon-wrap">
              <ShieldCheckIcon />
            </div>
            <div className="hp-security-body">
              <span className="hp-eyebrow">امنیت و امانت‌داری</span>
              <h2>اطلاعات پزشکی شما؛ امن، محرمانه و محافظت‌شده</h2>
              <p>
                پرونده سلامت خصوصی‌ترین اطلاعات هر فرد است. سلامت‌یار با بهره‌گیری از رمزنگاری استاندارد تضمین می‌کند که داده‌های شما فقط و فقط برای خودتان و با اجازه صریح شما برای پزشک معالج قابل مشاهده باشد. کنترل صدور و لغو دسترسی‌ها همواره در اختیار شماست.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Final Call to Action */}
      <section className="hp-cta-section">
        <div className="hp-container">
          <div className="hp-cta-card">
            <h2>پرونده سلامت خود را همیشه همراه داشته باشید</h2>
            <p>
              همین حالا در کمتر از 1 دقیقه حساب رایگان بسازید و آزمایش‌ها و نسخه‌های دارویی‌تان را منظم کنید.
            </p>
            <div className="hp-cta-actions">
              <Link to="/register" className="hp-btn hp-btn-primary hp-btn-lg">
                ساخت حساب کاربری رایگان
              </Link>
              <Link to="/login" className="hp-btn hp-btn-outline hp-btn-lg">
                ورود به حساب کاربری
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="hp-footer">
        <div className="hp-container hp-footer-grid">
          <div className="hp-footer-col hp-footer-col-main">
            <div className="hp-brand hp-brand-footer">
              <span className="hp-logo">
                <LogoIcon />
              </span>
              <span className="hp-brand-name">سلامت‌یار</span>
            </div>
            <p className="hp-footer-about">
              دستیار همراه شما در مدیریت آزمایش‌های پزشکی و پرونده سلامت؛ ساخته‌شده برای پایش آسان، آرامش خاطر بیماران و ارتباط بهتر با پزشکان معالج.
            </p>
          </div>

          <div className="hp-footer-col">
            <h4>دسترسی سریع</h4>
            <ul className="hp-footer-links">
              <li><a href="#features">امکانات سامانه</a></li>
              <li><a href="#workflow">نحوه استفاده</a></li>
              <li><a href="#security">امنیت و حریم خصوصی</a></li>
              <li><Link to="/login">ورود به حساب</Link></li>
            </ul>
          </div>

          <div id="about" className="hp-footer-col">
            <h4>درباره توسعه‌دهنده</h4>
            <p className="hp-footer-dev">
              طراحی و توسعه‌یافته با تمرکز بر سادگی، دسترس‌پذیری و استانداردهای سلامت الکترونیک توسط{' '}
              <strong>mohammad0_0matin</strong>.
            </p>
            <div id="contact" className="hp-footer-contact">
              <a href="mailto:mohammadmatinbadfar@gmail.com" className="hp-contact-link">
                ایمیل پشتیبانی
              </a>
              <span className="hp-dot-sep">•</span>
              <a href="https://github.com/mohammad0-0matin" target="_blank" rel="noopener noreferrer" className="hp-contact-link">
                گیت‌هاب
              </a>
              <span className="hp-dot-sep">•</span>
              <a href="https://www.linkedin.com/in/mohammad-matin-07b01531a?utm_source=share_via&utm_content=profile&utm_medium=member_android" target="_blank" rel="noopener noreferrer" className="hp-contact-link">
                لینکدین
              </a>
            </div>
          </div>
        </div>

        <div className="hp-footer-bottom">
          <div className="hp-container hp-footer-bottom-inner">
            <span>© 2026 سلامت‌یار — تمامی حقوق محفوظ است.</span>
            <span>طراحی بر اساس اصول دسترس‌پذیری و حفظ حریم خصوصی سلامت</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
