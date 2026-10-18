import { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import API from '../api';
import NotificationBell from '../components/NotificationBell';
import UserMenu from '../components/UserMenu';
import UpcomingCheckupsWidget from '../components/UpcomingCheckupsWidget';
import HealthSummaryView from '../components/healthSummary/HealthSummaryView';
import TemporaryAccessModal from '../components/TemporaryAccessModal';
import Skeleton from '../components/Skeleton';
import { fetchRemindersApi, completeReminderApi, deleteReminderApi } from '../utils/reminderUtils';
import { getHealthSummaryApi } from '../utils/healthSummaryUtils';
import { resolveMedicalIdentity } from '../utils/medicalIdentity';
import { toast } from 'react-toastify';
import './Dashboard.css';

const EMPTY_HEALTH_SUMMARY = {
  conditions: [],
  medications: [],
  allergies: [],
  immunizations: [],
  care_plans: [],
  carePlan: [],
  screenings: [],
};

/**
 * Executive Central Health Dashboard (route `/dashboard`).
 *
 * Serves as the core executive overview / command center:
 * - High-level metrics: Total tests, Active prescriptions, Smart health card, Reminders
 * - Quick action shortcuts: New Test, New Prescription, Emergency Access, Health Card
 * - Recent lab tests summary with direct navigation to the dedicated `/tests` workspace
 * - Upcoming checkups & care plans overview
 * - Health summary vitals tracker (Blood sugar, Cholesterol, Blood pressure, BMI)
 * - Doctor/family access requests inbox
 *
 * @returns {JSX.Element} Executive Dashboard layout.
 */
const Dashboard = () => {
  const navigate = useNavigate();
  const { logout, user } = useContext(AuthContext);

  const [tests, setTests] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [profile, setProfile] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [healthSummary, setHealthSummary] = useState(EMPTY_HEALTH_SUMMARY);
  const [accessRequests, setAccessRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isTempAccessOpen, setIsTempAccessOpen] = useState(false);

  const refreshData = async () => {
    try {
      const summaryData = await getHealthSummaryApi().catch(() => EMPTY_HEALTH_SUMMARY);
      setHealthSummary(summaryData || EMPTY_HEALTH_SUMMARY);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    let ignore = false;
    const loadDashboardData = async () => {
      try {
        const [testsRes, prescRes, profileRes, remindersData, summaryData, inboxRes] = await Promise.all([
          API.get('test-results/').catch(() => ({ data: [] })),
          API.get('prescriptions/').catch(() => ({ data: [] })),
          API.get('patients/me/').catch(() => ({ data: null })),
          fetchRemindersApi().catch(() => []),
          getHealthSummaryApi().catch(() => EMPTY_HEALTH_SUMMARY),
          API.get('access/inbox/').catch(() => ({ data: [] })),
        ]);

        if (!ignore) {
          const testList = Array.isArray(testsRes.data)
            ? testsRes.data
            : testsRes.data?.results || [];
          const prescList = Array.isArray(prescRes.data)
            ? prescRes.data
            : prescRes.data?.results || [];

          setTests(testList);
          setPrescriptions(prescList);
          setProfile(profileRes.data);
          setReminders(remindersData || []);
          setHealthSummary(summaryData || EMPTY_HEALTH_SUMMARY);
          setAccessRequests(inboxRes.data || []);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          if (err.response?.status === 401) {
            if (logout) logout();
            navigate('/login');
            return;
          }
          toast.error('خطا در دریافت خلاصه اطلاعات پیشخوان.');
          setLoading(false);
        }
      }
    };

    loadDashboardData();
    return () => {
      ignore = true;
    };
  }, [logout, navigate]);

  // Accept access request
  const handleAcceptRequest = async (id) => {
    try {
      await API.post(`access/${id}/respond/`, { action: 'approve' });
      toast.success('درخواست دسترسی با موفقیت تأیید شد.');
      setAccessRequests((prev) => prev.filter((req) => req.id !== id));
    } catch {
      toast.error('خطا در تأیید درخواست دسترسی.');
    }
  };

  // Reject access request
  const handleRejectRequest = async (id) => {
    try {
      await API.post(`access/${id}/respond/`, { action: 'reject' });
      toast.info('درخواست دسترسی رد شد.');
      setAccessRequests((prev) => prev.filter((req) => req.id !== id));
    } catch {
      toast.error('خطا در رد درخواست.');
    }
  };

  // Reminders handlers
  const handleCompleteReminder = async (id) => {
    try {
      const target = reminders.find((r) => r.id === id);
      if (!target) return;
      const updated = await completeReminderApi(id, target);
      setReminders((prev) => prev.map((r) => (r.id === id ? updated : r)));
      toast.success('وضعیت یادآور به‌روزرسانی شد.');
    } catch {
      toast.error('خطا در به‌روزرسانی یادآور.');
    }
  };

  const handleDeleteReminder = async (id) => {
    try {
      await deleteReminderApi(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
      toast.success('یادآور حذف شد.');
    } catch {
      toast.error('خطا در حذف یادآور.');
    }
  };

  // Sort tests by date desc and take top 4
  const recentTests = [...tests]
    .sort((a, b) => new Date(b.test_date || b.created_at || 0) - new Date(a.test_date || a.created_at || 0))
    .slice(0, 4);

  const abnormalCount = tests.filter((t) => t.is_normal === false || t.status === 'abnormal' || t.is_critical).length;
  const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user?.username || 'کاربر گرامی';

  // Today in Jalali with Latin digits
  const todayJalali = new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', {
    dateStyle: 'full',
  }).format(new Date());

  return (
    <div className="dash-hub" dir="rtl">
      {/* 1. Welcome & Greeting Bar */}
      <header className="dash-greeting-card">
        <div className="dash-greeting-info">
          <div className="dash-greeting-title-wrap">
            <h1>سلام، {userName} خوش آمدید 👋</h1>
            <span className="dash-active-pill">پرونده سلامت فعال</span>
          </div>
          <p className="dash-greeting-date">
            امروز {todayJalali} — پیشخوان یکپارچه پایش آزمایش‌ها و مراقبت‌های پزشکی
          </p>
        </div>

        <div className="dash-greeting-actions">
          <NotificationBell
            accessRequests={accessRequests}
            onRespondAccess={(id, action) =>
              action === 'approve' ? handleAcceptRequest(id) : handleRejectRequest(id)
            }
          />
          <UserMenu
            fullName={userName}
            nationalCode={profile?.national_code || ''}
            medicalRole={profile?.medical_role || 'standard'}
            medicalId={profile?.medical_system_code || profile?.staff_id || ''}
            onOpenProfile={() => navigate('/health-card')}
            onOpenEmergencyPass={() => setIsTempAccessOpen(true)}
          />
        </div>
      </header>

      {/* 2. Access Requests Inbox Notification (if any) */}
      {accessRequests.length > 0 && (
        <section className="dash-inbox-banner" aria-label="درخواست‌های دسترسی جدید">
          <div className="dash-inbox-head">
            <span className="dash-inbox-badge">📬 {accessRequests.length} درخواست دسترسی جدید</span>
            <Link to="/access" className="dash-inbox-link">مدیریت همه دسترسی‌ها ←</Link>
          </div>
          <div className="dash-inbox-list">
            {accessRequests.map((req) => (
              <div key={req.id} className="dash-inbox-item">
                <div className="dash-inbox-item-info">
                  <strong>{req.requester_name || req.requester_phone || 'پزشک / کاربر درخواست‌دهنده'}</strong>
                  <span>درخواست مشاهده پرونده سلامت شما</span>
                </div>
                <div className="dash-inbox-item-actions">
                  <button
                    type="button"
                    className="dash-btn dash-btn-sm dash-btn-primary"
                    onClick={() => handleAcceptRequest(req.id)}
                  >
                    تأیید دسترسی
                  </button>
                  <button
                    type="button"
                    className="dash-btn dash-btn-sm dash-btn-ghost"
                    onClick={() => handleRejectRequest(req.id)}
                  >
                    رد
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Executive Vitals: 4 Core Metric Cards */}
      <section className="dash-metrics-grid" aria-label="شاخص‌های آماری سلامت">
        {/* Metric 1: Tests */}
        <article className="dash-metric-card">
          <div className="dash-metric-top">
            <span className="dash-metric-icon" aria-hidden="true">🧪</span>
            <span className="dash-metric-title">آزمایش‌های پزشکی</span>
          </div>
          <div className="dash-metric-body">
            <strong className="dash-metric-value">{tests.length}</strong>
            <span className="dash-metric-sub">
              {abnormalCount > 0 ? (
                <span className="dash-warn-text">{abnormalCount} مورد نیازمند بررسی</span>
              ) : (
                'همه شاخص‌ها در محدوده نرمال'
              )}
            </span>
          </div>
          <div className="dash-metric-footer">
            <Link to="/tests" className="dash-metric-link">مشاهده همه آزمایش‌ها ←</Link>
            <button
              type="button"
              className="dash-btn-mini"
              onClick={() => navigate('/tests/new')}
              title="ثبت آزمایش جدید"
            >
              + ثبت آزمایش
            </button>
          </div>
        </article>

        {/* Metric 2: Prescriptions */}
        <article className="dash-metric-card">
          <div className="dash-metric-top">
            <span className="dash-metric-icon" aria-hidden="true">💊</span>
            <span className="dash-metric-title">نسخه‌های پزشک</span>
          </div>
          <div className="dash-metric-body">
            <strong className="dash-metric-value">{prescriptions.length}</strong>
            <span className="dash-metric-sub">
              {prescriptions.length > 0 ? 'داروهای تجویزشده فعال' : 'بدون نسخه دارویی فعال'}
            </span>
          </div>
          <div className="dash-metric-footer">
            <Link to="/prescriptions" className="dash-metric-link">مشاهده نسخه‌ها ←</Link>
            <button
              type="button"
              className="dash-btn-mini"
              onClick={() => navigate('/prescriptions/new')}
              title="ثبت نسخه جدید"
            >
              + ثبت نسخه
            </button>
          </div>
        </article>

        {/* Metric 3: Health Card */}
        <article className="dash-metric-card">
          <div className="dash-metric-top">
            <span className="dash-metric-icon" aria-hidden="true">🪪</span>
            <span className="dash-metric-title">کارت سلامت هوشیار</span>
          </div>
          <div className="dash-metric-body">
            <strong className="dash-metric-value">
              {profile?.national_code ? 'فعال و معتبر' : 'نیاز به تکمیل'}
            </strong>
            <span className="dash-metric-sub">
              گروه خونی: {profile?.blood_type || 'ثبت نشده'}
            </span>
          </div>
          <div className="dash-metric-footer">
            <Link to="/health-card" className="dash-metric-link">مشاهده کارت دیجیتال ←</Link>
            <button
              type="button"
              className="dash-btn-mini dash-btn-mini-warn"
              onClick={() => setIsTempAccessOpen(true)}
              title="صدور دسترسی اضطراری پزشک"
            >
              ⚡ دسترسی پزشک
            </button>
          </div>
        </article>

        {/* Metric 4: Reminders */}
        <article className="dash-metric-card">
          <div className="dash-metric-top">
            <span className="dash-metric-icon" aria-hidden="true">📅</span>
            <span className="dash-metric-title">تقویم و چکاپ‌ها</span>
          </div>
          <div className="dash-metric-body">
            <strong className="dash-metric-value">{reminders.length}</strong>
            <span className="dash-metric-sub">
              {reminders.length > 0 ? 'یادآوری‌های نوبت فعال' : 'بدون یادآوری فوری'}
            </span>
          </div>
          <div className="dash-metric-footer">
            <Link to="/reminders" className="dash-metric-link">تقویم سلامت ←</Link>
            <Link to="/reminders" className="dash-btn-mini">
              + یادآور جدید
            </Link>
          </div>
        </article>
      </section>

      {/* 4. Quick Action Shortcuts Hub */}
      <section className="dash-shortcuts-section" aria-label="دسترسی‌های سریع">
        <div className="dash-shortcuts-grid">
          <button
            type="button"
            className="dash-shortcut-card dash-shortcut-primary"
            onClick={() => navigate('/tests/new')}
          >
            <span className="dash-shortcut-icon">🧪</span>
            <div className="dash-shortcut-text">
              <strong>ثبت آزمایش جدید</strong>
              <span>ورود دستی یا استخراج خودکار فاکتورها</span>
            </div>
            <span className="dash-shortcut-arrow">←</span>
          </button>

          <button
            type="button"
            className="dash-shortcut-card"
            onClick={() => navigate('/prescriptions/new')}
          >
            <span className="dash-shortcut-icon">💊</span>
            <div className="dash-shortcut-text">
              <strong>ثبت نسخه پزشک</strong>
              <span>داروها، دوز مصرفی و ساعات یادآوری</span>
            </div>
            <span className="dash-shortcut-arrow">←</span>
          </button>

          <button
            type="button"
            className="dash-shortcut-card"
            onClick={() => setIsTempAccessOpen(true)}
          >
            <span className="dash-shortcut-icon">⚡</span>
            <div className="dash-shortcut-text">
              <strong>صدور دسترسی اضطراری</strong>
              <span>تولید QR و رمز عبور پزشک اورژانس</span>
            </div>
            <span className="dash-shortcut-arrow">←</span>
          </button>

          <button
            type="button"
            className="dash-shortcut-card"
            onClick={() => navigate('/health-card')}
          >
            <span className="dash-shortcut-icon">🪪</span>
            <div className="dash-shortcut-text">
              <strong>کارت هوشمند سلامت</strong>
              <span>شناسنامه دیجیتال، چیپ و هولوگرام</span>
            </div>
            <span className="dash-shortcut-arrow">←</span>
          </button>
        </div>
      </section>

      {/* 5. Main Content Split: Recent Tests + Widgets */}
      <div className="dash-content-grid">
        {/* Column 1: Recent Tests & Vitals Tracker */}
        <div className="dash-main-col">
          {/* Recent Tests Widget */}
          <section className="dash-section-card">
            <header className="dash-section-header">
              <div className="dash-section-header-title">
                <span className="dash-section-icon" aria-hidden="true">🧪</span>
                <h2>آخرین آزمایش‌های ثبت‌شده</h2>
              </div>
              <Link to="/tests" className="dash-section-more-link">
                مشاهده همه آزمایش‌ها ({tests.length}) ←
              </Link>
            </header>

            {loading ? (
              <div className="dash-loading-wrap">
                <Skeleton variant="rounded" height={60} style={{ marginBottom: '10px' }} />
                <Skeleton variant="rounded" height={60} />
              </div>
            ) : recentTests.length === 0 ? (
              <div className="dash-empty-box">
                <span className="dash-empty-icon">🧪</span>
                <p>هنوز آزمایشی در پرونده سلامت شما ثبت نشده است.</p>
                <button
                  type="button"
                  className="dash-btn dash-btn-primary"
                  onClick={() => navigate('/tests/new')}
                >
                  + ثبت اولین آزمایش
                </button>
              </div>
            ) : (
              <div className="dash-recent-tests-list">
                {recentTests.map((test) => {
                  const isAbnormal = test.is_normal === false || test.status === 'abnormal' || test.is_critical;
                  const patientInfo = resolveMedicalIdentity(test);

                  return (
                    <div
                      key={test.id}
                      className={`dash-test-item ${isAbnormal ? 'dash-test-item-warn' : ''}`}
                      onClick={() => navigate('/tests')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') navigate('/tests'); }}
                    >
                      <div className="dash-test-item-icon">
                        {isAbnormal ? '⚠️' : '✓'}
                      </div>
                      <div className="dash-test-item-main">
                        <div className="dash-test-item-title-row">
                          <strong>{test.test_name || test.name || 'آزمایش بالینی'}</strong>
                          {isAbnormal ? (
                            <span className="dash-pill dash-pill-warn">نیاز به بررسی</span>
                          ) : (
                            <span className="dash-pill dash-pill-normal">نرمال</span>
                          )}
                        </div>
                        <div className="dash-test-item-meta">
                          <span>بیمار: {patientInfo.fullName}</span>
                          <span className="dash-meta-sep">•</span>
                          <span>آزمایشگاه: {test.lab_name || 'ثبت نشده'}</span>
                          <span className="dash-meta-sep">•</span>
                          <span>
                            {test.test_date || test.created_at ? (
                              new Date(test.test_date || test.created_at).toLocaleDateString('fa-IR-u-ca-persian-nu-latn')
                            ) : '—'}
                          </span>
                        </div>
                      </div>
                      <span className="dash-test-item-arrow">←</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Vitals & Health Summary View */}
          <section className="dash-section-card">
            <header className="dash-section-header">
              <div className="dash-section-header-title">
                <span className="dash-section-icon" aria-hidden="true">📈</span>
                <h2>خلاصه شاخص‌های سلامت و بالینی</h2>
              </div>
            </header>
            <HealthSummaryView
              profile={profile}
              reminders={reminders}
              summary={healthSummary || EMPTY_HEALTH_SUMMARY}
              onChange={setHealthSummary}
              onRefresh={refreshData}
            />
          </section>
        </div>

        {/* Column 2: Side Widgets */}
        <aside className="dash-side-col">
          {/* Upcoming Checkups Widget */}
          <section className="dash-side-card">
            <UpcomingCheckupsWidget
              reminders={reminders}
              onAddClick={() => navigate('/reminders')}
              onComplete={handleCompleteReminder}
              onDelete={handleDeleteReminder}
            />
          </section>

          {/* Smart Card Quick Teaser */}
          <section className="dash-side-card dash-card-teaser">
            <header className="dash-teaser-header">
              <span className="dash-teaser-icon">🪪</span>
              <div>
                <strong>کارت سلامت هوشیار شما</strong>
                <span>شناسنامه دیجیتال و اورژانس</span>
              </div>
            </header>
            <p className="dash-teaser-desc">
              کارت هوشمند سلامت شامل کد ملی رمزنگاری‌شده، کیوآر کد اصالت و دسترسی اضطراری پزشک معالج است.
            </p>
            <div className="dash-teaser-actions">
              <Link to="/health-card" className="dash-btn dash-btn-primary dash-btn-block">
                مشاهده کارت هوشمند ←
              </Link>
            </div>
          </section>
        </aside>
      </div>

      {/* Emergency Access Modal */}
      {isTempAccessOpen && (
        <TemporaryAccessModal
          isOpen={isTempAccessOpen}
          onClose={() => setIsTempAccessOpen(false)}
          profile={profile}
          tests={tests}
          healthSummary={healthSummary}
        />
      )}
    </div>
  );
};

export default Dashboard;