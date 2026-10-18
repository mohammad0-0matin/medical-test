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

/** Icon: Family health records. */
const FamilyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9" cy="8" r="3.4" />
    <path d="M3.5 20v-1.2A4.8 4.8 0 0 1 8.3 14h1.4a4.8 4.8 0 0 1 4.8 4.8V20" />
    <path d="M16 4.6a3.4 3.4 0 0 1 0 6.8" />
    <path d="M18.5 14a4.8 4.8 0 0 1 3 4.4V20" />
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

/** Check icon. */
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/** Features catalog with friendly, patient-centric copy. */
const features = [
  {
    icon: <TrendIcon />,
    title: 'تشخیص سریع وضعیت نرمال فاکتورها',
    desc: 'مشاهده فوری وضعیت هر فاکتور آزمایشگاهی با رنگ‌های مشخص و مقایسه دقیق با بازه استاندارد آزمایشگاه، بدون سردرگمی بین برگه‌های متعدد.',
  },
  {
    icon: <TrendIcon />,
    title: 'نمودار روند انواع آزمایش‌ها در طول زمان',
    desc: 'ثبت و پیگیری جامع انواع آزمایش‌های خون، بیوشیمی، هورمونی، تیروئید و فاکتورهای تخصصی، با امکان مقایسه روند شاخص‌ها با دوره‌های گذشته.',
  },
  {
    icon: <PrescriptionIcon />,
    title: 'مدیریت داروها و نسخه‌های پزشک',
    desc: 'تمام نسخه‌ها، دستور مصرف و ساعات داروها را در گوشی خود داشته باشید و دیگر نگران گم شدن برگه نسخه یا فراموشی مصرف داروها نباشید.',
  },
  {
    icon: <FamilyIcon />,
    title: 'پرونده سلامت تمام اعضای خانواده',
    desc: 'با یک حساب کاربری، سوابق آزمایش‌های فرزندان و والدین سالمند خود را به تفکیک ثبت و مدیریت کنید تا مراقبت از سلامت عزیزانتان آسان‌تر شود.',
  },
  {
    icon: <EmergencyIcon />,
    title: 'کارت سلامت اضطراری (Emergency Pass)',
    desc: 'در شرایط حساس اورژانسی، گروه خونی، آلرژی‌های دارویی و بیماری‌های خاص خود را در قالب یک کارت دیجیتال سریع به پزشک یا اورژانس نشان دهید.',
  },
  {
    icon: <ShareDoctorIcon />,
    title: 'اشتراک‌گذاری امن با پزشک معالج',
    desc: 'هنگام ویزیت، تمام سوابق چکاپ‌ها و آزمایش‌های پیشین را در چند ثانیه به پزشک نشان دهید، با این اطمینان که کنترل دسترسی‌ها ۱۰۰٪ در دست خودتان است.',
  },
];

/** 3-step simple workflow. */
const steps = [
  {
    num: '1',
    title: 'ثبت‌نام سریع در 1 دقیقه',
    desc: 'بدون معطلی یا نیاز به مدارک پیچیده، فقط با یک نام کاربری حساب کاربری رایگان خود را بسازید.',
  },
  {
    num: '2',
    title: 'ثبت آزمایش یا نسخه دارویی',
    desc: 'اعداد برگه آزمایش یا نسخه پزشک را وارد کنید؛ سامانه خودکار نمودارها و وضعیت نرمال را استخراج می‌کند.',
  },
  {
    num: '3',
    title: 'پایش آسان و آرامش خاطر',
    desc: 'روند سلامت خود را با نمودارهای شفاف دنبال کنید و سوابق را همیشه در مطب یا منزل همراه داشته باشید.',
  },
];

/** Trust stats (Latin digits 0-9). */
const stats = [
  { value: '100%', label: 'محرمانگی و امانت‌داری سوابق پزشکی' },
  { value: '0', label: 'تومان هزینه — استفاده برای همیشه رایگان است' },
  { value: '1', label: 'دقیقه زمان لازم برای ساخت حساب و شروع کار' },
  { value: '24/7', label: 'دسترسی همیشگی از هر کجا با موبایل یا کامپیوتر' },
];

/**
 * Modern, calm, engaging public landing page for Salamat Yar.
 *
 * Implements DESIGN.md Public Surface requirements:
 * - Clear, persuasive, non-academic patient-friendly Iranian Persian copywriting.
 * - 16-18px body text, 48px control heights (h-12).
 * - Alternating white and muted bands.
 * - Single primary accent (Teal / var(--primary)), soft bg-primary/5 decoration only.
 * - Latin digits (0-9) throughout all text, dates and statistics.
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
            <a href="#about">درباره ما</a>
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
              <span>دستیار هوشمند و آسان پرونده سلامت</span>
            </div>

            <h1 className="hp-hero-title">
              آزمایش‌های پزشکی شما،{' '}
              <span className="hp-hero-highlight">یکجا، منظم و همیشه در دسترس</span>
            </h1>

            <p className="hp-hero-sub">
              دیگر نگران گم شدن برگه‌های آزمایش یا فراموشی روند درمان نباشید. نتایج انواع آزمایش‌های
              پزشکی، روند تغییرات فاکتورهای سلامت و نسخه‌های دارویی خود و خانواده‌تان را به سادگی یکجا مدیریت کنید.
            </p>

            <div className="hp-hero-actions">
              <Link to="/register" className="hp-btn hp-btn-primary hp-btn-lg">
                شروع رایگان در 1 دقیقه
                <span className="hp-btn-arrow"><ArrowLeftIcon /></span>
              </Link>
              <a href="#features" className="hp-btn hp-btn-outline hp-btn-lg">
                آشنایی با امکانات
              </a>
            </div>

            <ul className="hp-trust-list">
              <li>
                <span className="hp-trust-icon"><CheckIcon /></span>
                <span>کاملاً رایگان برای بیماران</span>
              </li>
              <li>
                <span className="hp-trust-icon"><CheckIcon /></span>
                <span>ثبت‌نام سریع بدون فرم‌های پیچیده</span>
              </li>
              <li>
                <span className="hp-trust-icon"><CheckIcon /></span>
                <span>امنیت و محرمانگی ۱۰۰٪ داده‌ها</span>
              </li>
            </ul>
          </div>

          {/* Hero Clinical Mockup Preview */}
          <div className="hp-hero-visual" aria-hidden="true">
            <div className="hp-mockup-card">
              <div className="hp-mockup-header">
                <div className="hp-mockup-badge">
                  <span className="hp-mockup-status-dot" />
                  <span>برگه آزمایش چکاپ دوره‌ای (خون و بیوشیمی)</span>
                </div>
                <span className="hp-mockup-date">24 اردیبهشت 1404</span>
              </div>

              <div className="hp-mockup-doctor">
                <span className="hp-mockup-doc-avatar">د.ر</span>
                <div>
                  <strong>دکتر مریم رضایی</strong>
                  <span>متخصص داخلی — بررسی دوره سه‌ماهه</span>
                </div>
              </div>

              <div className="hp-mockup-metrics">
                <div className="hp-metric-row">
                  <div className="hp-metric-info">
                    <span className="hp-metric-name">قند خون ناشتا (FBS)</span>
                    <span className="hp-metric-range">بازه طبیعی: 70 تا 99 mg/dL</span>
                  </div>
                  <div className="hp-metric-val-wrap">
                    <span className="hp-metric-value">94</span>
                    <span className="hp-status-pill hp-status-normal">عالی و طبیعی ✓</span>
                  </div>
                </div>

                <div className="hp-metric-row">
                  <div className="hp-metric-info">
                    <span className="hp-metric-name">چربی خون (Cholesterol)</span>
                    <span className="hp-metric-range">بازه طبیعی: کمتر از 200 mg/dL</span>
                  </div>
                  <div className="hp-metric-val-wrap">
                    <span className="hp-metric-value">182</span>
                    <span className="hp-status-pill hp-status-normal">طبیعی ✓</span>
                  </div>
                </div>

                <div className="hp-metric-row hp-metric-row-warn">
                  <div className="hp-metric-info">
                    <span className="hp-metric-name">ویتامین د (Vitamin D)</span>
                    <span className="hp-metric-range">بازه طبیعی: 30 تا 100 ng/mL</span>
                  </div>
                  <div className="hp-metric-val-wrap">
                    <span className="hp-metric-value">21</span>
                    <span className="hp-status-pill hp-status-warn">نیاز به توجه ⚠️</span>
                  </div>
                </div>
              </div>

              <div className="hp-mockup-footer">
                <span className="hp-mockup-pill-subtle">
                  📈 تحلیل هوشمند: شاخص‌های متابولیک و فاکتورهای عمومی در وضعیت بهینه قرار دارند؛ برای کمبود ویتامین D مکمل تجویزی فعال است.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Stats Strip */}
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

      {/* 4. Features Section (Muted Band) */}
      <section id="features" className="hp-features-section">
        <div className="hp-container">
          <div className="hp-section-head">
            <span className="hp-eyebrow">چرا سلامت‌یار؟</span>
            <h2>تمام ابزارهای مراقبت از سلامتی در یک محیط ساده</h2>
            <p className="hp-section-sub">
              طراحی‌شده برای اینکه هر کسی با هر سن و مهارتی بتواند به راحتی از وضعیت سلامتی خود باخبر شود.
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

      {/* 5. Workflow Section (White Band) */}
      <section id="workflow" className="hp-workflow-section">
        <div className="hp-container">
          <div className="hp-section-head">
            <span className="hp-eyebrow">استفاده آسان</span>
            <h2>در ۳ گام ساده، پرونده پزشکی خود را منظم کنید</h2>
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

      {/* 6. Security & Privacy Showcase (Muted Band) */}
      <section id="security" className="hp-security-section">
        <div className="hp-container">
          <div className="hp-security-box">
            <div className="hp-security-text">
              <span className="hp-eyebrow">امنیت و امانت‌داری</span>
              <h2>اطلاعات پزشکی شما؛ امن، محرمانه و محافظت‌شده</h2>
              <p>
                پرونده سلامت خصوصی‌ترین اطلاعات هر فرد است. سلامت‌یار با بهره‌گیری از
                رمزنگاری استاندارد و تفکیک دقیق دسترسی‌ها تضمین می‌کند که داده‌های شما
                فقط و فقط برای خودتان و افراد مورد اعتمادتان قابل مشاهده باشد.
              </p>
              <ul className="hp-security-list">
                <li>هیچ داده‌ای بدون اجازه صریح شما به اشتراک گذاشته نمی‌شود.</li>
                <li>هر زمان اراده کنید، دسترسی پزشک یا اطرافیان را با یک کلیک لغو می‌کنید.</li>
                <li>تمامی اطلاعات با استانداردهای رسمی پرونده الکترونیک سلامت محافظت می‌شوند.</li>
              </ul>
            </div>
            <div className="hp-security-badge-col">
              <div className="hp-security-shield">
                <ShieldCheckIcon />
                <strong>حفظ ۱۰۰٪ حریم خصوصی</strong>
                <span>مطابق با اصول امنیت پرونده سلامت</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Final Call to Action */}
      <section className="hp-cta-section">
        <div className="hp-container">
          <div className="hp-cta-card">
            <h2>آماده‌اید پرونده سلامت خود را همیشه همراه داشته باشید؟</h2>
            <p>
              همین حالا در کمتر از 1 دقیقه به سلامت‌یار بپیوندید و سوابق آزمایشگاهی و دارویی خود را مرتب و مطمئن نگه دارید.
            </p>
            <div className="hp-cta-actions">
              <Link to="/register" className="hp-btn hp-btn-primary hp-btn-lg">
                ساخت رایگان حساب کاربری
              </Link>
              <Link to="/login" className="hp-btn hp-btn-ghost-cta hp-btn-lg">
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
              دستیار هوشمند و همراه شما در مدیریت آزمایش‌های پزشکی و پرونده سلامت؛ ساخته‌شده برای پایش آسان، آرامش خاطر بیماران و ارتباط بهتر با پزشکان معالج.
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
