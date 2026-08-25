import './MedicalRoleBadge.css';

const toFaDigits = (value) =>
  String(value ?? '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

const StethoscopeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4.5 3v6a5 5 0 0 0 10 0V3" />
    <path d="M9.5 14v1.5a4.5 4.5 0 0 0 9 0v-2.2" />
    <circle cx="19.6" cy="10.8" r="2" />
    <path d="M4.5 3h-1M13.5 3h-1" />
  </svg>
);

const HospitalIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4.5 21V7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v14" />
    <path d="M12 8v5M9.5 10.5h5" />
    <path d="M9 21v-4.5h6V21" />
    <path d="M3 21h18" />
  </svg>
);

/**
 * نشان نقش پزشکی — برای «کاربر عادی» چیزی رندر نمی‌کند
 * (نشان کد ملی در UserMenu جداگانه وجود دارد).
 */
const MedicalRoleBadge = ({ role, id = '', size = '' }) => {
  if (role === 'doctor') {
    return (
      <span className={`mrb mrb-doctor ${size}`.trim()}>
        <StethoscopeIcon />
        پزشک
        {id ? ` (ن.پ: ${toFaDigits(id)})` : ''}
      </span>
    );
  }

  if (role === 'staff') {
    return (
      <span className={`mrb mrb-staff ${size}`.trim()}>
        <HospitalIcon />
        کادر درمان
        {id ? ` (${toFaDigits(id)})` : ''}
      </span>
    );
  }

  return null;
};

export default MedicalRoleBadge;
