import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import API from '../api';
import './AccessManagementPage.css';

/** Trash alert icon for revoke confirmation dialog. */
const AlertShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M12 8v4M12 16h.01" />
  </svg>
);

/**
 * Access & Care Management Page (`/access`).
 *
 * Dedicated surface for managing personal health record sharing and dependent care:
 * 1. People who have access to user's record (with direct grant & revoke controls).
 * 2. Care request form for adding new dependents by national code.
 * 3. People under user's care (with quick links to view their tests).
 * 4. Pending incoming access request approvals.
 */
const AccessManagementPage = () => {
  const [grantedAccesses, setGrantedAccesses] = useState([]);
  const [myDependents, setMyDependents] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [granteeCode, setGranteeCode] = useState('');
  const [isGranting, setIsGranting] = useState(false);
  const [dependentCode, setDependentCode] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);

  // Revoke confirmation modal state
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [isRevoking, setIsRevoking] = useState(false);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const [grantedRes, dependentsRes, inboxRes] = await Promise.all([
          API.get('access/granted/'),
          API.get('access/dependents/'),
          API.get('access/inbox/'),
        ]);
        if (!ignore) {
          setGrantedAccesses(grantedRes.data || []);
          setMyDependents(dependentsRes.data || []);
          setAccessRequests(inboxRes.data || []);
          setLoading(false);
        }
      } catch (err) {
        console.error('خطا در بارگذاری اطلاعات دسترسی:', err);
        if (!ignore) {
          toast.error('خطا در دریافت لیست دسترسی‌ها.');
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, []);

  // 1. Direct access grant to doctor/caregiver
  const handleGrantAccess = async (e) => {
    e.preventDefault();
    const cleanCode = granteeCode.trim();
    if (!cleanCode) {
      toast.warn('لطفاً کد ملی پزشک یا مراقب را وارد کنید.');
      return;
    }

    setIsGranting(true);
    try {
      const res = await API.post('access/grant/', { national_code: cleanCode });
      toast.success(res.data?.message || 'دسترسی با موفقیت به کاربر اعطا شد.');
      setGranteeCode('');
      // Refresh granted list
      const updated = await API.get('access/granted/');
      setGrantedAccesses(updated.data || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'خطا در اعطای دسترسی. لطفاً کد ملی را بررسی کنید.');
    } finally {
      setIsGranting(false);
    }
  };

  // 2. Request access to a dependent / family member
  const handleAddDependent = async (e) => {
    e.preventDefault();
    const cleanCode = dependentCode.trim();
    if (!cleanCode) {
      toast.warn('لطفاً کد ملی فرد مورد نظر را وارد کنید.');
      return;
    }

    setIsRequesting(true);
    try {
      const res = await API.post('access/request/', { national_code: cleanCode });
      toast.success(res.data?.message || 'درخواست دسترسی با موفقیت ارسال شد.');
      setDependentCode('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'خطا در ارسال درخواست دسترسی.');
    } finally {
      setIsRequesting(false);
    }
  };

  // 3. Confirm revoke access
  const handleConfirmRevoke = async () => {
    if (!revokeTarget) return;
    setIsRevoking(true);
    try {
      const res = await API.delete(`access/${revokeTarget.id}/revoke/`);
      toast.success(res.data?.message || 'دسترسی با موفقیت لغو شد.');
      setGrantedAccesses((prev) => prev.filter((a) => a.id !== revokeTarget.id));
      setRevokeTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'خطا در لغو دسترسی.');
    } finally {
      setIsRevoking(false);
    }
  };

  // 4. Respond to incoming access requests
  const handleRespondAccess = async (requestId, actionType) => {
    try {
      const res = await API.post(`access/${requestId}/respond/`, { action: actionType });
      toast.success(res.data?.message || 'عملیات با موفقیت ثبت شد.');
      // Remove from inbox and refresh granted
      setAccessRequests((prev) => prev.filter((r) => r.id !== requestId));
      const grantedRes = await API.get('access/granted/');
      setGrantedAccesses(grantedRes.data || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'خطا در ثبت پاسخ درخواست.');
    }
  };

  return (
    <div className="acc-page-container">
      {/* Page Header */}
      <header className="acc-header">
        <h1 className="acc-header-title">
          <span>👥</span> مدیریت دسترسی‌ها و افراد تحت مراقبت
        </h1>
        <p className="acc-header-sub">
          کنترل کامل بر اشتراک‌گذاری پرونده سلامت، اعطای دسترسی به پزشک و مدیریت سوابق افراد تحت سرپرستی
        </p>
      </header>

      {/* Pending Incoming Requests (Inbox Alert) */}
      {!loading && accessRequests.length > 0 && (
        <section className="acc-inbox-section" aria-label="درخواست‌های جدید دسترسی">
          <h2 className="acc-inbox-title">
            <span>📬</span> درخواست‌های دریافتی جهت دسترسی به پرونده شما:
          </h2>
          <div className="acc-inbox-list">
            {accessRequests.map((req) => (
              <div key={req.id} className="acc-inbox-item">
                <div className="acc-inbox-text">
                  کاربر <strong>{req.requester_name}</strong> درخواست دسترسی به نتایج آزمایش‌ها و پرونده سلامت شما را دارد.
                </div>
                <div className="acc-inbox-actions">
                  <button
                    type="button"
                    className="acc-btn-approve"
                    onClick={() => handleRespondAccess(req.id, 'approve')}
                  >
                    تأیید دسترسی
                  </button>
                  <button
                    type="button"
                    className="acc-btn-reject"
                    onClick={() => handleRespondAccess(req.id, 'reject')}
                  >
                    رد درخواست
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="acc-grid">
        {/* Section 1: افرادی که به پرونده شما دسترسی دارند */}
        <section className="acc-card" aria-label="افرادی که به پرونده شما دسترسی دارند">
          <div className="acc-card-header">
            <h2 className="acc-card-title">
              <span>🛡️</span> افرادی که به پرونده شما دسترسی دارند
            </h2>
            <p className="acc-card-desc">
              پزشکان، اعضای خانواده یا مراقبانی که مجاز به مشاهده نتایج آزمایش‌ها و پرونده سلامت شما هستند.
            </p>
          </div>

          {/* Direct grant form */}
          <form className="acc-form" onSubmit={handleGrantAccess}>
            <div className="acc-input-wrap">
              <input
                type="text"
                className="acc-input"
                placeholder="کد ملی پزشک یا مراقب مورد نظر را وارد کنید..."
                value={granteeCode}
                onChange={(e) => setGranteeCode(e.target.value)}
                maxLength={10}
                dir="ltr"
              />
            </div>
            <button
              type="submit"
              className="acc-btn-submit"
              disabled={isGranting || !granteeCode.trim()}
            >
              {isGranting ? 'در حال ثبت...' : '+ اعطای دسترسی مستقیم'}
            </button>
          </form>

          {/* Active granted list */}
          {loading ? (
            <div className="acc-skeleton-row" />
          ) : grantedAccesses.length === 0 ? (
            <div className="acc-empty-state">
              <div className="acc-empty-icon" aria-hidden="true">🛡️</div>
              <p className="acc-empty-text">
                در حال حاضر هیچ شخص دیگری به نتایج آزمایش‌ها و پرونده سلامت شما دسترسی ندارد.
              </p>
            </div>
          ) : (
            <div className="acc-items-list">
              {grantedAccesses.map((access) => (
                <div key={access.id} className="acc-person-row">
                  <div className="acc-person-info">
                    <div className="acc-person-avatar">
                      {access.grantee_name?.charAt(0) || 'ک'}
                    </div>
                    <div className="acc-person-details">
                      <span className="acc-person-name">{access.grantee_name}</span>
                      <span className="acc-person-meta">
                        <span className="acc-status-tag">✓ دسترسی فعال</span>
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="acc-btn-revoke"
                    onClick={() => setRevokeTarget(access)}
                  >
                    لغو دسترسی
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 2: درخواست دسترسی و افزودن فرد تحت مراقبت */}
        <section className="acc-card" aria-label="درخواست دسترسی و افزودن فرد تحت مراقبت">
          <div className="acc-card-header">
            <h2 className="acc-card-title">
              <span>➕</span> درخواست دسترسی و افزودن فرد تحت مراقبت
            </h2>
            <p className="acc-card-desc">
              جهت پیگیری وضعیت سلامت فرزندان، والدین یا بیماران، کد ملی شخص را وارد کنید تا درخواست برای ایشان ارسال شود.
            </p>
          </div>

          <form className="acc-form" onSubmit={handleAddDependent}>
            <div className="acc-input-wrap">
              <input
                type="text"
                className="acc-input"
                placeholder="کد ملی ۱۰ رقمی فرد مورد نظر را وارد کنید..."
                value={dependentCode}
                onChange={(e) => setDependentCode(e.target.value)}
                maxLength={10}
                dir="ltr"
              />
            </div>
            <button
              type="submit"
              className="acc-btn-submit"
              disabled={isRequesting || !dependentCode.trim()}
            >
              {isRequesting ? 'در حال ارسال...' : 'ارسال درخواست دسترسی'}
            </button>
          </form>
        </section>

        {/* Section 3: افرادی که تحت مراقبت من هستند (دسترسی دارم) */}
        <section className="acc-card" aria-label="افرادی که تحت مراقبت من هستند">
          <div className="acc-card-header">
            <h2 className="acc-card-title">
              <span>📋</span> افرادی که تحت مراقبت من هستند (دسترسی دارم)
            </h2>
            <p className="acc-card-desc">
              افرادی که دسترسی مشاهده نتایج آزمایش‌های خود را به شما اعطا کرده‌اند.
            </p>
          </div>

          {loading ? (
            <div className="acc-skeleton-row" />
          ) : myDependents.length === 0 ? (
            <div className="acc-empty-state">
              <div className="acc-empty-icon" aria-hidden="true">📋</div>
              <p className="acc-empty-text">
                شما در حال حاضر به پرونده شخص دیگری دسترسی ندارید. با فرم بالا می‌توانید درخواست دسترسی ارسال نمایید.
              </p>
            </div>
          ) : (
            <div className="acc-items-list">
              {myDependents.map((person) => (
                <div key={person.access_id} className="acc-person-row">
                  <div className="acc-person-info">
                    <div className="acc-person-avatar" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                      {person.patient_name?.charAt(0) || 'ب'}
                    </div>
                    <div className="acc-person-details">
                      <span className="acc-person-name">{person.patient_name}</span>
                      <span className="acc-person-meta">
                        کد ملی: <span dir="ltr">{person.national_code}</span>
                      </span>
                    </div>
                  </div>
                  <Link
                    to="/dashboard"
                    className="acc-btn-view-tests"
                    title="مشاهده نتایج آزمایش‌ها در داشبورد"
                  >
                    <span>📊</span>
                    <span>مشاهده آزمایش‌ها</span>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Confirmation Modal for Revoking Access */}
      {revokeTarget && (
        <div
          className="acc-modal-overlay"
          onClick={() => !isRevoking && setRevokeTarget(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="acc-revoke-title"
        >
          <div className="acc-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="acc-modal-icon-wrap" aria-hidden="true">
              <AlertShieldIcon />
            </div>
            <h3 id="acc-revoke-title" className="acc-modal-title">
              لغو دسترسی کاربر
            </h3>
            <p className="acc-modal-desc">
              آیا از لغو دسترسی <strong>{revokeTarget.grantee_name}</strong> به پرونده آزمایش‌ها و اطلاعات پزشکی خود اطمینان دارید؟
            </p>
            <div className="acc-modal-actions">
              <button
                type="button"
                className="acc-modal-btn-confirm"
                onClick={handleConfirmRevoke}
                disabled={isRevoking}
              >
                {isRevoking ? 'در حال لغو...' : 'بله، دسترسی لغو شود'}
              </button>
              <button
                type="button"
                className="acc-modal-btn-cancel"
                onClick={() => setRevokeTarget(null)}
                disabled={isRevoking}
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessManagementPage;
