import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  decodeEmergencyPass,
  isPassExpired,
  getRevokedIds,
  verifyPin,
  formatRemaining,
  toFaDigits,
} from '../utils/emergencyPass';
import './EmergencyPassView.css';

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

const WarnGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3.5L22 20H2L12 3.5z" />
    <path d="M12 9.5v4.5" />
    <path d="M12 17h.01" />
  </svg>
);

const LockGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </svg>
);

const EmergencyPassView = () => {
  const { token } = useParams();

  const resolved = useMemo(() => decodeEmergencyPass(token), [token]);

  const [now, setNow] = useState(() => Date.now());
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [checkingPin, setCheckingPin] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // وضعیت نهایی: نامعتبر / لغو شده / منقضی / نیازمند PIN / آماده
  const revokedIds = useMemo(() => getRevokedIds(), []);
  const isRevoked = resolved.ok && resolved.data.jti && revokedIds.has(resolved.data.jti);
  const expired = isPassExpired(resolved.ok ? resolved.data : null, null) && resolved.ok;
  const needsPin = resolved.ok && !expired && !isRevoked && Boolean(resolved.data.pinHash) && !pinVerified;

  const remainingMs = resolved.ok ? Math.max(0, resolved.data.exp - now) : 0;

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    setCheckingPin(true);
    setPinError(false);
    const ok = await verifyPin(resolved.data, pinInput);
    setCheckingPin(false);
    if (ok) {
      setPinVerified(true);
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  const sortedTests = useMemo(() => {
    if (!resolved.ok) return [];
    return [...(resolved.data.ts || [])].sort((a, b) => new Date(a.dt) - new Date(b.dt));
  }, [resolved]);

  return (
    <div className="epv" dir="rtl">
      {/* نوار هشدار دسترسی موقت */}
      <div className="epv-banner">
        <WarnGlyph />
        دسترسی موقت اضطراری - دارای محدودیت زمانی
      </div>

      <header className="epv-header">
        <div className="epv-brand">
          <span className="epv-logo"><ShieldGlyph /></span>
          <div>
            <strong>سلامت‌یار</strong>
            <span>پرونده اضطراری پزشکی</span>
          </div>
        </div>
        {!resolved.ok || expired || isRevoked ? null : (
          <span className={`epv-countdown ${remainingMs < 3600000 ? 'epv-countdown-low' : ''}`}>
            <ClockGlyph />
            اعتبار: <strong>{formatRemaining(remainingMs)}</strong>
          </span>
        )}
      </header>

      <main className="epv-main">
        {!resolved.ok && (
          <div className="epv-state-card epv-state-invalid">
            <WarnGlyph />
            <h1>لینک نامعتبر است</h1>
            <p>این لینک دسترسی قابل خواندن نیست یا ناقص ارسال شده است. لطفاً از بیمار یک لینک جدید دریافت کنید.</p>
            <Link to="/" className="epv-home-link">رفتن به صفحه اصلی</Link>
          </div>
        )}

        {resolved.ok && isRevoked && (
          <div className="epv-state-card epv-state-invalid">
            <LockGlyph />
            <h1>این دسترسی لغو شده است</h1>
            <p>بیمار این دسترسی را باطل کرده است. برای مشاهده پرونده، لطفاً لینک جدید دریافت کنید.</p>
            <Link to="/" className="epv-home-link">رفتن به صفحه اصلی</Link>
          </div>
        )}

        {resolved.ok && !isRevoked && expired && (
          <div className="epv-state-card epv-state-expired">
            <ClockGlyph />
            <h1>این دسترسی منقضی شده است</h1>
            <p>زمان اعتبار این لینک به پایان رسیده و دیگر نمی‌توانید پرونده را مشاهده کنید.</p>
            <Link to="/" className="epv-home-link">رفتن به صفحه اصلی</Link>
          </div>
        )}

        {resolved.ok && !isRevoked && !expired && needsPin && (
          <div className="epv-pin-gate">
            <span className="epv-pin-icon"><LockGlyph /></span>
            <h1>این پرونده با رمز محافظت شده است</h1>
            <p>رمز PIN چهار رقمی که بیمار در اختیار شما گذاشته است را وارد کنید.</p>
            <form onSubmit={handlePinSubmit}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                className={`epv-pin-input ${pinError ? 'epv-pin-error' : ''}`}
                dir="ltr"
                autoFocus
                aria-label="رمز PIN چهار رقمی"
              />
              {pinError && <p className="epv-pin-message">رمز وارد شده صحیح نیست.</p>}
              <button type="submit" className="epv-unlock-btn" disabled={checkingPin || pinInput.length !== 4}>
                {checkingPin ? 'در حال بررسی...' : 'باز کردن پرونده'}
              </button>
            </form>
          </div>
        )}

        {resolved.ok && !isRevoked && !expired && !needsPin && (
          <>
            <section className="epv-patient-card">
              <h1>{resolved.data.n || 'بیمار'}</h1>
              <div className="epv-meta-grid">
                {resolved.data.nc && (
                  <div className="epv-meta-item">
                    <span>کد ملی</span>
                    <strong>{toFaDigits(resolved.data.nc)}</strong>
                  </div>
                )}
                {resolved.data.bg && (
                  <div className="epv-meta-item">
                    <span>گروه خونی</span>
                    <strong className="epv-blood">{resolved.data.bg}</strong>
                  </div>
                )}
                {resolved.data.al && (
                  <div className="epv-meta-item epv-meta-wide">
                    <span>حساسیت‌ها / هشدارها</span>
                    <strong>{resolved.data.al}</strong>
                  </div>
                )}
              </div>
            </section>

            <section className="epv-tests">
              <h2>نتایج آزمایش‌های تایید شده ({toFaDigits(sortedTests.length)})</h2>

              {sortedTests.length === 0 ? (
                <div className="epv-no-tests">هیچ نتیجه تایید شده‌ای برای نمایش وجود ندارد.</div>
              ) : (
                <ol className="epv-timeline">
                  {sortedTests.map((test, index) => {
                    let statusTone = 'unknown';
                    if (test.rv !== null && test.mn !== null && test.mx !== null) {
                      statusTone = test.rv >= test.mn && test.rv <= test.mx ? 'normal' : 'abnormal';
                    }
                    return (
                      <li key={index} className="epv-test-row">
                        <span className={`epv-status-dot epv-status-${statusTone}`} aria-hidden="true" />
                        <div className="epv-test-info">
                          <div className="epv-test-top">
                            <strong>{test.tn}</strong>
                            <span className="epv-test-date">{toFaDigits(test.dt)}</span>
                          </div>
                          <div className="epv-test-bottom">
                            <span className="epv-test-value">
                              نتیجه: <strong>{test.rv !== null ? toFaDigits(test.rv) : (test.rt || '—')}</strong>
                              {test.un ? ` ${test.un}` : ''}
                            </span>
                            {(test.mn !== null || test.mx !== null) && (
                              <span className="epv-test-range">
                                بازه نرمال: {test.mn !== null ? toFaDigits(test.mn) : '—'} تا {test.mx !== null ? toFaDigits(test.mx) : '—'}
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>

            <footer className="epv-footer">
              این گزارش صرفاً جهت کمک‌های اولیه و اورژانسی تولید شده و جایگزین نظر پزشک نیست.
            </footer>
          </>
        )}
      </main>
    </div>
  );
};

export default EmergencyPassView;
