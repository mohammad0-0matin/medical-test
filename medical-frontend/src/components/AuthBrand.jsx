import { Link } from 'react-router-dom';

/** Brand pulse logo icon shared by Login/Register brand panel. */
export const PulseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12h4l2-5 4 10 2-5h6" />
  </svg>
);

/** Username field icon for auth forms. */
export const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="3.6" />
    <path d="M5 20v-.8A5.2 5.2 0 0 1 10.2 14h3.6a5.2 5.2 0 0 1 5.2 5.2V20" />
  </svg>
);

/** Password field icon for auth forms. */
export const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    <circle cx="12" cy="15.2" r="1.3" />
  </svg>
);

/** Show-password toggle glyph. */
export const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

/** Hide-password toggle glyph. */
export const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10.6 6c.46-.08.93-.13 1.4-.13 6 0 9.5 6.13 9.5 6.13a17.6 17.6 0 0 1-2.3 3.05" />
    <path d="M6.4 6.9A17.2 17.2 0 0 0 2.5 12S6 18.13 12 18.13c1.66 0 3.1-.5 4.3-1.23" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path d="M4 4l16 16" />
  </svg>
);

/** Back-navigation chevron used on auth screens (pointing start/back in RTL). */
export const ChevronRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

/** Return-to-home icon inside the brand panel nav chip. */
export const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 11l8-7 8 7" />
    <path d="M6 9.5V20h12V9.5" />
  </svg>
);

/** Data security perk icon. */
const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l7 2.6v5.1c0 4.6-3 8.9-7 10.3-4-1.4-7-5.7-7-10.3V5.6L12 3z" />
    <path d="M9.2 12l2 2 3.6-3.8" />
  </svg>
);

/** Trend chart perk icon. */
const ChartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 21h18" />
    <path d="M4 17l4.5-5.5 3.5 3L19 7" />
    <circle cx="19" cy="7" r="1.6" />
  </svg>
);

/** Family health record perk icon. */
const FamilyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9" cy="8" r="3.4" />
    <path d="M3.5 20v-1.2A4.8 4.8 0 0 1 8.3 14h1.4a4.8 4.8 0 0 1 4.8 4.8V20" />
    <path d="M16 4.6a3.4 3.4 0 0 1 0 6.8" />
    <path d="M18.5 14a4.8 4.8 0 0 1 3 4.4V20" />
  </svg>
);

/** Trust highlights rendered inside the brand panel. */
const perks = [
  {
    icon: <ShieldIcon />,
    title: 'امنیت و محرمانگی داده‌ها',
    desc: 'احراز هویت استاندارد JWT و حفاظت سخت‌گیرانه از اطلاعات پرونده پزشکی شما.',
  },
  {
    icon: <ChartIcon />,
    title: 'پایش مستمر و نمودار روند',
    desc: 'پیگیری تغییرات فاکتورهای آزمایشگاهی در گذر زمان با هشدارهای بازه نرمال.',
  },
  {
    icon: <FamilyIcon />,
    title: 'پرونده سلامت خانواده',
    desc: 'مدیریت متمرکز نتایج آزمایش‌های فرزندان و اعضای خانواده در یک داشبورد امن.',
  },
];

/**
 * Calm, professional medical brand sidebar for Login & Register screens.
 * Conforms strictly to DESIGN.md patient surface guidelines:
 * - Single primary teal accent.
 * - Quiet, trustworthy surfaces (no spinning halos or harsh gradients).
 * - Latin digits (0-9) everywhere.
 *
 * @returns {JSX.Element} Brand aside element.
 */
const AuthBrand = () => (
  <aside className="auth-brand">
    <nav className="auth-brand-top">
      <Link to="/" className="auth-chip" aria-label="بازگشت به صفحه اصلی سلامت‌یار">
        <HomeIcon />
        <span>بازگشت به صفحه اصلی</span>
      </Link>
    </nav>

    <div className="auth-brand-body">
      <div className="auth-logo-lg">
        <PulseIcon />
      </div>
      <h1 className="auth-brand-title">سلامت‌یار</h1>
      <p className="auth-tagline">
        پرونده سلامت و آزمایش‌های پزشکی شما؛ دقیق، محرمانه و همیشه در دسترس.
      </p>

      <ul className="auth-perks">
        {perks.map((perk) => (
          <li key={perk.title}>
            <span className="auth-perk-icon">
              {perk.icon}
            </span>
            <div className="auth-perk-text">
              <strong>{perk.title}</strong>
              <span>{perk.desc}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>

    <div className="auth-brand-foot">
      <span>© 2026 سلامت‌یار — دستیار هوشمند پرونده سلامت الکترونیک</span>
    </div>
  </aside>
);

export default AuthBrand;
