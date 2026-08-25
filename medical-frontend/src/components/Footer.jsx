import './Footer.css';

const PulseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12h4l2-5 4 10 2-5h6" />
  </svg>
);

const Footer = () => (
  <footer className="ft">
    <div className="ft-inner">
      <div className="ft-brand">
        <span className="ft-logo"><PulseIcon /></span>
        <span>سلامت‌یار</span>
      </div>

      <nav className="ft-links" aria-label="پیوندهای پاورقی">
        <a href="#">درباره ما</a>
        <a href="#">حریم خصوصی</a>
        <a href="#">پشتیبانی</a>
      </nav>

      <p className="ft-copy">© ۱۴۰۵ سلامت‌یار — تمامی حقوق محفوظ است.</p>
    </div>
  </footer>
);

export default Footer;
