import { useRef } from 'react';
import './HealthCard.css';

const toFaDigits = (value) =>
  String(value).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

const formatNationalCode = (code) => {
  if (!code) return '—';
  const digits = String(code).replace(/\D/g, '');
  return digits.length === 10
    ? toFaDigits(digits.replace(/(\d{5})(\d{5})/, '$1 $2'))
    : toFaDigits(digits);
};

const QR_MATRIX = [
  '11100000111',
  '10110101101',
  '11100100111',
  '00011010010',
  '01000101110',
  '10101110001',
  '00010010101',
  '11001011000',
  '11100100110',
  '10111010011',
  '11100011100',
];

const MockQrCode = () => (
  <svg viewBox="0 0 33 33" shapeRendering="crispEdges" aria-hidden="true">
    {QR_MATRIX.map((row, y) =>
      row.split('').map((cell, x) =>
        cell === '1' ? (
          <rect key={`${x}-${y}`} x={x * 3} y={y * 3} width="3" height="3" fill="#0f172a" />
        ) : null
      )
    )}
  </svg>
);

const PulseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12h4l2-5 4 10 2-5h6" />
  </svg>
);

const HealthCard = ({ firstName, lastName, nationalCode }) => {
  const cardRef = useRef(null);
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    card.style.transform = `rotateX(${(0.5 - y) * 12}deg) rotateY(${(x - 0.5) * 16}deg)`;
    card.style.setProperty('--shine-x', `${x * 100}%`);
    card.style.setProperty('--shine-y', `${y * 100}%`);
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = 'rotateX(0deg) rotateY(0deg)';
  };

  return (
    <section className="hc-scene" aria-label="کارت سلامت دیجیتال">
      <div
        className="hc-card"
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="hc-holo" />
        <div className="hc-shine" />

        <header className="hc-top">
          <div className="hc-brand">
            <span className="hc-logo"><PulseIcon /></span>
            <span>کارت سلامت دیجیتال</span>
          </div>
          <span className="hc-pass-type">سلامت‌یار</span>
        </header>

        <div className="hc-body">
          <div className="hc-details">
            <h2 className="hc-name">{fullName || 'کاربر سلامت‌یار'}</h2>
            <p className="hc-role">دارنده پرونده سلامت</p>
            <dl className="hc-meta">
              <dt>کد ملی</dt>
              <dd>{formatNationalCode(nationalCode)}</dd>
            </dl>
          </div>

          <div className="hc-qr">
            <MockQrCode />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HealthCard;
