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

/** Back-navigation chevron used on auth screens. */
export const ChevronRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 6l6 6-6 6" />
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

/** Private perk icon group member: data-security highlight. */
const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l7 2.6v5.1c0 4.6-3 8.9-7 10.3-4-1.4-7-5.7-7-10.3V5.6L12 3z" />
    <path d="M9.2 12l2 2 3.6-3.8" />
  </svg>
);

/** Private perk icon group member: trend-charts highlight. */
const ChartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 21h18" />
    <path d="M4 17l4.5-5.5 3.5 3L19 7" />
  </svg>
);

/** Private perk icon group member: family-access highlight. */
const FamilyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9" cy="8" r="3.4" />
    <path d="M3.5 20v-1.2A4.8 4.8 0 0 1 8.3 14h1.4a4.8 4.8 0 0 1 4.8 4.8V20" />
    <path d="M16 4.6a3.4 3.4 0 0 1 0 6.8" />
    <path d="M18.5 14a4.8 4.8 0 0 1 3 4.4V20" />
  </svg>
);

/** Marketing highlights rendered as the brand panel perk list. */
const perks = [
  {
    icon: <ShieldIcon />,
    tone: 'green',
    title: 'امنیت داده‌ها',
    desc: 'احراز هویت امن JWT و سطوح دسترسی دقیق برای پرونده شما',
  },
  {
    icon: <ChartIcon />,
    tone: 'blue',
    title: 'نمودارهای روند',
    desc: 'پیگیری تغییرات هر آزمایش در طول زمان، در یک نگاه',
  },
  {
    icon: <FamilyIcon />,
    tone: 'teal',
    title: 'دسترسی خانوادگی',
    desc: 'مدیریت پرونده سلامت اعضای خانواده فقط با کد ملی',
  },
];

/**
 * Decorative brand sidebar for the Login/Register split layout:
 * logo, tagline and the three product-perk highlights above.
 *
 * Exported icons in this module (`UserIcon`, `LockIcon`, …) are shared
 * primitives consumed directly by those page components.
 *
 * @returns {JSX.Element} Brand aside element.
 */
const AuthBrand = () => (
  <aside className="auth-brand">
    <div className="auth-brand-holo" />
    <nav className="auth-brand-top">
      <Link to="/" className="auth-chip">
        <HomeIcon />
        بازگشت به صفحه اصلی
      </Link>
    </nav>

    <div className="auth-brand-body">
      <div className="auth-logo-lg"><PulseIcon /></div>
      <h1>سلامت‌یار</h1>
      <p className="auth-tagline">
        پرونده سلامت و نتایج آزمایش‌های پزشکی شما؛ یکجا، امن و همیشه در دسترس.
      </p>
      <ul className="auth-perks">
        {perks.map((perk) => (
          <li key={perk.title}>
            <span className={`auth-perk-icon auth-perk-${perk.tone}`}>{perk.icon}</span>
            <div>
              <strong>{perk.title}</strong>
              <span>{perk.desc}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>

    <p className="auth-brand-foot">© ۱۴۰۵ سلامت‌یار — مدیریت هوشمند سلامتی</p>
  </aside>
);

export default AuthBrand;
