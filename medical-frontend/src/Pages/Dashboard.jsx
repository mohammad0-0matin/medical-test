import { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import API from '../api';
import AddTestModal from '../components/AddTestModal';
import EditTestModal from '../components/EditTestModal';
import AttachmentModal from '../components/AttachmentModal';
import PatientChartModal from '../components/PatientChartModal';
import { toast } from 'react-toastify';
import CompleteProfileModal from '../components/CompleteProfileModal';
import TemporaryAccessModal from '../components/TemporaryAccessModal';
import HealthCard from '../components/HealthCard';
import PrintableReport from '../components/PrintableReport';
import UserMenu from '../components/UserMenu';
import NotificationBell from '../components/NotificationBell';
import MedicalTimeline from '../components/MedicalTimeline';
import Footer from '../components/Footer';
import Skeleton from '../components/Skeleton';
import { exportTestsToCsv } from '../utils/exportToCsv';
import { resolveMedicalIdentity } from '../utils/medicalIdentity';
import { useReactToPrint } from 'react-to-print';
import './Dashboard.css';

const SpreadsheetGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3.5" y="4" width="17" height="16" rx="2" />
    <path d="M3.5 9h17M9.8 9v11M15.4 9v11M3.5 14.5h17" />
  </svg>
);

/* ---------- Skeleton compositions (matching real layout dimensions) ---------- */

const StatsRowSkeleton = () => (
  <div
    style={styles.statsContainer}
    role="status"
    aria-busy="true"
    aria-live="polite"
  >
    <span className="sk-sr-only">در حال دریافت آمار آزمایش‌ها...</span>
    {[0, 1, 2, 3].map((index) => (
      <div key={index} style={{ ...styles.statCard, minHeight: '128px' }}>
        <Skeleton variant="text" width="55%" height={13} />
        <Skeleton variant="rounded" width={68} height={38} style={{ marginTop: '16px' }} />
      </div>
    ))}
  </div>
);

const HealthCardSkeleton = () => (
  <section className="hc-scene" role="status" aria-busy="true" aria-live="polite">
    <span className="sk-sr-only">در حال دریافت کارت سلامت دیجیتال...</span>
    <div className="hc-card" style={{ minHeight: '196px', justifyContent: 'space-between', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Skeleton variant="circle" width={34} height={34} />
          <Skeleton variant="text" width={132} height={13} />
        </div>
        <Skeleton variant="rounded" width={76} height={26} style={{ borderRadius: '9999px' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '20px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Skeleton variant="text" width="46%" height={22} style={{ borderRadius: '8px' }} />
          <Skeleton variant="text" width="30%" height={11} />
          <Skeleton variant="text" width="38%" height={15} />
        </div>
        <Skeleton variant="rounded" width={84} height={84} style={{ borderRadius: '14px' }} />
      </div>
    </div>
  </section>
);

const InboxSkeleton = () => (
  <div
    role="status"
    aria-busy="true"
    aria-live="polite"
    style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '24px',
    }}
  >
    <span className="sk-sr-only">در حال دریافت صندوق پیام‌ها و درخواست‌های دسترسی...</span>
    <Skeleton variant="text" width="42%" height={17} style={{ marginBottom: '16px' }} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {[0, 1].map((index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            backgroundColor: 'var(--bg-page)',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
            <Skeleton variant="circle" width={34} height={34} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <Skeleton variant="text" width={`${64 - index * 18}%`} height={12} />
              <Skeleton variant="text" width={`${42 + index * 12}%`} height={10} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Skeleton variant="rounded" width={82} height={32} />
            <Skeleton variant="rounded" width={70} height={32} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const AccessListSkeleton = ({ titleWidth = '60%' }) => (
  <div
    role="status"
    aria-busy="true"
    aria-live="polite"
    style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '24px',
    }}
  >
    <span className="sk-sr-only">در حال دریافت اطلاعات دسترسی‌ها...</span>
    <Skeleton variant="text" width={titleWidth} height={17} style={{ marginBottom: '16px' }} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {[0, 1].map((index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            backgroundColor: 'var(--bg-page)',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
          }}
        >
          <Skeleton variant="text" width={`${58 - index * 16}%`} height={13} />
          <Skeleton variant="rounded" width={88} height={30} />
        </div>
      ))}
    </div>
  </div>
);

const TABLE_SKELETON_WIDTHS = ['36px', '20%', '24%', '12%', '15%', '15%', '13%', '14%', '17%', '13%'];

const TableSkeleton = () => (
  <div
    style={styles.tableWrapper}
    role="status"
    aria-busy="true"
    aria-live="polite"
  >
    <span className="sk-sr-only">در حال دریافت لیست آزمایش‌ها...</span>
    <div style={styles.tableContainer}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ردیف</th>
            <th style={styles.th}>نام بیمار</th>
            <th style={styles.th}>نوع آزمایش</th>
            <th style={styles.th}>نتیجه</th>
            <th style={styles.th}>وضعیت پزشکی</th>
            <th style={styles.th}>وضعیت تایید</th>
            <th style={styles.th}>تاریخ ثبت</th>
            <th style={styles.th}>ثبت‌کننده</th>
            <th style={styles.th}>پیوست‌ها و نمودار</th>
            <th style={styles.th}>عملیات</th>
          </tr>
        </thead>
        <tbody>
          {[0, 1, 2, 3, 4].map((rowIndex) => (
            <tr key={rowIndex} style={styles.tr}>
              {TABLE_SKELETON_WIDTHS.map((_, colIndex) => {
                const width =
                  TABLE_SKELETON_WIDTHS[(colIndex + rowIndex * 3) % TABLE_SKELETON_WIDTHS.length];
                return (
                  <td key={colIndex} style={colIndex === 9 ? styles.tdActions : styles.td}>
                    <Skeleton variant="text" height={12} style={{ width }} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const Dashboard = () => {
  const { logout } = useContext(AuthContext);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isTempAccessOpen, setIsTempAccessOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [personFilter, setPersonFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'none' });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [childNationalCode, setChildNationalCode] = useState('');
  const [pendingTests, setPendingTests] = useState([]);
  const [profile, setProfile] = useState(null);

  // استیت افراد تحت مراقبت من
  const [myDependents, setMyDependents] = useState([]);

  // استیت دسترسی‌های فعال به پرونده من
  const [grantedAccesses, setGrantedAccesses] = useState([]);

  // استیت صندوق پیام درخواست‌های دسترسی
  const [accessRequests, setAccessRequests] = useState([]);

  // استیت‌های اسکلتون بارگذاری اولیه
  const [profileLoading, setProfileLoading] = useState(true);
  const [accessLoading, setAccessLoading] = useState(true);

  // استیت خروجی اکسل
  const [isExporting, setIsExporting] = useState(false);

  // حالت نمایش نتایج: جدول یا تایم‌لاین (ذخیره محلی)
  const VIEW_MODE_KEY = 'salamatyar_view_mode';
  const [viewMode, setViewMode] = useState(() =>
    localStorage.getItem(VIEW_MODE_KEY) === 'timeline' ? 'timeline' : 'table'
  );

  const changeViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {
      /* storage unavailable */
    }
  };

  // تنظیمات پرینت و خروجی PDF
  const printRef = useRef(null);
  const handlePrintReport = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'گزارش آزمایش‌ها - سلامت‌یار',
  });

  // خروجی اکسل از نتایج فیلتر و مرتب شده (کل لیست، نه فقط صفحه جاری)
  const handleExportExcel = () => {
    if (!visibleTests.length) {
      toast.info('هیچ آزمایشی برای خروجی اکسل وجود ندارد.');
      return;
    }

    setIsExporting(true);
    try {
      exportTestsToCsv(visibleTests);
      toast.success(`📊 خروجی اکسل ${visibleTests.length} آزمایش با موفقیت دانلود شد.`);
    } catch (exportError) {
      console.error('Export error:', exportError);
      toast.error('خطا در تولید فایل اکسل.');
    } finally {
      setIsExporting(false);
    }
  };

  // دریافت اطلاعات پروفایل کاربر لاگین شده
  const fetchProfile = async () => {
    setProfileLoading(true);
    try {
      const res = await API.get('patients/me/');
      setProfile(res.data);
    } catch (err) {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  // دریافت لیست افراد تحت مراقبت
  const fetchMyDependents = async () => {
    try {
      const response = await API.get('access/dependents/');
      setMyDependents(response.data);
    } catch (error) {
      console.error("خطا در دریافت لیست افراد تحت مراقبت:", error);
    }
  };

  // دریافت لیست کسانی که به پرونده من دسترسی دارند
  const fetchGrantedAccesses = async () => {
    try {
      const response = await API.get('access/granted/');
      setGrantedAccesses(response.data);
    } catch (error) {
      console.error("خطا در دریافت لیست دسترسی‌ها:", error);
    }
  };

  // دریافت درخواست‌های در انتظار تایید دسترسی
  const fetchAccessRequests = async () => {
    try {
      const response = await API.get('access/inbox/');
      setAccessRequests(response.data);
    } catch (error) {
      console.error("خطا در دریافت درخواست‌های دسترسی:", error);
    }
  };

  // دریافت صندوق آزمایش‌های در انتظار تایید
  const fetchPendingTests = async () => {
    try {
      const response = await API.get('test-results/inbox/');
      setPendingTests(response.data);
    } catch (error) {
      console.error("خطا در دریافت صندوق پیام آزمایش‌ها:", error);
    }
  };

  // دریافت تمام آزمایش‌ها
  const fetchTests = async () => {
    setLoading(true);
    try {
      const response = await API.get('test-results/');
      setTests(response.data.results || response.data);
      setLoading(false);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('خطا در دریافت لیست آزمایش‌ها.');
      setLoading(false);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      await Promise.all([
        fetchTests(),
        fetchPendingTests(),
        fetchAccessRequests(),
        fetchGrantedAccesses(),
        fetchMyDependents(),
        fetchProfile(),
      ]);
      setAccessLoading(false);
    };
    bootstrap();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, typeFilter, personFilter]);

  // لغو دسترسی یک شخص
  const handleRevokeAccess = async (id) => {
    if (!window.confirm("آیا از لغو دسترسی این شخص مطمئن هستید؟")) return;
    try {
      const res = await API.delete(`access/${id}/revoke/`);
      toast.success(res.data?.message || 'دسترسی با موفقیت لغو شد.');
      fetchGrantedAccesses();
    } catch (err) {
      toast.error(err.response?.data?.error || 'خطا در لغو دسترسی.');
    }
  };

  // تایید یا رد درخواست دسترسی
  const handleRespondAccess = async (id, actionType) => {
    try {
      const res = await API.post(`access/${id}/respond/`, { action: actionType });
      toast.success(res.data?.message || 'عملیات با موفقیت انجام شد.');
      fetchAccessRequests();
      fetchTests();
    } catch (err) {
      toast.error(err.response?.data?.error || 'خطا در ثبت پاسخ.');
    }
  };

  // ارسال درخواست دسترسی به پرونده یک شخص با کد ملی
  const handleAddDependent = async (e) => {
    e.preventDefault();
    if (!childNationalCode) return;
    try {
      const res = await API.post('access/request/', { national_code: childNationalCode });
      toast.success(res.data?.message || 'درخواست با موفقیت ارسال شد.');
      setChildNationalCode('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'خطا در ارسال درخواست.');
    }
  };

  // تایید یا رد آزمایش ثبت شده توسط دیگران
  const handleReviewTest = async (testId, actionType) => {
    try {
      await API.post(`test-results/${testId}/review/`, { action: actionType });
      toast.success(actionType === 'approve' ? '✅ آزمایش تایید و به پرونده اضافه شد.' : '❌ آزمایش رد و حذف شد.');
      fetchPendingTests(); 
      fetchTests(); 
    } catch (error) {
      console.error('خطا:', error);
      toast.error('خطا در انجام عملیات.');
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = window.confirm('آیا از حذف این نتیجه آزمایش اطمینان دارید؟');
    if (!isConfirmed) return;
    try {
      await API.delete(`test-results/${id}/`);
      toast.success('آزمایش با موفقیت حذف شد!');
      fetchTests();
    } catch (err) {
      toast.error('خطا در حذف آزمایش.');
    }
  };

  const handleEditClick = (test) => {
    setSelectedTest(test);
    setIsEditModalOpen(true);
  };

  const handleAttachmentClick = (test) => {
    setSelectedTest(test);
    setIsAttachmentModalOpen(true);
  };

  const handleChartClick = (test) => {
    setSelectedTest(test);
    setIsChartModalOpen(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Intl.DateTimeFormat('fa-IR').format(new Date(dateString));
  };

  const getTestStatus = (val, min, max) => {
    if (val === null || val === undefined || min === null || min === undefined || max === null || max === undefined) return 'unknown';
    const numVal = parseFloat(val);
    const numMin = parseFloat(min);
    const numMax = parseFloat(max);
    
    if (isNaN(numVal) || isNaN(numMin) || isNaN(numMax)) return 'unknown';
    if (numVal >= numMin && numVal <= numMax) return 'normal';
    return 'abnormal';
  };

  const renderStatusBadge = (status) => {
    if (status === 'normal') return <span style={styles.badgeSuccess}>✅ نرمال</span>;
    if (status === 'abnormal') return <span style={styles.badgeDanger}>⚠️ غیرنرمال</span>;
    return <span style={styles.badgeNeutral}>⚪ نامشخص</span>;
  };

  const renderApprovalStatus = (status) => {
    switch(status) {
      case 'approved': 
        return <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: 'var(--success-bg)', color: 'var(--success-text)', fontWeight: 'bold' }}>✅ تایید شده</span>;
      case 'pending': 
        return <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: 'var(--warn-bg)', color: 'var(--warn-text)', fontWeight: 'bold' }}>⏳ در انتظار</span>;
      case 'rejected': 
        return <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', fontWeight: 'bold' }}>❌ رد شده</span>;
      default: 
        return <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: 'var(--neutral-bg)', color: 'var(--neutral-text)' }}>نامشخص</span>;
    }
  };

  // گزینه‌های نوع آزمایش به صورت پویا از داده‌های بارگذاری شده
  const testTypeOptions = useMemo(
    () => [...new Set(tests.map((t) => t.test_type_name).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'fa')),
    [tests]
  );

  // کدهای ملی افراد تحت مراقبت برای فیلتر مالکیت
  const dependentCodes = useMemo(
    () => new Set(myDependents.map((d) => d.national_code).filter(Boolean)),
    [myDependents]
  );

  const profileNationalCode = profile?.national_code || '';

  // نقش کاربری و هویت پزشکی (سرور → محلی → استاندارد)
  const medicalIdentity = useMemo(
    () => resolveMedicalIdentity(profile),
    [profile]
  );

  // مرحله ۱: فیلتر (جستجو + وضعیت + نوع آزمایش + مالکیت)
  const filteredTests = tests.filter((test) => {
    const fullName = `${test.patient?.first_name || ''} ${test.patient?.last_name || ''}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase());
    const status = getTestStatus(test.result_value, test.min_range ?? test.lab_min_range, test.max_range ?? test.lab_max_range);
    const matchesStatus = filterStatus === 'all' || status === filterStatus;
    const matchesType = typeFilter === 'all' || test.test_type_name === typeFilter;

    let matchesPerson = true;
    if (personFilter === 'mine') {
      matchesPerson = !!profileNationalCode && test.patient?.national_code === profileNationalCode;
    } else if (personFilter === 'dependents') {
      matchesPerson = dependentCodes.has(test.patient?.national_code);
    }

    return matchesSearch && matchesStatus && matchesType && matchesPerson;
  });

  // مرحله ۲: مرتب‌سازی ستونی (تاریخ / نتیجه) با پایداری و هندل مقادیر خالی
  let visibleTests = filteredTests;
  if (sortConfig.key && sortConfig.direction !== 'none') {
    const parseValue = (test) => {
      if (sortConfig.key === 'test_date') {
        const time = new Date(test.test_date).getTime();
        return Number.isNaN(time) ? null : time;
      }
      if (test.result_value !== null && test.result_value !== undefined && test.result_value !== '') {
        const num = parseFloat(test.result_value);
        if (!Number.isNaN(num)) return num;
      }
      return null;
    };

    const factor = sortConfig.direction === 'asc' ? 1 : -1;

    visibleTests = [...filteredTests].sort((a, b) => {
      const valueA = parseValue(a);
      const valueB = parseValue(b);

      // مقادیر خالی همیشه در انتها قرار می‌گیرند
      if (valueA === null && valueB === null) return 0;
      if (valueA === null) return 1;
      if (valueB === null) return -1;

      return (valueA - valueB) * factor;
    });
  }

  const stats = {
    total: tests.length,
    normal: tests.filter(t => getTestStatus(t.result_value, t.min_range ?? t.lab_min_range, t.max_range ?? t.lab_max_range) === 'normal').length,
    abnormal: tests.filter(t => getTestStatus(t.result_value, t.min_range ?? t.lab_min_range, t.max_range ?? t.lab_max_range) === 'abnormal').length,
    unknown: tests.filter(t => getTestStatus(t.result_value, t.min_range ?? t.lab_min_range, t.max_range ?? t.lab_max_range) === 'unknown').length,
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTests = visibleTests.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(visibleTests.length / itemsPerPage);

  // تغییر جهت مرتب‌سازی: صعودی → نزولی → بدون مرتب‌سازی
  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return { key: null, direction: 'none' };
    });
  };

  const renderSortableTh = (label, sortKey, thStyle) => {
    const isActive = sortConfig.key === sortKey;
    const direction = isActive ? sortConfig.direction : 'none';
    return (
      <th
        style={thStyle}
        aria-sort={isActive ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <button
          type="button"
          className={`th-sort ${isActive ? `th-sort-active sort-${direction}` : ''}`}
          onClick={() => handleSort(sortKey)}
          title={isActive
            ? (direction === 'asc' ? 'مرتب‌سازی نزولی' : 'حذف مرتب‌سازی')
            : 'مرتب‌سازی صعودی'}
        >
          {label}
          <span className="sort-arrows" aria-hidden="true">
            <svg viewBox="0 0 12 14">
              <path className="p-top" d="M6 1.2L1.8 5.4h8.4z" />
              <path className="p-bottom" d="M6 12.8L1.8 8.6h8.4z" />
            </svg>
          </span>
        </button>
      </th>
    );
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>داشبورد مدیریت آزمایش‌ها</h1>
        <div style={styles.headerButtons}>
          <button onClick={() => setIsAddModalOpen(true)} style={styles.addBtn}>
            + ثبت آزمایش جدید
          </button>

          <button
            onClick={() => setIsTempAccessOpen(true)}
            style={{
              ...styles.addBtn,
              background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
              boxShadow: '0 8px 18px -8px rgba(124, 58, 237, 0.6)',
            }}
          >
            ⚡ دسترسی اضطراری پزشک
          </button>

          <TemporaryAccessModal
            isOpen={isTempAccessOpen}
            onClose={() => setIsTempAccessOpen(false)}
            profile={profile}
            tests={tests}
          />

          <CompleteProfileModal
              isOpen={isProfileModalOpen}
              onClose={() => setIsProfileModalOpen(false)}
              onProfileUpdated={() => {
                  fetchTests();
                  fetchProfile();
              }}
          />

          <NotificationBell
            pendingTests={pendingTests}
            accessRequests={accessRequests}
            onReviewTest={handleReviewTest}
            onRespondAccess={handleRespondAccess}
          />

          <UserMenu
            fullName={profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : ''}
            nationalCode={profile?.national_code || ''}
            medicalRole={medicalIdentity.role}
            medicalId={medicalIdentity.id}
            onOpenProfile={() => setIsProfileModalOpen(true)}
            onLogout={logout}
          />
        </div>
      </header>

      <main style={styles.main}>
        {error && <div style={styles.errorMessage}>{error}</div>}

        {/* کارت سلامت دیجیتال */}
        {profileLoading && !profile ? (
          <HealthCardSkeleton />
        ) : (
          <HealthCard
            firstName={profile?.first_name}
            lastName={profile?.last_name}
            nationalCode={profile?.national_code}
            medicalRole={medicalIdentity.role}
            medicalId={medicalIdentity.id}
          />
        )}

        {/* ۱ و ۲. صندوق‌های پیام (آزمایش‌ها و درخواست‌های دسترسی) */}
        {accessLoading ? (
          <InboxSkeleton />
        ) : (
          <>
            {pendingTests.length > 0 && (
          <div style={{ backgroundColor: 'var(--warn-bg)', border: '1px solid var(--warn-text)', borderRadius: '12px', padding: '20px', marginBottom: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ color: 'var(--warn-text)', marginTop: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem' }}>
              📥 صندوق پیام: شما {pendingTests.length} آزمایش در انتظار تایید دارید!
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingTests.map(test => (
                <div key={test.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '1rem', color: 'var(--text-body)', lineHeight: '1.6' }}>
                    آزمایش <strong>{test.test_type_name}</strong> با نتیجه <strong>{test.result_value ?? test.result_text}</strong> <br/>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      ثبت شده توسط <span style={{ color: 'var(--link-color, #2563eb)', fontWeight: 'bold' }}>{test.creator_name || 'نامشخص'}</span> در تاریخ {formatDate(test.test_date)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => handleReviewTest(test.id, 'approve')} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                      ✅ تایید
                    </button>
                    <button onClick={() => handleReviewTest(test.id, 'reject')} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                      ❌ رد
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ۲. صندوق پیام درخواست‌های دسترسی دیگران */}
        {accessRequests.length > 0 && (
          <div style={{ backgroundColor: 'var(--info-bg, #eff6ff)', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '20px', marginBottom: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ color: '#1e3a8a', marginTop: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem' }}>
              🤝 صندوق درخواست‌ها: {accessRequests.length} نفر درخواست دسترسی به پرونده شما را دارند!
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {accessRequests.map(req => (
                <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '1rem', color: 'var(--text-body)', lineHeight: '1.6' }}>
                    <strong>{req.requester_name}</strong> درخواست دسترسی به نتایج آزمایش‌های شما را دارد.
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => handleRespondAccess(req.id, 'approve')} style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                      ✅ تایید دسترسی
                    </button>
                    <button onClick={() => handleRespondAccess(req.id, 'reject')} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                      ❌ رد درخواست
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
          </>
        )}

        {/* ۳ و ۴. مدیریت دسترسی‌ها و افراد تحت مراقبت */}
        {accessLoading ? (
          <>
            <AccessListSkeleton titleWidth="68%" />
            <AccessListSkeleton titleWidth="54%" />
          </>
        ) : (
          <>
        {/* ۳. مدیریت افرادی که به پرونده من دسترسی دارند */}
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <h3 style={{ color: 'var(--text-strong)', marginTop: 0, marginBottom: '16px', fontSize: '1.2rem' }}>
            🛡️ افرادی که به پرونده شما دسترسی دارند:
          </h3>
          
          {grantedAccesses.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', backgroundColor: 'var(--bg-subtle)', padding: '16px', borderRadius: '8px', border: '1px dashed var(--border)' }}>
              در حال حاضر هیچ شخص دیگری به نتایج آزمایش‌های شما دسترسی ندارد.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {grantedAccesses.map(access => (
                <div key={access.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-page)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '1rem', color: 'var(--text-body)' }}>
                    دسترسی فعال برای: <strong>{access.grantee_name}</strong>
                  </div>
                  <button onClick={() => handleRevokeAccess(access.id)} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                    لغو دسترسی
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ۴. افرادی که تحت مراقبت من هستند */}
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <h3 style={{ color: 'var(--text-strong)', marginTop: 0, marginBottom: '16px', fontSize: '1.2rem' }}>
            📋 افرادی که تحت مراقبت من هستند (دسترسی دارم):
          </h3>
          
          {myDependents.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', backgroundColor: 'var(--bg-subtle)', padding: '16px', borderRadius: '8px', border: '1px dashed var(--border)' }}>
              شما در حال حاضر به پرونده شخص دیگری دسترسی ندارید.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {myDependents.map(person => (
                <div key={person.access_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-page)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '1rem', color: 'var(--text-body)' }}>
                    نام بیمار: <strong>{person.patient_name}</strong> <br/>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>کد ملی: {person.national_code}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
          </>
        )}

        {/* آمار آزمایش‌ها */}
        {loading ? (
          <StatsRowSkeleton />
        ) : (
          <div style={styles.statsContainer}>
          <div style={{ ...styles.statCard, borderBottomColor: '#3b82f6' }}>
            <span style={styles.statTitle}>کل آزمایش‌ها</span>
            <span style={{ ...styles.statValue, color: '#3b82f6' }}>{stats.total}</span>
          </div>
          <div style={{ ...styles.statCard, borderBottomColor: '#10b981' }}>
            <span style={styles.statTitle}>نتایج نرمال</span>
            <span style={{ ...styles.statValue, color: '#10b981' }}>{stats.normal}</span>
          </div>
          <div style={{ ...styles.statCard, borderBottomColor: '#ef4444' }}>
            <span style={styles.statTitle}>نتایج غیرنرمال</span>
            <span style={{ ...styles.statValue, color: '#ef4444' }}>{stats.abnormal}</span>
          </div>
          <div style={{ ...styles.statCard, borderBottomColor: '#9ca3af' }}>
            <span style={styles.statTitle}>نامشخص</span>
            <span style={{ ...styles.statValue, color: 'var(--text-muted)' }}>{stats.unknown}</span>
          </div>
        </div>
        )}

        {/* فرم ارسال درخواست مراقبت */}
        <div style={{ backgroundColor: 'var(--bg-surface)', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-body)', fontSize: '15px' }}>درخواست دسترسی و افزودن فرد تحت مراقبت</h3>
          <form onSubmit={handleAddDependent} style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              placeholder="کد ملی شخص مورد نظر را وارد کنید..."
              value={childNationalCode}
              onChange={(e) => setChildNationalCode(e.target.value)}
              style={styles.searchInput}
            />
            <button type="submit" style={{ ...styles.addBtn, padding: '0.6rem 1.5rem' }}>
              ارسال درخواست
            </button>
          </form>
        </div>

        {/* بخش جستجو، فیلتر و دکمه پرینت */}
        <div style={styles.filterSection}>
          <input
            type="text"
            placeholder="🔍 جستجوی نام بیمار در آزمایش‌ها..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={styles.filterSelect}
            aria-label="فیلتر نوع آزمایش"
          >
            <option value="all">همه آزمایش‌ها</option>
            {testTypeOptions.map((typeName) => (
              <option key={typeName} value={typeName}>{typeName}</option>
            ))}
          </select>
          <div className="seg" role="group" aria-label="فیلتر مالکیت آزمایش">
            {[
              ['all', 'همه'],
              ['mine', 'آزمایش‌های من'],
              ['dependents', 'تحت مراقبت'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`seg-btn ${personFilter === value ? 'seg-active' : ''}`}
                onClick={() => setPersonFilter(value)}
                aria-pressed={personFilter === value}
              >
                {label}
              </button>
            ))}
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="normal">فقط نرمال</option>
            <option value="abnormal">فقط غیرنرمال</option>
            <option value="unknown">نامشخص</option>
          </select>
          <button onClick={handleExportExcel} disabled={isExporting} className="dashboard-btn-excel" style={styles.excelBtn}>
            {isExporting ? (<><span className="btn-spinner" />در حال آماده‌سازی...</>) : (<><SpreadsheetGlyph />خروجی اکسل</>)}
          </button>
          <button onClick={() => handlePrintReport()} style={styles.printBtn}>
            🖨️ چاپ / دانلود PDF
          </button>
        </div>

        {/* سوییچ حالت نمایش: جدول / تایم‌لاین */}
        <div className="view-toggle-row" role="group" aria-label="حالت نمایش نتایج">
          <span className="vt-label">نمایش نتایج:</span>
          <div className="seg">
            {[
              ['table', '📋 نمای جدول'],
              ['timeline', '🌿 نمای تایم‌لاین'],
            ].map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                className={`seg-btn ${viewMode === mode ? 'seg-active' : ''}`}
                onClick={() => changeViewMode(mode)}
                aria-pressed={viewMode === mode}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* جدول آزمایش‌ها */}
        {loading ? (
          <TableSkeleton />
        ) : viewMode === 'timeline' ? (
          <MedicalTimeline
            tests={visibleTests}
            onChart={handleChartClick}
            onAttachments={handleAttachmentClick}
            onEdit={handleEditClick}
          />
        ) : (
          <div style={styles.tableWrapper}>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>ردیف</th>
                    <th style={styles.th}>نام بیمار</th>
                    <th style={styles.th}>نوع آزمایش</th>
                    {renderSortableTh('نتیجه', 'result_value', styles.th)}
                    <th style={styles.th}>وضعیت پزشکی</th>
                    <th style={styles.th}>وضعیت تایید</th>
                    {renderSortableTh('تاریخ ثبت', 'test_date', styles.th)}
                    <th style={styles.th}>ثبت‌کننده</th>
                    <th style={styles.th}>پیوست‌ها و نمودار</th>
                    <th style={styles.th}>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTests.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={styles.emptyState}>
                        {tests.length === 0 ? 'هیچ آزمایشی یافت نشد.' : 'آزمایشی با این مشخصات پیدا نشد.'}
                      </td>
                    </tr>
                  ) : (
                    currentTests.map((test, index) => {
                      const status = getTestStatus(test.result_value, test.min_range ?? test.lab_min_range, test.max_range ?? test.lab_max_range);
                      const actualIndex = indexOfFirstItem + index + 1;
                      
                      return (
                        <tr key={test.id} style={styles.tr}>
                          <td style={styles.td}>{actualIndex}</td>
                          <td style={styles.td}>{test.patient_name || (test.patient?.first_name ? `${test.patient.first_name} ${test.patient.last_name}` : 'خودم')}</td>
                          <td style={styles.td}>{test.test_type_name}</td>
                          <td style={styles.td}><strong>{test.result_value ?? test.result_text}</strong></td>
                          <td style={styles.td}>{renderStatusBadge(status)}</td>
                          <td style={styles.td}>{renderApprovalStatus(test.status)}</td>
                          <td style={styles.td}>{formatDate(test.test_date)}</td>
                          <td style={styles.td}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-subtle)', padding: '4px 8px', borderRadius: '4px' }}>
                              {test.creator_name}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <button onClick={() => handleAttachmentClick(test)} style={styles.actionBtnAttachment}>
                              فایل‌ها ({test.attachments?.length || 0})
                            </button>
                            <button onClick={() => handleChartClick(test)} style={{...styles.actionBtnAttachment, backgroundColor: '#8b5cf6', marginRight: '5px'}}>
                              نمودار 📈
                            </button>
                          </td>
                          <td style={styles.tdActions}>
                            <button onClick={() => handleEditClick(test)} style={styles.actionBtnEdit}>ویرایش</button>
                            <button onClick={() => handleDelete(test.id)} style={styles.actionBtnDelete}>حذف</button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={styles.paginationContainer}>
                <button 
                  onClick={handlePrevPage} 
                  disabled={currentPage === 1} 
                  style={{...styles.pageBtn, opacity: currentPage === 1 ? 0.5 : 1}}
                >
                  قبلی
                </button>
                <span style={styles.pageInfo}>
                  صفحه <strong>{currentPage}</strong> از <strong>{totalPages}</strong>
                </span>
                <button 
                  onClick={handleNextPage} 
                  disabled={currentPage === totalPages} 
                  style={{...styles.pageBtn, opacity: currentPage === totalPages ? 0.5 : 1}}
                >
                  بعدی
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />

      <AddTestModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onTestAdded={fetchTests} />
      <EditTestModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onTestUpdated={fetchTests} testData={selectedTest} />
      <AttachmentModal isOpen={isAttachmentModalOpen} onClose={() => setIsAttachmentModalOpen(false)} testData={selectedTest} onUploadSuccess={() => { fetchTests(); setIsAttachmentModalOpen(false); }} />
      <PatientChartModal isOpen={isChartModalOpen} onClose={() => setIsChartModalOpen(false)} testData={selectedTest} allTests={tests} />

      {/* کامپوننت مخصوص خروجی چاپ و PDF */}
      <PrintableReport ref={printRef} tests={visibleTests} profile={profile} />
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', backgroundColor: 'var(--bg-page)', direction: 'rtl', fontFamily: 'Tahoma, Arial, sans-serif' },
  header: { backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', padding: '1rem 2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, fontSize: '1.25rem', color: 'var(--text-strong)' },
  headerButtons: { display: 'flex', gap: '0.75rem', alignItems: 'center' },
  addBtn: { padding: '0.5rem 1rem', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' },
  main: { padding: '2rem', maxWidth: '1200px', margin: '0 auto' },
  statsContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' },
  statCard: { backgroundColor: 'var(--bg-surface)', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '4px solid var(--border)', cursor: 'default' },
  statTitle: { fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '0.5rem' },
  statValue: { fontSize: '2.5rem', fontWeight: '900', lineHeight: '1' },
  filterSection: { display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', backgroundColor: 'var(--bg-surface)', padding: '1rem', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', alignItems: 'center' },
  searchInput: { flex: 2, minWidth: '200px', padding: '0.6rem 1rem', border: '1px solid var(--border-input)', borderRadius: '6px', fontSize: '0.95rem', outline: 'none', backgroundColor: 'var(--bg-input)', color: 'var(--text-strong)' },
  filterSelect: { flex: 1, padding: '0.6rem 1rem', border: '1px solid var(--border-input)', borderRadius: '6px', fontSize: '0.95rem', outline: 'none', cursor: 'pointer', backgroundColor: 'var(--bg-input)', color: 'var(--text-strong)' },
  printBtn: { padding: '0.6rem 1.5rem', backgroundColor: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' },
  excelBtn: { padding: '0.6rem 1.5rem', background: 'linear-gradient(135deg, #059669, #10b981)', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', boxShadow: '0 8px 18px -8px rgba(5, 150, 105, 0.6)' },
  errorMessage: { backgroundColor: 'var(--error-bg)', color: 'var(--error-text)', padding: '1rem', borderRadius: '6px', marginBottom: '1rem' },
  tableWrapper: { backgroundColor: 'var(--bg-surface)', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
  tableContainer: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'right' },
  th: { backgroundColor: 'var(--bg-subtle)', padding: '1rem', color: 'var(--text-body)', fontWeight: '600', borderBottom: '2px solid var(--border)', fontSize: '0.9rem', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '1rem', color: 'var(--text-body)', fontSize: '0.9rem' },
  tdActions: { padding: '1rem', display: 'flex', gap: '0.5rem' },
  emptyState: { textAlign: 'center', padding: '2rem', color: 'var(--text-faint)' },
  badgeSuccess: { backgroundColor: 'var(--success-bg)', color: 'var(--success-text)', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 'bold' },
  badgeDanger: { backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 'bold' },
  badgeNeutral: { backgroundColor: 'var(--neutral-bg)', color: 'var(--neutral-text)', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem' },
  actionBtnEdit: { padding: '0.35rem 0.75rem', backgroundColor: '#eab308', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' },
  actionBtnDelete: { padding: '0.35rem 0.75rem', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' },
  actionBtnAttachment: { padding: '0.35rem 0.75rem', backgroundColor: '#6b7280', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' },
  paginationContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem', borderTop: '1px solid var(--border)', gap: '1rem', backgroundColor: 'var(--bg-page)', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' },
  pageBtn: { padding: '0.4rem 1rem', backgroundColor: 'var(--bg-surface)', color: 'var(--text-body)', border: '1px solid var(--border-input)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' },
  pageInfo: { fontSize: '0.9rem', color: 'var(--text-body)' }
};

export default Dashboard;