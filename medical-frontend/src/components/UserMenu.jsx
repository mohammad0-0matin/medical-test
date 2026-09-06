import { useState, useRef, useEffect } from 'react';
import ThemeToggle from './ThemeToggle';
import MedicalRoleBadge from './MedicalRoleBadge';
import './UserMenu.css';

const toFaDigits = (value) =>
  String(value ?? '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="3.5" width="16" height="17" rx="2.5" />
    <circle cx="12" cy="10" r="2.6" />
    <path d="M8 17c.7-1.8 2.3-2.6 4-2.6s3.3.8 4 2.6" />
  </svg>
);

const HelpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M9.6 9.2a2.5 2.5 0 0 1 4.86.83c0 1.67-2.46 2-2.46 3.47" />
    <path d="M12 17h.01" />
  </svg>
);

const TourIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3a6.5 6.5 0 0 0-3.7 11.8c.7.55 1.2 1.3 1.2 2.2h5c0-.9.5-1.65 1.2-2.2A6.5 6.5 0 0 0 12 3z" />
    <path d="M10 20.5h4" />
    <path d="M12 8v3" />
    <path d="M12 13h.01" />
  </svg>
);

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 4h4a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 18 20h-4" />
    <path d="M10 8l-4 4 4 4" />
    <path d="M6 12h9" />
  </svg>
);

/**
 * Header user dropdown: identity header with role badge and online status,
 * profile-completion shortcut, theme switcher, tour replay and logout.
 * Closed automatically on outside clicks and Escape.
 *
 * @param {{fullName?: string, nationalCode?: string, medicalRole?: string,
 *          medicalId?: string, onOpenProfile?: Function,
 *          onOpenTour?: Function, onLogout?: Function}} props - Component props.
 * @param {string} [props.fullName] - Display name (falls back to a generic label).
 * @param {string} [props.nationalCode] - National code shown as fallback badge text.
 * @param {string} [props.medicalRole='standard'] - Role key driving the MedicalRoleBadge.
 * @param {string} [props.medicalId] - Clinical ID forwarded to the role badge.
 * @param {Function} [props.onOpenProfile] - Opens the CompleteProfileModal.
 * @param {Function} [props.onOpenTour] - Replays the OnboardingTour.
 * @param {Function} [props.onLogout] - Signs the user out.
 * @returns {JSX.Element} Trigger button plus conditional dropdown panel.
 */
const UserMenu = ({ fullName = '', nationalCode = '', medicalRole = 'standard', medicalId = '', onOpenProfile, onOpenTour, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const displayName = fullName.trim() || 'کاربر سلامت‌یار';
  const initial = displayName.charAt(0);
  const badgeText = nationalCode ? `کد ملی: ${toFaDigits(nationalCode)}` : 'پرونده تکمیل نشده';

  return (
    <div className="um" ref={menuRef}>
      <button
        type="button"
        className={`um-trigger ${isOpen ? 'um-open' : ''}`}
        onClick={() => setIsOpen((s) => !s)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="منوی کاربر"
      >
        <span className="um-avatar" aria-hidden="true">{initial}</span>
        <span className="um-name">{displayName}</span>
        <span className={`um-chevron ${isOpen ? 'um-chevron-up' : ''}`}>
          <ChevronDownIcon />
        </span>
      </button>

      {isOpen && (
        <div className="um-panel" role="menu" aria-label="گزینه‌های کاربر">
          <div className="um-head">
            <span className="um-head-avatar" aria-hidden="true">{initial}</span>
            <div className="um-head-info">
              <strong>{displayName}</strong>
              {medicalRole !== 'standard' && (
                <MedicalRoleBadge role={medicalRole} id={medicalId} />
              )}
              <span className="um-badge">{badgeText}</span>
            </div>
            <span className="um-status" title="وضعیت: آنلاین">
              <span className="um-status-dot" />
              آنلاین
            </span>
          </div>

          <button
            type="button"
            role="menuitem"
            className="um-item"
            onClick={() => {
              setIsOpen(false);
              if (onOpenProfile) onOpenProfile();
            }}
          >
            <ProfileIcon />
            تکمیل پرونده سلامت
          </button>

          <div className="um-theme-row">
            <span className="um-theme-label">حالت نمایش</span>
            <ThemeToggle />
          </div>

          <button
            type="button"
            role="menuitem"
            className="um-item"
            onClick={() => {
              setIsOpen(false);
              if (onOpenTour) onOpenTour();
            }}
          >
            <TourIcon />
            💡 راهنمای سامانه
          </button>

        

          <div className="um-divider" />

          <button
            type="button"
            role="menuitem"
            className="um-item um-logout"
            onClick={() => {
              setIsOpen(false);
              if (onLogout) onLogout();
            }}
          >
            <LogoutIcon />
            خروج از حساب
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
