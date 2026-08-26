import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'react-toastify';
import {
  DURATIONS,
  buildEmergencyPass,
  getActivePasses,
  saveActivePass,
  revokePass,
  formatRemaining,
} from '../utils/emergencyPass';
import './AddTestModal.css';
import './TemporaryAccessModal.css';

const ShieldGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l7 2.6v5.1c0 4.6-3 8.9-7 10.3-4-1.4-7-5.7-7-10.3V5.6L12 3z" />
    <path d="M9.2 12l2 2 3.6-3.8" />
  </svg>
);

const ClockGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

const CopyGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5.5 15H4.8A1.8 1.8 0 0 1 3 13.2V4.8A1.8 1.8 0 0 1 4.8 3h8.4A1.8 1.8 0 0 1 15 4.8v.7" />
  </svg>
);

const CheckGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 13l4 4L19 7" />
  </svg>
);

const CloseGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const truncate = (value, max = 60) => {
  const str = String(value || '').trim();
  return str.length > max ? `${str.slice(0, max)}…` : str;
};

const TemporaryAccessModal = ({ isOpen, onClose, profile, tests, clinicalNotesMap = {}, healthSummary = null }) => {
  const [duration, setDuration] = useState('24');
  const [scope, setScope] = useState('all');
  const [pin, setPin] = useState('');
  const [generating, setGenerating] = useState(false);
  const [formError, setFormError] = useState(null);
  const [generated, setGenerated] = useState(null);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // بازیابی پاس فعال هر بار که مودال باز می‌شود
  // (الگوی «تنظیم وضعیت هنگام تغییر پراپس» به‌جای useEffect)
  const [syncedOpen, setSyncedOpen] = useState(false);
  if (isOpen !== syncedOpen) {
    setSyncedOpen(isOpen);
    if (isOpen) {
      const active = getActivePasses();
      setGenerated(active.length > 0
        ? { token: active[0].token, jti: active[0].jti, expiresAt: active[0].expiresAt }
        : null);
      setFormError(null);
      setPin('');
      setDuration('24');
      setScope('all');
      setCopied(false);
    }
  }

  // تایمر شمارش معکوس
  useEffect(() => {
    if (!isOpen || !generated) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isOpen, generated]);

  if (!isOpen) return null;

  const approvedTests = tests.filter((t) => t.status === 'approved');

  const remainingMs = generated ? generated.expiresAt - now : 0;
  const isExpired = generated && remainingMs <= 0;
  const passUrl = generated
    ? `${window.location.origin}/pass/${generated.token}`
    : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(passUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = passUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGenerate = async () => {
    if (pin && !/^\d{4}$/.test(pin)) {
      setFormError('PIN باید دقیقاً ۴ رقم باشد.');
      return;
    }

    setGenerating(true);
    setFormError(null);

    try {
      // پیوست کردن خلاصه یادداشت بالینی (در صورت وجود) به هر آزمایش
      const scopedTests = (scope === 'recent'
        ? [...approvedTests]
            .sort((a, b) => new Date(b.test_date) - new Date(a.test_date))
            .slice(0, 5)
        : approvedTests
      ).map((test) => {
        const note = clinicalNotesMap?.[test.id];
        return note
          ? {
              ...test,
              cn: {
                f: truncate(note.fastingHours),
                m: truncate(note.medications),
                d: truncate(note.doctorName),
                n: truncate(note.notes, 140),
              },
            }
          : test;
      });

      const pass = await buildEmergencyPass({
        profile,
        tests: scopedTests,
        durationHours: Number(duration),
        pin,
        // همگام‌سازی آلرژی‌ها و داروهای فعال از خلاصه پرونده سلامت
        extras: {
          bg: profile?.blood_group || null,
          al:
            (healthSummary?.allergies || []).length > 0
              ? healthSummary.allergies
                  .map((a) => `${a.allergen}${a.severity === 'severe' ? ' (شدید)' : ''}`)
                  .join('، ')
              : null,
          md:
            (healthSummary?.medications || []).filter((m) => m.isActive !== false).length > 0
              ? healthSummary.medications
                  .filter((m) => m.isActive !== false)
                  .map((m) => `${m.name} ${m.dosage || ''}`.trim())
                  .join('، ')
              : null,
        },
      });

      saveActivePass({ jti: pass.jti, token: pass.token, expiresAt: pass.expiresAt });
      setGenerated({ token: pass.token, jti: pass.jti, expiresAt: pass.expiresAt });
      setCopied(false);
      toast.success('⚡ دسترسی اضطراری با موفقیت صادر شد.');
    } catch (err) {
      console.error('Generate error:', err);
      setFormError('خطا در صدور دسترسی. لطفاً دوباره تلاش کنید.');
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = () => {
    if (!generated) return;
    revokePass(generated.jti);
    setGenerated(null);
    toast.success('دسترسی با موفقیت لغو شد.');
  };

  return (
    <div className="modal-overlay" dir="rtl">
      <div className="modal-container ta-modal">
        <div className="modal-header">
          <h2>⚡ دسترسی اضطراری پزشک</h2>
          <button onClick={onClose} className="close-btn" aria-label="بستن پنجره" title="بستن">
            <CloseGlyph />
          </button>
        </div>

        <div className="modal-body">
          {!generated || isExpired ? (
            <>
              {isExpired && (
                <div className="modal-alert" role="alert">
                  ⏳ دسترسی قبلی منقضی شده است؛ در صورت نیاز دوباره صادر کنید.
                </div>
              )}

              <div className="ta-intro">
                <ShieldGlyph />
                یک لینک موقت و امن بسازید تا پزشک یا کادر درمان بدون حساب کاربری،
                فقط برای مدت محدود به سابقه آزمایش‌های شما دسترسی داشته باشند.
              </div>

              <div className="form-group">
                <label className="form-label">مدت اعتبار دسترسی:</label>
                <div className="ta-pills" role="radiogroup" aria-label="مدت اعتبار">
                  {DURATIONS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      role="radio"
                      aria-checked={duration === item.value}
                      className={`ta-pill ${duration === item.value ? 'ta-pill-active' : ''}`}
                      onClick={() => setDuration(item.value)}
                    >
                      <ClockGlyph />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">دامنه اطلاعاتی:</label>
                <div className="ta-pills" role="radiogroup" aria-label="دامنه اطلاعات">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={scope === 'all'}
                    className={`ta-pill ${scope === 'all' ? 'ta-pill-active' : ''}`}
                    onClick={() => setScope('all')}
                  >
                    همه آزمایش‌های تایید شده
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={scope === 'recent'}
                    className={`ta-pill ${scope === 'recent' ? 'ta-pill-active' : ''}`}
                    onClick={() => setScope('recent')}
                  >
                    ۵ آزمایش اخیر
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">رمز PIN چهار رقمی (اختیاری):</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="مثلاً 1234"
                  className="form-input ta-pin-input"
                  dir="ltr"
                  autoComplete="off"
                />
                <span className="ta-hint">در صورت تنظیم، پزشک برای مشاهده باید این رمز را وارد کند.</span>
              </div>

              {formError && (
                <div className="modal-alert" role="alert">⚠️ {formError}</div>
              )}

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-submit"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating
                    ? (<><span className="btn-spinner" />در حال صدور...</>)
                    : '⚡ صدور دسترسی موقت'}
                </button>
                <button type="button" onClick={onClose} className="btn-cancel">انصراف</button>
              </div>
            </>
          ) : (
            <>
              <div className="ta-disclaimer" role="note">
                <ShieldGlyph />
                این دسترسی موقت بوده و پس از اتمام زمان منقضی می‌شود
              </div>

              <div className="ta-output">
                <div className="ta-qr-tile">
                  <QRCodeSVG value={passUrl} size={188} level="M" marginSize={1} />
                </div>

                <div className={`ta-countdown ${isExpired ? 'ta-countdown-danger' : ''}`}>
                  <ClockGlyph />
                  زمان باقی‌مانده: <strong>{formatRemaining(remainingMs)}</strong>
                </div>

                <div className="ta-link-row">
                  <input
                    type="text"
                    readOnly
                    value={passUrl}
                    className="form-input ta-link-input"
                    dir="ltr"
                    onFocus={(e) => e.target.select()}
                    aria-label="لینک اشتراک‌گذاری"
                  />
                  <button type="button" className={`ta-copy-btn ${copied ? 'ta-copied' : ''}`} onClick={handleCopy}>
                    {copied ? (<><CheckGlyph />کپی شد!</>) : (<><CopyGlyph />کپی لینک</>)}
                  </button>
                </div>

                <p className="ta-scan-hint">
                  پزشک می‌تواند QR را اسکن کرده یا لینک را در مرورگر باز کند.
                  {generated.hasPin ? ' ورود با PIN الزامی است.' : ''}
                </p>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-cancel ta-revoke-btn" onClick={handleRevoke}>
                  لغو فوری دسترسی
                </button>
                <button type="button" onClick={onClose} className="btn-submit">
                  تمام
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemporaryAccessModal;
