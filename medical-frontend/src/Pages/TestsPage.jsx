import { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import API from '../api';
import EditTestModal from '../components/EditTestModal';
import AttachmentModal from '../components/AttachmentModal';
import PatientChartModal from '../components/PatientChartModal';
import ClinicalNotesModal from '../components/ClinicalNotesModal';
import TestComparisonModal from '../components/TestComparisonModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import PrintableReport from '../components/PrintableReport';
import MedicalTimeline from '../components/MedicalTimeline';
import AiHealthAdvisor from '../components/AiHealthAdvisor';
import Skeleton from '../components/Skeleton';
import { exportTestsToCsv } from '../utils/exportToCsv';
import { resolveMedicalIdentity } from '../utils/medicalIdentity';
import { getAllClinicalNotes, getClinicalNotePreview } from '../utils/clinicalNotesUtils';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-toastify';
import './TestsPage.css';

/**
 * Dedicated Tests Dashboard Page (route `/tests`).
 *
 * Provides a specialized, high-focus workspace for managing lab tests:
 * - Direct primary CTA button: "ثبت آزمایش جدید" routing to `/tests/new`
 * - Filtering by medical status, test type, and family members
 * - Live search, multi-column sorting, and Excel/CSV export
 * - View modes: Interactive Table, Medical Timeline, and AI Health Advisor
 * - Full modal support: Edit, Attachments, Trend Chart, Comparison, Notes, and Delete
 *
 * @returns {JSX.Element} Tests page view.
 */
const TestsPage = () => {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);

  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter and Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [personFilter, setPersonFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // View Mode: 'table' | 'timeline' | 'ai'
  const [viewMode, setViewMode] = useState('table');

  // Dependents and Profile
  const [profile, setProfile] = useState(null);
  const [myDependents, setMyDependents] = useState([]);
  const [clinicalNotesMap, setClinicalNotesMap] = useState({});

  // Modals state
  const [selectedTest, setSelectedTest] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  // Confirm delete modal
  const [confirmAction, setConfirmAction] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    loading: false,
  });

  // Export & Print
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef(null);
  const handlePrintReport = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'گزارش نتایج آزمایش‌ها - سلامت‌یار',
  });

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const refetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [testsRes, profileRes, dependentsRes] = await Promise.all([
        API.get('test-results/'),
        API.get('patients/me/').catch(() => ({ data: null })),
        API.get('access/dependents/').catch(() => ({ data: [] })),
      ]);

      const testList = Array.isArray(testsRes.data)
        ? testsRes.data
        : testsRes.data?.results || [];
      setTests(testList);
      setProfile(profileRes.data);
      setMyDependents(dependentsRes.data || []);
      setClinicalNotesMap(getAllClinicalNotes());
    } catch {
      setError('خطا در بارگذاری نتایج آزمایش‌ها. لطفاً اتصال اینترنت خود را بررسی کنید.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const [testsRes, profileRes, dependentsRes] = await Promise.all([
          API.get('test-results/'),
          API.get('patients/me/').catch(() => ({ data: null })),
          API.get('access/dependents/').catch(() => ({ data: [] })),
        ]);

        if (!ignore) {
          const testList = Array.isArray(testsRes.data)
            ? testsRes.data
            : testsRes.data?.results || [];
          setTests(testList);
          setProfile(profileRes.data);
          setMyDependents(dependentsRes.data || []);
          setClinicalNotesMap(getAllClinicalNotes());
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          if (err.response?.status === 401) {
            if (logout) logout();
            navigate('/login');
            return;
          }
          setError('خطا در بارگذاری نتایج آزمایش‌ها. لطفاً اتصال اینترنت خود را بررسی کنید.');
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, [logout, navigate]);

  // Filter and sort tests
  const filteredTests = useMemo(() => {
    return tests.filter((test) => {
      // Search filter
      const search = searchTerm.trim().toLowerCase();
      const patientName = `${test.patient_first_name || ''} ${test.patient_last_name || ''}`.toLowerCase();
      const testName = (test.test_name || test.name || '').toLowerCase();
      const labName = (test.lab_name || '').toLowerCase();

      const matchesSearch = !search || patientName.includes(search) || testName.includes(search) || labName.includes(search);

      // Status filter
      let matchesStatus = true;
      if (filterStatus === 'normal') {
        matchesStatus = test.is_normal === true || test.status === 'normal';
      } else if (filterStatus === 'abnormal') {
        matchesStatus = test.is_normal === false || test.status === 'abnormal' || test.is_critical;
      }

      // Type filter
      let matchesType = true;
      if (typeFilter !== 'all') {
        matchesType = (test.test_type || test.category) === typeFilter;
      }

      // Person filter
      let matchesPerson = true;
      if (personFilter !== 'all') {
        matchesPerson = String(test.patient_national_code || test.patient) === String(personFilter);
      }

      return matchesSearch && matchesStatus && matchesType && matchesPerson;
    });
  }, [tests, searchTerm, filterStatus, typeFilter, personFilter]);

  // Sorted list
  const sortedTests = useMemo(() => {
    const list = [...filteredTests];
    if (!sortConfig.key) return list;

    return list.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === 'date') {
        aVal = new Date(a.test_date || a.created_at || 0).getTime();
        bVal = new Date(b.test_date || b.created_at || 0).getTime();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredTests, sortConfig]);

  // Paginated list
  const totalPages = Math.ceil(sortedTests.length / itemsPerPage) || 1;
  const paginatedTests = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedTests.slice(start, start + itemsPerPage);
  }, [sortedTests, currentPage, itemsPerPage]);

  // Distinct test types
  const availableTypes = useMemo(() => {
    const types = new Set();
    tests.forEach((t) => {
      const type = t.test_type || t.category;
      if (type) types.add(type);
    });
    return Array.from(types);
  }, [tests]);

  // Handle test delete
  const handleDeleteTest = (test) => {
    const testTitle = test.test_name || test.name || 'آزمایش انتخابی';
    setConfirmAction({
      isOpen: true,
      title: 'حذف سابقه آزمایش',
      message: `آیا از حذف «${testTitle}» از پرونده سلامت اطمینان دارید؟ این عمل قابل بازگشت نخواهد بود.`,
      loading: false,
      onConfirm: async () => {
        setConfirmAction((prev) => ({ ...prev, loading: true }));
        try {
          await API.delete(`test-results/${test.id}/`);
          setTests((prev) => prev.filter((t) => t.id !== test.id));
          toast.success(`آزمایش «${testTitle}» با موفقیت حذف شد.`);
          setConfirmAction({ isOpen: false, title: '', message: '', onConfirm: null, loading: false });
        } catch {
          toast.error('خطا در حذف آزمایش. لطفاً مجدداً تلاش نمایید.');
          setConfirmAction((prev) => ({ ...prev, loading: false }));
        }
      },
    });
  };

  // Export to Excel
  const handleExport = () => {
    if (!filteredTests.length) {
      toast.info('هیچ آزمایشی برای صدور خروجی یافت نشد.');
      return;
    }
    setIsExporting(true);
    try {
      exportTestsToCsv(filteredTests);
      toast.success(`خروجی اکسل ${filteredTests.length} آزمایش با موفقیت دریافت شد.`);
    } catch {
      toast.error('خطا در صدور خروجی اکسل.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="tests-page" dir="rtl">
      {/* 1. Header with Title and Primary CTA */}
      <header className="tests-header">
        <div className="tests-header-info">
          <div className="tests-title-row">
            <span className="tests-header-icon" aria-hidden="true">🧪</span>
            <h1>آزمایش‌های پزشکی</h1>
            <span className="tests-count-badge">
              {tests.length} آزمایش ثبت‌شده
            </span>
          </div>
          <p className="tests-header-sub">
            مدیریت نتایج آزمایشگاهی، مقایسه شاخص‌های حیاتی و پایش دوره‌ای فاکتورهای بالینی
          </p>
        </div>

        <div className="tests-header-actions">
          <button
            type="button"
            className="tests-btn tests-btn-outline"
            onClick={() => setIsCompareOpen(true)}
            disabled={tests.length < 2}
            title="مقایسه دو آزمایش با یکدیگر"
          >
            <span>⚖️</span>
            <span>مقایسه آزمایش‌ها</span>
          </button>

          <button
            type="button"
            className="tests-btn tests-btn-outline"
            onClick={handleExport}
            disabled={isExporting || tests.length === 0}
            title="خروجی فایل اکسل (CSV)"
          >
            <span>📊</span>
            <span>خروجی اکسل</span>
          </button>

          <button
            type="button"
            className="tests-btn tests-btn-outline"
            onClick={handlePrintReport}
            disabled={tests.length === 0}
            title="چاپ کارنامه آزمایش‌ها"
          >
            <span>🖨️</span>
            <span>چاپ گزارش</span>
          </button>

          <button
            type="button"
            className="tests-btn tests-btn-primary"
            onClick={() => navigate('/tests/new')}
            id="btn-register-new-test"
          >
            <span className="tests-btn-plus">+</span>
            <span>ثبت آزمایش جدید</span>
          </button>
        </div>
      </header>

      {/* 2. Toolbar & View Mode Switcher */}
      <section className="tests-toolbar-card">
        <div className="tests-search-wrap">
          <span className="tests-search-icon" aria-hidden="true">🔍</span>
          <input
            type="text"
            className="tests-search-input"
            placeholder="جستجو بر اساس نام آزمایش، آزمایشگاه یا بیمار..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
          {searchTerm && (
            <button
              type="button"
              className="tests-clear-btn"
              onClick={() => setSearchTerm('')}
              aria-label="پاک کردن جستجو"
            >
              ✕
            </button>
          )}
        </div>

        <div className="tests-filters-row">
          {/* Status Filter */}
          <div className="tests-filter-item">
            <label htmlFor="filter-status">وضعیت بالینی:</label>
            <select
              id="filter-status"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">همه آزمایش‌ها</option>
              <option value="abnormal">دارای هشدار / غیرنرمال ⚠️</option>
              <option value="normal">کاملاً نرمال ✓</option>
            </select>
          </div>

          {/* Type Filter */}
          {availableTypes.length > 0 && (
            <div className="tests-filter-item">
              <label htmlFor="filter-type">دسته‌بندی:</label>
              <select
                id="filter-type"
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">همه دسته‌ها</option>
                {availableTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          )}

          {/* Family Member Filter */}
          {myDependents.length > 0 && (
            <div className="tests-filter-item">
              <label htmlFor="filter-person">پرونده:</label>
              <select
                id="filter-person"
                value={personFilter}
                onChange={(e) => {
                  setPersonFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">همه اعضای خانواده</option>
                <option value={profile?.national_code || 'self'}>پرونده شخصی خودم</option>
                {myDependents.map((dep) => (
                  <option key={dep.id} value={dep.target_national_code}>
                    {dep.target_user_name || dep.target_national_code}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* View Mode Toggle */}
          <div className="tests-view-switch" role="group" aria-label="حالت نمایش">
            <button
              type="button"
              className={`tests-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="نمای جدولی و لیست"
            >
              📋 فهرست
            </button>
            <button
              type="button"
              className={`tests-mode-btn ${viewMode === 'timeline' ? 'active' : ''}`}
              onClick={() => setViewMode('timeline')}
              title="نمای خط زمانی (تایم‌لاین)"
            >
              ⏳ خط زمانی
            </button>
            <button
              type="button"
              className={`tests-mode-btn ${viewMode === 'ai' ? 'active' : ''}`}
              onClick={() => setViewMode('ai')}
              title="تحلیل هوشمند سلامت"
            >
              🤖 تحلیل هوشمند
            </button>
          </div>
        </div>
      </section>

      {/* 3. Main Workspace / Content */}
      <main className="tests-workspace">
        {loading ? (
          <div className="tests-loading-state">
            <Skeleton variant="rounded" height={60} style={{ marginBottom: '16px' }} />
            <Skeleton variant="rounded" height={240} />
          </div>
        ) : error ? (
          <div className="tests-error-card" role="alert">
            <span className="tests-error-icon">⚠️</span>
            <p>{error}</p>
            <button type="button" className="tests-btn tests-btn-outline" onClick={refetchData}>
              تلاش مجدد
            </button>
          </div>
        ) : tests.length === 0 ? (
          <div className="tests-empty-card">
            <div className="tests-empty-icon">🧪</div>
            <h3>هنوز هیچ آزمایشی ثبت نشده است</h3>
            <p>
              نتایج آزمایش‌های خود را ثبت کنید تا نمودار روند تغییرات و بازه‌های مرجع را به صورت خودکار مشاهده نمایید.
            </p>
            <button
              type="button"
              className="tests-btn tests-btn-primary tests-btn-lg"
              onClick={() => navigate('/tests/new')}
            >
              + ثبت اولین آزمایش
            </button>
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="tests-empty-card">
            <div className="tests-empty-icon">🔍</div>
            <h3>هیچ آزمایشی با این مشخصات یافت نشد</h3>
            <p>لطفاً فیلترهای جستجو یا وضعیت را تغییر دهید.</p>
            <button
              type="button"
              className="tests-btn tests-btn-outline"
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
                setTypeFilter('all');
                setPersonFilter('all');
              }}
            >
              پاک‌سازی فیلترها
            </button>
          </div>
        ) : viewMode === 'timeline' ? (
          <div className="tests-view-container">
            <MedicalTimeline tests={sortedTests} />
          </div>
        ) : viewMode === 'ai' ? (
          <div className="tests-view-container">
            <AiHealthAdvisor tests={sortedTests} />
          </div>
        ) : (
          /* Table View */
          <div className="tests-table-card">
            <div className="tests-table-responsive">
              <table className="tests-table">
                <thead>
                  <tr>
                    <th>ردیف</th>
                    <th onClick={() => handleSort('patient_first_name')} style={{ cursor: 'pointer' }} title="مرتب‌سازی بر اساس نام">
                      نام بیمار {sortConfig.key === 'patient_first_name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th onClick={() => handleSort('test_name')} style={{ cursor: 'pointer' }} title="مرتب‌سازی بر اساس نوع آزمایش">
                      نوع آزمایش {sortConfig.key === 'test_name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th>نتیجه / شاخص‌ها</th>
                    <th>وضعیت</th>
                    <th onClick={() => handleSort('date')} style={{ cursor: 'pointer' }} title="مرتب‌سازی بر اساس تاریخ">
                      تاریخ ثبت {sortConfig.key === 'date' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th>یادداشت بالینی</th>
                    <th>نمودار و پیوست</th>
                    <th>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTests.map((test, index) => {
                    const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                    const isAbnormal = test.is_normal === false || test.status === 'abnormal' || test.is_critical;
                    const patientIdentity = resolveMedicalIdentity(test);
                    const notePreview = getClinicalNotePreview(clinicalNotesMap[test.id]);

                    return (
                      <tr key={test.id} className={isAbnormal ? 'tests-row-abnormal' : ''}>
                        <td className="tests-td-num">{rowNumber}</td>
                        <td className="tests-td-patient">
                          <strong>{patientIdentity.fullName}</strong>
                          {patientIdentity.isSelf ? (
                            <span className="tests-tag-self">خودم</span>
                          ) : (
                            <span className="tests-tag-dep">تحت تکفل</span>
                          )}
                        </td>
                        <td className="tests-td-name">
                          <strong>{test.test_name || test.name || 'آزمایش عمومی'}</strong>
                          {test.lab_name && <span className="tests-lab-name">{test.lab_name}</span>}
                        </td>
                        <td className="tests-td-result">
                          {test.factors && test.factors.length > 0 ? (
                            <span className="tests-factors-count">
                              {test.factors.length} پارامتر
                            </span>
                          ) : (
                            <span className="tests-val-text">{test.result_value || test.result || '—'}</span>
                          )}
                        </td>
                        <td>
                          {isAbnormal ? (
                            <span className="tests-pill tests-pill-warn">نیاز به بررسی ⚠️</span>
                          ) : (
                            <span className="tests-pill tests-pill-normal">نرمال ✓</span>
                          )}
                        </td>
                        <td className="tests-td-date">
                          {test.test_date || test.created_at ? (
                            new Date(test.test_date || test.created_at).toLocaleDateString('fa-IR-u-ca-persian-nu-latn')
                          ) : '—'}
                        </td>
                        <td className="tests-td-notes">
                          <button
                            type="button"
                            className={`tests-icon-btn ${notePreview ? 'has-note' : ''}`}
                            onClick={() => {
                              setSelectedTest(test);
                              setIsNotesModalOpen(true);
                            }}
                            title={notePreview || 'افزودن یادداشت پزشک'}
                          >
                            📝 {notePreview ? 'مشاهده' : '+'}
                          </button>
                        </td>
                        <td className="tests-td-media">
                          <div className="tests-media-group">
                            <button
                              type="button"
                              className="tests-icon-btn"
                              onClick={() => {
                                setSelectedTest(test);
                                setIsChartModalOpen(true);
                              }}
                              title="مشاهده نمودار روند"
                            >
                              📈
                            </button>
                            <button
                              type="button"
                              className="tests-icon-btn"
                              onClick={() => {
                                setSelectedTest(test);
                                setIsAttachmentModalOpen(true);
                              }}
                              title="مشاهده فایل‌های پیوست"
                            >
                              📎
                            </button>
                          </div>
                        </td>
                        <td className="tests-td-actions">
                          <div className="tests-actions-group">
                            <button
                              type="button"
                              className="tests-action-btn tests-btn-edit"
                              onClick={() => {
                                setSelectedTest(test);
                                setIsEditModalOpen(true);
                              }}
                              title="ویرایش آزمایش"
                            >
                              ویرایش
                            </button>
                            <button
                              type="button"
                              className="tests-action-btn tests-btn-del"
                              onClick={() => handleDeleteTest(test)}
                              title="حذف آزمایش"
                            >
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <footer className="tests-pagination">
                <span className="tests-page-info">
                  صفحه {currentPage} از {totalPages} ({filteredTests.length} آزمایش)
                </span>
                <div className="tests-page-buttons">
                  <button
                    type="button"
                    className="tests-btn tests-btn-sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    قبلی
                  </button>
                  <button
                    type="button"
                    className="tests-btn tests-btn-sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    بعدی
                  </button>
                </div>
              </footer>
            )}
          </div>
        )}
      </main>

      {/* Hidden Print Container */}
      <div style={{ display: 'none' }}>
        <PrintableReport ref={printRef} tests={filteredTests} />
      </div>

      {/* Modals */}
      {isEditModalOpen && selectedTest && (
        <EditTestModal
          isOpen={isEditModalOpen}
          test={selectedTest}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedTest(null);
          }}
          onUpdate={(updated) => {
            setTests((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
            setIsEditModalOpen(false);
            setSelectedTest(null);
          }}
        />
      )}

      {isAttachmentModalOpen && selectedTest && (
        <AttachmentModal
          isOpen={isAttachmentModalOpen}
          testId={selectedTest.id}
          onClose={() => {
            setIsAttachmentModalOpen(false);
            setSelectedTest(null);
          }}
        />
      )}

      {isChartModalOpen && selectedTest && (
        <PatientChartModal
          isOpen={isChartModalOpen}
          test={selectedTest}
          allTests={tests}
          onClose={() => {
            setIsChartModalOpen(false);
            setSelectedTest(null);
          }}
        />
      )}

      {isNotesModalOpen && selectedTest && (
        <ClinicalNotesModal
          isOpen={isNotesModalOpen}
          test={selectedTest}
          onClose={() => {
            setIsNotesModalOpen(false);
            setSelectedTest(null);
            setClinicalNotesMap(getAllClinicalNotes());
          }}
        />
      )}

      {isCompareOpen && (
        <TestComparisonModal
          isOpen={isCompareOpen}
          tests={tests}
          onClose={() => setIsCompareOpen(false)}
        />
      )}

      {confirmAction.isOpen && (
        <ConfirmDeleteModal
          isOpen={confirmAction.isOpen}
          title={confirmAction.title}
          message={confirmAction.message}
          loading={confirmAction.loading}
          onConfirm={confirmAction.onConfirm}
          onClose={() => setConfirmAction({ isOpen: false, title: '', message: '', onConfirm: null, loading: false })}
        />
      )}
    </div>
  );
};

export default TestsPage;
