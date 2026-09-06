import './Footer.css';

/** Brand pulse icon rendered next to the footer logo. */
const PulseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12h4l2-5 4 10 2-5h6" />
  </svg>
);

/**
 * Global site footer: brand mark, placeholder navigation links and copyright.
 * Purely presentational — takes no props and holds no state.
 *
 * @returns {JSX.Element} Footer element.
 */
const Footer = () => (
  <footer className="ft">
    <div className="ft-inner">
      <div className="ft-brand">
        <span className="ft-logo"><PulseIcon /></span>
        <span>سلامت‌یار</span>
      </div>

      <nav className="ft-links" aria-label="پیوندهای پاورقی">
        <a href="https://t.me/mohammad0_0matin"target="_blank"
    rel="noopener noreferrer">آیدی پشتیبانی در تگلرام</a>
        <a href="https://eitaa.com/mohammad0_0matin" target="_blank"
    rel="noopener noreferrer">آیدی پشتیبانی در ایتا</a>
      </nav>

      <p className="ft-copy">© ۱۴۰۵ سلامت‌یار — تمامی حقوق محفوظ است.</p>
    </div>
  </footer>
);

export default Footer;
