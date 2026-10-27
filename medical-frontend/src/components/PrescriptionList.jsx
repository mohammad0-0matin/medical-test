import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchPrescriptions,
  deletePrescription,
  fetchPrescriptionScanBlob,
  createMedicationReminder,
} from '../api/prescriptionApi';
import { formatJalaliDate } from '../utils/dateUtils';
import './Prescriptions.css';

/**
 * Returns an appropriate icon for common medication forms.
 */
const getMedFormIcon = (form) => {
  if (!form) return '💊';
  const f = form.toLowerCase();
  if (f.includes('شربت') || f.includes('محلول') || f.includes('قطره')) return '🧪';
  if (f.includes('آمپول') || f.includes('ویال') || f.includes('تزریق')) return '💉';
  if (f.includes('پماد') || f.includes('کرم') || f.includes('ژل')) return '🧴';
  return '💊';
};

/**
 * Doctor's Prescription List Component
 *
 * Displays prescription history with:
 * - Search bar (by medicine name or doctor name)
 * - Source filter pills (All, Manual, AI, Paper)
 * - Skeleton loading state adhering to motion rules
 * - Empty state with Call-To-Action
 * - Error state with retry action
 * - Server-side pagination
 * - Soft-delete confirmation modal
 * - Secure scan file preview/download
 */
const PrescriptionList = () => {
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');

  // Soft-delete modal state
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Download scan state
  const [downloadingUuid, setDownloadingUuid] = useState(null);

  const loadPrescriptions = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPrescriptions({ page });
      setPrescriptions(data.results || []);
      setTotalCount(data.count || 0);
      setCurrentPage(page);
    } catch {
      setError('خطا در دریافت تاریخچه نسخه‌ها. لطفاً مجدداً تلاش فرمایید.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function initLoad() {
      try {
        const data = await fetchPrescriptions({ page: 1 });
        if (!ignore) {
          setPrescriptions(data.results || []);
          setTotalCount(data.count || 0);
          setCurrentPage(1);
        }
      } catch {
        if (!ignore) setError('خطا در دریافت تاریخچه نسخه‌ها. لطفاً مجدداً تلاش فرمایید.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    initLoad();
    return () => {
      ignore = true;
    };
  }, []);

  // Filter prescriptions locally by search term and source
  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter((rx) => {
      // Source filter
      if (sourceFilter !== 'all' && rx.source !== sourceFilter) {
        return false;
      }
      // Search term filter
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const docName = (
          rx.registered_doctor_name ||
          rx.external_doctor_name ||
          ''
        ).toLowerCase();
        const diagnosis = (rx.diagnosis || '').toLowerCase();
        const hasMedMatch = rx.items?.some((item) =>
          (item.drug_name || '').toLowerCase().includes(term)
        );
        return docName.includes(term) || diagnosis.includes(term) || hasMedMatch;
      }
      return true;
    });
  }, [prescriptions, searchTerm, sourceFilter]);

  // Execute soft-delete
  const handleConfirmDelete = async () => {
    if (!confirmDeleteTarget) return;
    setDeleting(true);
    try {
      await deletePrescription(confirmDeleteTarget.uuid);
      toast.success('نسخه با موفقیت از پرونده فعال حذف شد.');
      setConfirmDeleteTarget(null);
      loadPrescriptions(currentPage);
    } catch {
      toast.error('خطا در حذف نسخه. لطفاً مجدداً تلاش کنید.');
    } finally {
      setDeleting(false);
    }
  };

  // Download authenticated scan file safely
  const handleDownloadScan = async (prescription) => {
    setDownloadingUuid(prescription.uuid);
    try {
      const blob = await fetchPrescriptionScanBlob(prescription.uuid);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `prescription-${prescription.uuid}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('امکان دریافت فایل اسکن وجود ندارد.');
    } finally {
      setDownloadingUuid(null);
    }
  };

  // Set medication reminder
  const handleQuickReminder = async (drugName, instructions, date) => {
    try {
      await createMedicationReminder(drugName, instructions, date);
      toast.success(`⏰ یادآور مصرف برای «${drugName}» با موفقیت در سیستم ثبت شد.`);
    } catch {
      toast.error('خطا در ثبت یادآور دارویی.');
    }
  };

  const totalPages = Math.ceil(totalCount / 10) || 1;

  return (
    <div className="rx-container" dir="rtl">
      {/* Top Header */}
      <div className="rx-header">
        <div>
          <h1 className="rx-title">
            <span role="img" aria-hidden="true">📋</span>
            نسخه‌های پزشک
          </h1>
          <p className="rx-subtitle">
            تاریخچه داروها، نسخه‌ها و پرونده‌های دارویی ثبت‌شده
          </p>
        </div>
        <Link to="/prescriptions/new" className="rx-btn rx-btn-primary">
          <span role="img" aria-hidden="true">➕</span>
          ثبت نسخه جدید
        </Link>
      </div>

      {/* Toolbar: Search & Filter Pills */}
      {!loading && !error && prescriptions.length > 0 && (
        <div className="rx-toolbar">
          <div className="rx-search-wrapper">
            <span className="rx-search-icon" aria-hidden="true">🔍</span>
            <input
              type="text"
              className="rx-search-input"
              placeholder="جستجو در نام دارو، پزشک یا علت مراجعه..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="جستجوی نسخه"
            />
          </div>

          <div className="rx-filter-pills" role="radiogroup" aria-label="فیلتر منبع ثبت">
            <button
              type="button"
              className={`rx-filter-pill ${sourceFilter === 'all' ? 'active' : ''}`}
              onClick={() => setSourceFilter('all')}
            >
              همه ({prescriptions.length})
            </button>
            <button
              type="button"
              className={`rx-filter-pill ${sourceFilter === 'manual' ? 'active' : ''}`}
              onClick={() => setSourceFilter('manual')}
            >
              ثبت دستی
            </button>
            <button
              type="button"
              className={`rx-filter-pill ${sourceFilter === 'ai_extracted' ? 'active' : ''}`}
              onClick={() => setSourceFilter('ai_extracted')}
            >
              استخراج هوشمند ✨
            </button>
            <button
              type="button"
              className={`rx-filter-pill ${sourceFilter === 'paper_upload' ? 'active' : ''}`}
              onClick={() => setSourceFilter('paper_upload')}
            >
              نسخه کاغذی 📎
            </button>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="rx-list-grid" aria-busy="true" aria-live="polite">
          <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
            در حال بارگذاری نسخه‌ها...
          </span>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="rx-card-item">
              <div className="rx-skeleton" style={{ height: '22px', width: '55%', marginBottom: '12px' }} />
              <div className="rx-skeleton" style={{ height: '26px', width: '75%', marginBottom: '8px' }} />
              <div className="rx-skeleton" style={{ height: '16px', width: '45%', marginBottom: '16px' }} />
              <div className="rx-skeleton" style={{ height: '54px', width: '100%', marginBottom: '14px' }} />
              <div className="rx-skeleton" style={{ height: '36px', width: '100%' }} />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="rx-state-box" role="alert">
          <div className="rx-state-icon">⚠️</div>
          <h2 className="rx-state-title">عدم برقراری ارتباط</h2>
          <p className="rx-state-desc">{error}</p>
          <button
            type="button"
            className="rx-btn rx-btn-secondary"
            onClick={() => loadPrescriptions(currentPage)}
          >
            تلاش مجدد
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && prescriptions.length === 0 && (
        <div className="rx-state-box">
          <div className="rx-state-icon">📝</div>
          <h2 className="rx-state-title">هنوز نسخه‌ای ثبت نشده است</h2>
          <p className="rx-state-desc">
            شما می‌توانید اولین نسخه پزشک یا فایل دارویی خود را به صورت دستی یا با استخراج هوشمند ثبت نمایید.
          </p>
          <Link to="/prescriptions/new" className="rx-btn rx-btn-primary">
            + ثبت اولین نسخه
          </Link>
        </div>
      )}

      {/* No Search Results */}
      {!loading && !error && prescriptions.length > 0 && filteredPrescriptions.length === 0 && (
        <div className="rx-state-box">
          <div className="rx-state-icon">🔎</div>
          <h2 className="rx-state-title">موردی یافت نشد</h2>
          <p className="rx-state-desc">
            هیچ نسخه‌ای مطابق با عبارت جستجو یا فیلتر انتخابی پیدا نشد.
          </p>
          <button
            type="button"
            className="rx-btn rx-btn-secondary"
            onClick={() => {
              setSearchTerm('');
              setSourceFilter('all');
            }}
          >
            پاک کردن فیلترها
          </button>
        </div>
      )}

      {/* Prescriptions Grid */}
      {!loading && !error && filteredPrescriptions.length > 0 && (
        <>
          <div className="rx-list-grid">
            {filteredPrescriptions.map((rx) => {
              const doctorDisplayName = rx.registered_doctor_name
                ? `دکتر ${rx.registered_doctor_name}`
                : rx.external_doctor_name || 'پزشک نامشخص';

              const sourceLabel =
                rx.source === 'ai_extracted'
                  ? 'هوش مصنوعی'
                  : rx.source === 'paper_upload'
                  ? 'نسخه کاغذی'
                  : 'ثبت دستی';

              return (
                <div
                  key={rx.uuid}
                  className="rx-card-item"
                  style={{ borderTop: '3px solid var(--primary)' }}
                >
                  <div>
                    <div className="rx-meta-row">
                      <span>
                        📅 {formatJalaliDate(rx.prescribed_date)}
                      </span>
                      <span className={`rx-source-badge ${rx.source}`}>
                        {sourceLabel}
                      </span>
                    </div>

                    {rx.patient_name && (
                      <p style={{ margin: '0 0 0.35rem', fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-body)' }}>
                        👤 بیمار: <strong style={{ color: 'var(--text-strong)', fontWeight: 700 }}>{rx.patient_name}</strong>
                      </p>
                    )}

                    <h2 className="rx-doctor-name">{doctorDisplayName}</h2>
                    {rx.external_doctor_specialty && (
                      <p className="rx-helper-text" style={{ margin: '0 0 0.5rem' }}>
                        {rx.external_doctor_specialty}
                        {rx.external_doctor_clinic ? ` • ${rx.external_doctor_clinic}` : ''}
                      </p>
                    )}

                    {rx.diagnosis && (
                      <p className="rx-diagnosis-text">
                        <strong>تشخیص:</strong> {rx.diagnosis}
                      </p>
                    )}

                    {rx.items && rx.items.length > 0 && (
                      <div className="rx-meds-summary">
                        <strong>اقلام دارویی ({rx.items.length}):</strong>
                        <div style={{ marginTop: '0.4rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {rx.items.slice(0, 4).map((item, i) => (
                            <span key={item.id || i} className="rx-med-chip">
                              <span aria-hidden="true">{getMedFormIcon(item.form)}</span>
                              <span>{item.drug_name} {item.strength_dose ? `(${item.strength_dose})` : ''}</span>
                              <button
                                type="button"
                                className="rx-chip-reminder-btn"
                                onClick={() => handleQuickReminder(item.drug_name, item.instructions || item.frequency, rx.prescribed_date)}
                                title={`تنظیم یادآور مصرف داروی ${item.drug_name}`}
                                aria-label={`تنظیم یادآور مصرف برای ${item.drug_name}`}
                              >
                                ⏰
                              </button>
                            </span>
                          ))}
                          {rx.items.length > 4 && (
                            <span style={{ color: 'var(--primary)', fontSize: '0.84rem', fontWeight: 600, alignSelf: 'center', marginInlineStart: '0.25rem' }}>
                              +{rx.items.length - 4} قلم دیگر
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rx-card-actions">
                    {rx.scan_file_url && (
                      <button
                        type="button"
                        className="rx-btn rx-btn-ghost"
                        style={{ minHeight: '36px', padding: '0.25rem 0.65rem', fontSize: '0.86rem', fontWeight: 600 }}
                        onClick={() => handleDownloadScan(rx)}
                        disabled={downloadingUuid === rx.uuid}
                        title="دانلود فایل اسکن نسخه"
                      >
                        {downloadingUuid === rx.uuid ? 'دریافت...' : '📎 اسکن'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="rx-btn rx-btn-secondary"
                      style={{ minHeight: '36px', padding: '0.25rem 0.75rem', fontSize: '0.86rem', fontWeight: 600 }}
                      onClick={() => navigate(`/prescriptions/${rx.uuid}`)}
                    >
                      جزئیات و ویرایش
                    </button>
                    <button
                      type="button"
                      className="rx-btn rx-btn-destructive"
                      style={{ minHeight: '36px', padding: '0.25rem 0.65rem', fontSize: '0.86rem', fontWeight: 600 }}
                      onClick={() => setConfirmDeleteTarget(rx)}
                      aria-label={`حذف نسخه ${doctorDisplayName}`}
                    >
                      حذف
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="rx-pagination" role="navigation" aria-label="صفحه‌بندی نسخه‌ها">
              <button
                type="button"
                className="rx-btn rx-btn-secondary"
                disabled={currentPage <= 1}
                onClick={() => loadPrescriptions(currentPage - 1)}
              >
                صفحه قبلی
              </button>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                صفحه {currentPage} از {totalPages}
              </span>
              <button
                type="button"
                className="rx-btn rx-btn-secondary"
                disabled={currentPage >= totalPages}
                onClick={() => loadPrescriptions(currentPage + 1)}
              >
                صفحه بعدی
              </button>
            </div>
          )}
        </>
      )}

      {/* Confirmation Dialog for Soft-Delete */}
      {confirmDeleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'var(--overlay-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            className="rx-card"
            style={{ maxWidth: '440px', width: '100%', margin: 0, animation: 'modal-pop-in 0.2s' }}
          >
            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-strong)', fontSize: '1.15rem' }}>
              حذف نسخه از لیست
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-body)', margin: '0 0 1.25rem' }}>
              آیا از حذف این نسخه از پرونده فعال سلامت اطمینان دارید؟ نسخه به صورت امن آرشیو خواهد شد.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="rx-btn rx-btn-secondary"
                onClick={() => setConfirmDeleteTarget(null)}
                disabled={deleting}
              >
                انصراف
              </button>
              <button
                type="button"
                className="rx-btn rx-btn-destructive"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? 'در حال حذف...' : 'حذف از لیست'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrescriptionList;
