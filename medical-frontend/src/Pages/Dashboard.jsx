import { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import API from '../api';
import NotificationBell from '../components/NotificationBell';
import UserMenu from '../components/UserMenu';
import UpcomingCheckupsWidget from '../components/UpcomingCheckupsWidget';
import HealthSummaryView from '../components/healthSummary/HealthSummaryView';
import TemporaryAccessModal from '../components/TemporaryAccessModal';
import OnboardingTour from '../components/OnboardingTour';
import { fetchRemindersApi, completeReminderApi, deleteReminderApi } from '../utils/reminderUtils';
import { getHealthSummaryApi } from '../utils/healthSummaryUtils';
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

const TOUR_STEPS = [
  {
    selector: '.app-nav-tabs, .app-mobile-nav',
    title: 'ناوبری سراسری سامانه',
    description: 'از طریق این نوار می‌توانید به راحتی به بخش‌های پیشخوان، پرونده آزمایش‌ها، نسخه‌های دارویی، کارت سلامت هوشیار، مدیریت دسترسی‌ها و تقویم مراقبت‌ها دسترسی داشته باشید.',
  },
  {
    selector: '.dash-metrics-grid',
    title: 'شاخص‌ها و آمارهای کلیدی سلامت',
    description: 'خلاصه وضعیت پرونده شما شامل تعداد آزمایش‌ها، فاکتورهای نیازمند بررسی، نسخه‌های فعال دارویی، وضعیت کارت سلامت و یادآورهای پزشکی در یک نگاه.',
  },
  {
    selector: '.dash-metric-card-health',
    title: 'کارت هوشیار و دسترسی پزشک',
    description: 'با فشردن دکمه «⚡ دسترسی پزشک»، یک کد QR و رمز عبور موقت با اعتبار مشخص برای پزشک معالج یا کادر اورژانس صادر می‌شود.',
  },
  {
    selector: '.dash-reminders-section',
    title: 'تقویم چکاپ‌ها و یادآورها',
    description: 'مشاهده نوبت‌های چکاپ دوره‌ای، یادآوری مصرف داروها و پیگیری مراقبت‌های پزشکی در یک چیدمان منظم.',
  },
  {
    selector: '.dash-summary-section',
    title: 'پرونده سوابق بالینی (PHR)',
    description: 'ثبت و پایش بیماری‌های مزمن، داروهای مصرفی جاری، آلرژی‌ها و حساسیت‌های دارویی، واکسیناسیون و قابلیت چاپ دوسیه بیمار.',
  },
  {
    selector: '.dash-greeting-actions',
    title: 'مرکز اعلانات و راهنمای سامانه',
    description: 'بررسی درخواست‌های دسترسی پزشکان، تنظیمات پروفایل و امکان باز کردن مجدد همین راهنما در هر زمان با زدن دکمه «راهنمای سامانه».',
  },
];

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
  const [pendingTests, setPendingTests] = useState([]);

  // Modals & Tour
  const [isTempAccessOpen, setIsTempAccessOpen] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);

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
        const [testsRes, prescRes, profileRes, remindersData, summaryData, inboxRes, testInboxRes] = await Promise.all([
          API.get('test-results/').catch(() => ({ data: [] })),
          API.get('prescriptions/').catch(() => ({ data: [] })),
          API.get('patients/me/').catch(() => ({ data: null })),
          fetchRemindersApi().catch(() => []),
          getHealthSummaryApi().catch(() => EMPTY_HEALTH_SUMMARY),
          API.get('access/inbox/').catch(() => ({ data: [] })),
          API.get('test-results/inbox/').catch(() => ({ data: [] })),
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
          setPendingTests(Array.isArray(testInboxRes.data) ? testInboxRes.data : testInboxRes.data?.results || []);

          if (profileRes.data?.has_seen_tour === false) {
            setIsTourActive(true);
          }
        }
      } catch (err) {
        if (!ignore) {
          if (err.response?.status === 401) {
            if (logout) logout();
            navigate('/login');
            return;
          }
          toast.error('خطا در دریافت خلاصه اطلاعات پیشخوان.');
        }
      }
    };

    loadDashboardData();
    return () => {
      ignore = true;
    };
  }, [logout, navigate]);

  // Complete / skip tour and sync with database
  const finishTour = async () => {
    setIsTourActive(false);
    try {
      await API.patch('patients/me/', { has_seen_tour: true });
      setProfile((prev) => (prev ? { ...prev, has_seen_tour: true } : prev));
    } catch (error) {
      console.error('خطا در ذخیره وضعیت راهنما در دیتابیس:', error);
    }
  };

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

  // Review incoming pending test result (approve or reject)
  const handleReviewTest = async (testId, action) => {
    try {
      const res = await API.post(`test-results/${testId}/review/`, { action });
      if (action === 'approve') {
        toast.success(res.data?.detail || 'آزمایش با موفقیت تایید و به پرونده اضافه شد.');
      } else {
        toast.info(res.data?.detail || 'آزمایش با موفقیت رد شد.');
      }
      setPendingTests((prev) => prev.filter((t) => t.id !== testId));
      // Refresh tests list so approved test appears or rejected test disappears
      const testsRes = await API.get('test-results/').catch(() => ({ data: [] }));
      const testList = Array.isArray(testsRes.data)
        ? testsRes.data
        : testsRes.data?.results || [];
      setTests(testList);
    } catch {
      toast.error('خطا در تعیین وضعیت آزمایش.');
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
          <button
            type="button"
            className="dash-tour-btn"
            onClick={() => setIsTourActive(true)}
            title="راهنمای تعاملی سامانه"
            aria-label="راهنمای تعاملی سامانه"
          >
            <span aria-hidden="true">💡</span>
            <span>راهنمای سامانه</span>
          </button>
          <NotificationBell
            pendingTests={pendingTests}
            accessRequests={accessRequests}
            onReviewTest={handleReviewTest}
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
            onOpenTour={() => setIsTourActive(true)}
          />
        </div>
      </header>

      {/* 2a. Pending Tests Approval Banner (when someone records a test for this patient) */}
      {pendingTests.length > 0 && (
        <section className="dash-inbox-banner" aria-label="آزمایش‌های در انتظار تأیید شما" style={{ borderColor: 'var(--primary)' }}>
          <div className="dash-inbox-head">
            <span className="dash-inbox-badge" style={{ backgroundColor: 'rgba(15, 118, 110, 0.12)', color: 'var(--primary)' }}>
              🧪 {pendingTests.length} آزمایش در انتظار تأیید شما
            </span>
            <Link to="/tests" className="dash-inbox-link">مدیریت همه آزمایش‌ها ←</Link>
          </div>
          <div className="dash-inbox-list">
            {pendingTests.map((t) => (
              <div key={t.id} className="dash-inbox-item">
                <div className="dash-inbox-item-info">
                  <strong>{t.test_type_name || t.test_name || 'آزمایش بالینی'}</strong>
                  <span>
                    ثبت شده توسط: <strong>{t.creator_name || 'کاربر دیگر'}</strong>
                    {t.result_value != null && ` | مقدار: ${t.result_value}`}
                    {t.result_text && ` | نتیجه: ${t.result_text}`}
                    {` | تاریخ: ${t.test_date}`}
                  </span>
                </div>
                <div className="dash-inbox-item-actions">
                  <button
                    type="button"
                    className="dash-btn dash-btn-sm dash-btn-primary"
                    onClick={() => handleReviewTest(t.id, 'approve')}
                  >
                    تأیید و ثبت در پرونده
                  </button>
                  <button
                    type="button"
                    className="dash-btn dash-btn-sm dash-btn-ghost"
                    onClick={() => handleReviewTest(t.id, 'reject')}
                  >
                    رد
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2b. Access Requests Inbox Notification (if any) */}
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
        <article className="dash-metric-card dash-metric-card-health">
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
              <span aria-hidden="true">⚡</span>
              <span>دسترسی پزشک</span>
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

      {/* 4. Reminders & Periodic Checkups (Full Width Responsive Grid) */}
      <section className="dash-reminders-section">
        <UpcomingCheckupsWidget
          reminders={reminders}
          onAddClick={() => navigate('/reminders')}
          onComplete={handleCompleteReminder}
          onDelete={handleDeleteReminder}
        />
      </section>

      {/* 5. Vitals & Clinical Health Summary (PHR) */}
      <section className="dash-section-card dash-summary-section">
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

      {/* Interactive Onboarding Tour */}
      <OnboardingTour
        steps={TOUR_STEPS}
        active={isTourActive}
        onFinish={finishTour}
      />
    </div>
  );
};

export default Dashboard;