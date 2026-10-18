import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import MedicalRoleBadge from './MedicalRoleBadge';
import './HealthCard.css';

/**
 * Format a national ID with Latin digits and group spacing.
 * Masked mode hides the last 5 digits for privacy compliance (DESIGN.md Sec. 10).
 *
 * @param {string|number} code - Raw national code.
 * @param {boolean} isMasked - Whether to mask the trailing digits.
 * @returns {string} Formatted code string with Latin tabular digits.
 */
const formatNationalCode = (code, isMasked = true) => {
  if (!code) return '—';
  const digits = String(code).replace(/\D/g, '');
  if (digits.length !== 10) return digits;
  if (isMasked) {
    return `${digits.slice(0, 5)} •••••`;
  }
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
};

/** Eye icon for revealing masked national code. */
const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

/** Eye-off icon for hiding revealed national code. */
const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-6.5 0-10-7-10-7a19.5 19.5 0 0 1 4.07-5.06M9.9 4.24A9.12 9.12 0 0 1 12 5c6.5 0 10 7 10 7a19.5 19.5 0 0 1-2.92 4.19" />
    <path d="M1 1l22 22" />
    <path d="M14.12 14.12a3 3 0 0 1-4.24-4.24" />
  </svg>
);

/** Card brand pulse icon in the health-card header. */
const PulseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12h4l2-5 4 10 2-5h6" />
  </svg>
);

/** Stethoscope icon for medical doctor role. */
const DoctorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4.5 3v6a5 5 0 0 0 10 0V3" />
    <path d="M9.5 14v1.5a4.5 4.5 0 0 0 9 0v-2.2" />
    <circle cx="19.6" cy="10.8" r="2" />
    <path d="M4.5 3h-1M13.5 3h-1" />
  </svg>
);

/** Hospital cross icon for clinical staff role. */
const StaffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16" />
    <path d="M12 7v6M9 10h6" />
    <path d="M3 21h18" />
  </svg>
);

/** Realistic metallic EMV smart chip with authentic contact pads and contactless NFC wave. */
const EmvChip = () => (
  <div className="hc-chip-cluster" aria-hidden="true">
    <svg className="hc-emv-chip" viewBox="0 0 46 34" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hc-chip-gold" x1="0" y1="0" x2="46" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f7d070" />
          <stop offset="30%" stopColor="#e5b84c" />
          <stop offset="55%" stopColor="#ffd885" />
          <stop offset="78%" stopColor="#cfa038" />
          <stop offset="100%" stopColor="#eed06f" />
        </linearGradient>
        <linearGradient id="hc-chip-lines" x1="0" y1="0" x2="0" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7a550d" />
          <stop offset="100%" stopColor="#4a3304" />
        </linearGradient>
      </defs>
      {/* Outer metallic plate */}
      <rect x="0.5" y="0.5" width="45" height="33" rx="6" fill="url(#hc-chip-gold)" stroke="#c69528" strokeWidth="1" />
      {/* Engraved outer circuit margin */}
      <rect x="5.5" y="4.5" width="35" height="25" rx="3.5" fill="none" stroke="url(#hc-chip-lines)" strokeWidth="0.8" opacity="0.65" />
      {/* Precision contact channels */}
      <path d="M5.5 12h11.5v10H5.5M40.5 12H29v10h11.5" stroke="url(#hc-chip-lines)" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M17 12V4.5M29 12V4.5M17 22v7.5M29 22v7.5" stroke="url(#hc-chip-lines)" strokeWidth="0.9" strokeLinecap="round" />
      <rect x="19" y="10" width="8" height="14" rx="2" fill="none" stroke="url(#hc-chip-lines)" strokeWidth="0.9" />
    </svg>

    <div className="hc-nfc-symbol" title="ارتباط هوشمند بدون تماس (NFC)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" aria-hidden="true">
        <path d="M8 15.5a4.8 4.8 0 0 1 0-7" />
        <path d="M11.5 18a8.5 8.5 0 0 1 0-12" />
        <path d="M15 20.5a12 12 0 0 1 0-17" />
      </svg>
    </div>
  </div>
);

/**
 * Dynamic Holographic Security Seal with cursor-responsive refraction angle,
 * Caduceus emblem, micro-security ring, and reflective prismatic flare.
 */
const HolographicSeal = () => (
  <div className="hc-holo-seal" aria-label="نشان امنیتی هولوگرام اصالت سلامت‌یار" role="img">
    <div className="hc-holo-disc" />
    <div className="hc-holo-glare" />
    <svg className="hc-holo-svg" viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <defs>
        <path id="hc-seal-text-path" d="M 26, 26 m -20, 0 a 20,20 0 1,1 40,0 a 20,20 0 1,1 -40,0" />
      </defs>
      {/* Security dashed edge */}
      <circle cx="26" cy="26" r="24.5" stroke="currentColor" strokeWidth="0.9" strokeDasharray="1.8 1.4" opacity="0.75" />
      <circle cx="26" cy="26" r="21.5" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
      {/* Perimeter micro-lettering */}
      <text className="hc-seal-text" fontSize="3.3" fontWeight="700" letterSpacing="0.4" fill="currentColor">
        <textPath href="#hc-seal-text-path" startOffset="0%">
          SALAMAT YAR • DIGITAL HEALTH ID • سامانه سلامت‌یار •
        </textPath>
      </text>
      {/* Inner security ring */}
      <circle cx="26" cy="26" r="13" stroke="currentColor" strokeWidth="0.8" opacity="0.8" />
      {/* Central Caduceus / Rod of Asclepius & health heartbeat pulse */}
      <path d="M26 16v20M23 17h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M24 19.5c2.6-0.3 3.8 1.6 1.8 3.4s-3.6 2-1 3.8 4.2 1.6 2 3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="26" cy="15" r="1.3" fill="currentColor" />
    </svg>
  </div>
);

/** Fine guilloche geometric security watermark pattern. */
const SecurityWatermark = () => (
  <svg className="hc-watermark" viewBox="0 0 400 240" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <pattern id="hc-guilloche-pat" width="44" height="44" patternUnits="userSpaceOnUse">
        <path d="M0 22 Q 11 6, 22 22 T 44 22" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.35" />
        <path d="M0 22 Q 11 38, 22 22 T 44 22" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.35" />
        <circle cx="22" cy="22" r="15" fill="none" stroke="currentColor" strokeWidth="0.35" opacity="0.25" />
        <circle cx="22" cy="22" r="7" fill="none" stroke="currentColor" strokeWidth="0.35" opacity="0.2" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#hc-guilloche-pat)" />
  </svg>
);

const INSURANCE_LABELS = {
  tamin: 'تأمین اجتماعی',
  salamat: 'بیمه سلامت ایرانیان',
  mosahlar: 'خدمات درمانی نیروهای مسلح',
  other: 'بیمه پایه',
  none: '',
};

/**
 * Enhanced Digital Health Card with physical smart-card realism:
 * - Metallic EMV Smart Chip & Contactless NFC wave
 * - Dynamic cursor-reactive Holographic Security Seal
 * - Themed role variants (Patient / Doctor / Staff)
 * - Deep glassmorphism texture & specular dynamic border glow
 * - Privacy-safe masked national code with Latin tabular-digits and reveal toggle
 *
 * @param {object} props
 * @param {string} [props.firstName] - Patient/User first name.
 * @param {string} [props.lastName] - Patient/User last name.
 * @param {string} [props.nationalCode] - National code.
 * @param {string} [props.insuranceProvider='none'] - Base insurance provider.
 * @param {string} [props.medicalRole='standard'] - Role ('standard' | 'doctor' | 'staff').
 * @param {string} [props.medicalId=''] - Medical ID or staff registration number.
 */
const HealthCard = ({
  firstName,
  lastName,
  nationalCode,
  insuranceProvider = 'none',
  medicalRole = 'standard',
  medicalId = '',
  onOpenEmergencyPass,
}) => {
  const cardRef = useRef(null);
  const [isCodeRevealed, setIsCodeRevealed] = useState(false);
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

  // Role-specific definitions and color-coding
  const isDoctor = medicalRole === 'doctor';
  const isStaff = medicalRole === 'staff';

  let roleClass = 'hc-theme-standard';
  let cardTitle = 'کارت سلامت هوشمند';
  let roleTagLabel = 'سلامت‌یار';
  let roleIcon = <PulseIcon />;

  if (isDoctor) {
    roleClass = 'hc-theme-doctor';
    cardTitle = 'کارت هویت نظام پزشکی';
    roleTagLabel = 'پزشک معالج';
    roleIcon = <DoctorIcon />;
  } else if (isStaff) {
    roleClass = 'hc-theme-staff';
    cardTitle = 'کارت شناسایی کادر درمان';
    roleTagLabel = 'کادر درمان';
    roleIcon = <StaffIcon />;
  }

  const insuranceLabel = INSURANCE_LABELS[insuranceProvider] || '';

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Smooth bounded 3D tilt
    card.style.transform = `rotateX(${(0.5 - y) * 9}deg) rotateY(${(x - 0.5) * 13}deg)`;
    card.style.setProperty('--shine-x', `${(x * 100).toFixed(1)}%`);
    card.style.setProperty('--shine-y', `${(y * 100).toFixed(1)}%`);

    // Holographic diffraction angle computed from cursor relative to card center
    const dx = x - 0.5;
    const dy = y - 0.5;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 180;
    card.style.setProperty('--holo-angle', `${angle.toFixed(1)}deg`);
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = 'rotateX(0deg) rotateY(0deg)';
    card.style.setProperty('--holo-angle', '0deg');
  };

  // QR value payload for verification
  const qrPayload = nationalCode
    ? `salamatyar://identity/${encodeURIComponent(nationalCode)}`
    : 'https://salamatyar.ir/health-id';

  return (
    <section className="hc-scene" aria-label={cardTitle}>
      <div
        className={`hc-card ${roleClass}`}
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Dynamic lighting and security textures */}
        <div className="hc-role-ribbon" aria-hidden="true" />
        <div className="hc-border-glow" aria-hidden="true" />
        <div className="hc-shine" aria-hidden="true" />
        <SecurityWatermark />

        {/* Card Header */}
        <header className="hc-top">
          <div className="hc-brand">
            <span className="hc-logo">{roleIcon}</span>
            <div className="hc-brand-text">
              <span className="hc-app-title">{cardTitle}</span>
              <span className="hc-app-sub">سامانه جامع سلامت‌یار</span>
            </div>
          </div>

          <div className="hc-top-actions">
            <span className="hc-pass-type">
              {roleTagLabel}
            </span>
          </div>
        </header>

        {/* Smart Chip & Hologram Tier */}
        <div className="hc-hardware-tier">
          <EmvChip />
          <HolographicSeal />
        </div>

        {/* Card Body: Identity, Badges, and QR */}
        <div className="hc-body">
          <div className="hc-details">
            <h2 className="hc-name">{fullName || 'کاربر سلامت‌یار'}</h2>

            <div className="hc-badges-row">
              {medicalRole && medicalRole !== 'standard' ? (
                <MedicalRoleBadge role={medicalRole} id={medicalId} size="lg" />
              ) : null}

              {insuranceLabel ? (
                <span className="hc-insurance-badge" title="بیمه پایه سلامت">
                  🛡️ {insuranceLabel}
                </span>
              ) : null}

              {!isDoctor && !isStaff && !insuranceLabel ? (
                <span className="hc-status-pill">
                  ✓ پرونده سلامت فعال
                </span>
              ) : null}
            </div>

            {isDoctor && medicalId ? (
              <dl className="hc-meta hc-meta-medical-id">
                <dt>شماره نظام پزشکی</dt>
                <dd className="hc-code-val" dir="ltr">{medicalId}</dd>
              </dl>
            ) : null}

            <dl className="hc-meta">
              <dt>کد ملی</dt>
              <dd className="hc-code-val" dir="ltr">
                <span className="hc-national-digits">
                  {formatNationalCode(nationalCode, !isCodeRevealed)}
                </span>
                {nationalCode ? (
                  <button
                    type="button"
                    className="hc-mask-btn"
                    onClick={() => setIsCodeRevealed((prev) => !prev)}
                    aria-label={isCodeRevealed ? 'مخفی‌سازی کد ملی' : 'نمایش کد ملی'}
                    title={isCodeRevealed ? 'مخفی‌سازی کد ملی' : 'نمایش کد ملی'}
                  >
                    {isCodeRevealed ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                ) : null}
              </dd>
            </dl>
          </div>

          <div
            className={`hc-qr ${onOpenEmergencyPass ? 'hc-qr-clickable' : ''}`}
            onClick={onOpenEmergencyPass}
            role={onOpenEmergencyPass ? 'button' : undefined}
            tabIndex={onOpenEmergencyPass ? 0 : undefined}
            onKeyDown={onOpenEmergencyPass ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenEmergencyPass(); } } : undefined}
            title={onOpenEmergencyPass ? '⚡ صدور دسترسی اضطراری پزشک (رمز موقت و QR)' : 'کد اصالت هوشمند سلامت'}
          >
            <QRCodeSVG
              value={qrPayload}
              size={68}
              level="M"
              fgColor="#0f172a"
              bgColor="#ffffff"
            />
            <span className="hc-qr-label">
              {onOpenEmergencyPass ? '⚡ دسترسی پزشک' : 'تأیید اصالت'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HealthCard;
