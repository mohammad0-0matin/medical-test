import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  fetchRemindersApi,
  addReminderApi,
  completeReminderApi,
  deleteReminderApi,
  frequencyLabel,
} from '../utils/reminderUtils';
import { buildGoogleCalendarUrl, downloadIcs } from '../utils/icsExport';
import { formatJalaliDate } from '../utils/dateUtils';
import AddReminderModal from '../components/AddReminderModal';
import './RemindersPage.css';

/* --- SVG Icons --- */
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true">
    <path d="M12 3v12M7 10l5 5 5-5M4 20h16" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round" width="15" height="15" aria-hidden="true">
    <path d="M5 13l4 4L19 7" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true">
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

/**
 * Calculates display badge status and days difference for a reminder.
 * Adheres strictly to Latin digits (0-9) per DESIGN.md.
 */
const calculateReminderStatus = (reminder) => {
  if (reminder.isCompleted) {
    return {
      key: 'completed',
      label: 'تکمیل‌شده',
      className: 'rem-status-completed',
      diffDays: 0,
    };
  }

  if (!reminder.targetDate) {
    return {
      key: 'scheduled',
      label: 'نامشخص',
      className: 'rem-status-scheduled',
      diffDays: 0,
    };
  }

  const parts = String(reminder.targetDate).split('-').map(Number);
  const due = new Date(parts[0], parts[1] - 1, parts[2]);
  due.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.round((due - today) / 86400000);

  if (diffDays < 0) {
    return {
      key: 'overdue',
      label: `${Math.abs(diffDays)} روز گذشته`,
      className: 'rem-status-overdue',
      diffDays,
    };
  }
  if (diffDays === 0) {
    return {
      key: 'soon',
      label: 'امروز موعد است',
      className: 'rem-status-soon',
      diffDays: 0,
    };
  }
  if (diffDays <= 3) {
    return {
      key: 'soon',
      label: `${diffDays} روز مانده`,
      className: 'rem-status-soon',
      diffDays,
    };
  }
  return {
    key: 'scheduled',
    label: `${diffDays} روز مانده`,
    className: 'rem-status-scheduled',
    diffDays,
  };
};

/**
 * RemindersPage Component
 * Dedicated page for periodic lab tests, checkup schedules, and calendar integrations.
 */
const RemindersPage = () => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let ignore = false;
    const loadReminders = async () => {
      try {
        const data = await fetchRemindersApi();
        if (!ignore) {
          setReminders(data);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Fetch reminders error:', err);
          toast.error('خطا در دریافت لیست یادآورها.');
          setLoading(false);
        }
      }
    };

    loadReminders();
    return () => {
      ignore = true;
    };
  }, []);

  // Compute status tags for all reminders
  const remindersWithStatus = useMemo(() => {
    return reminders.map((r) => ({
      ...r,
      statusInfo: calculateReminderStatus(r),
    }));
  }, [reminders]);

  // Status counts for filter pills
  const counts = useMemo(() => {
    const res = { all: remindersWithStatus.length, overdue: 0, soon: 0, scheduled: 0, completed: 0 };
    remindersWithStatus.forEach((r) => {
      if (r.statusInfo.key in res) {
        res[r.statusInfo.key]++;
      }
    });
    return res;
  }, [remindersWithStatus]);

  // Filtered list
  const filteredReminders = useMemo(() => {
    if (activeFilter === 'all') return remindersWithStatus;
    return remindersWithStatus.filter((r) => r.statusInfo.key === activeFilter);
  }, [remindersWithStatus, activeFilter]);

  // Handlers
  const handleAddReminder = async (payload) => {
    try {
      const created = await addReminderApi(payload);
      setReminders((prev) => [...prev, created]);
      toast.success('🗓️ یادآور چکاپ با موفقیت ثبت شد.');
    } catch (err) {
      console.error(err);
      toast.error('خطا در ثبت یادآور جدید.');
    }
  };

  const handleComplete = async (id) => {
    const target = reminders.find((r) => r.id === id);
    if (!target) return;
    try {
      const updated = await completeReminderApi(id, target);
      setReminders((prev) => prev.map((r) => (r.id === id ? updated : r)));
      toast.success('✔️ وضعیت یادآور با موفقیت به‌روزرسانی شد.');
    } catch (err) {
      console.error(err);
      toast.error('خطا در تغییر وضعیت یادآور.');
    }
  };

  const handleOpenGoogleCalendar = (reminder) => {
    const url = buildGoogleCalendarUrl({
      title: reminder.title,
      targetDate: reminder.targetDate,
      notes: reminder.notes,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadSingleIcs = (reminder) => {
    const cleanName = (reminder.title || 'reminder').replace(/\s+/g, '_');
    const ok = downloadIcs([reminder], `salamatyar_${cleanName}.ics`);
    if (ok) {
      toast.success('📅 فایل تقویم دانلود شد.');
    } else {
      toast.error('خطا در دانلود تقویم.');
    }
  };

  const handleExportAllIcs = () => {
    const activeOnes = reminders.filter((r) => !r.isCompleted);
    const toExport = activeOnes.length > 0 ? activeOnes : reminders;
    if (toExport.length === 0) {
      toast.warn('یادآوری برای خروجی تقویم وجود ندارد.');
      return;
    }
    const ok = downloadIcs(toExport, 'salamatyar_checkups_calendar.ics');
    if (ok) {
      toast.success(`📅 تقویم ${toExport.length} یادآور با موفقیت دانلود شد.`);
    } else {
      toast.error('خطا در دریافت تقویم کلی.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteReminderApi(deleteTarget.id);
      setReminders((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      toast.success('یادآور چکاپ حذف شد.');
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      toast.error('خطا در حذف یادآور.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="rem-page-container" dir="rtl">
      {/* Header */}
      <header className="rem-header">
        <div className="rem-header-text">
          <h1 className="rem-title">
            <span aria-hidden="true">📅</span>
            <span>تقویم و یادآورهای دوره‌ای آزمایش‌ها</span>
          </h1>
          <p className="rem-subtitle">
            برنامه‌ریزی چکاپ‌های منظم، پیگیری موعد آزمایش‌های پزشکی و همگام‌سازی آسان با تقویم تلفن همراه و گوگل.
          </p>
        </div>

        <div className="rem-header-actions">
          <button
            type="button"
            className="rem-btn-add"
            onClick={() => setIsAddModalOpen(true)}
          >
            <PlusIcon />
            <span>افزودن یادآور جدید</span>
          </button>

          <button
            type="button"
            className="rem-btn-export-all"
            onClick={handleExportAllIcs}
            title="دانلود فایل iCal شامل تمام یادآورهای پیش‌رو"
          >
            <DownloadIcon />
            <span>دانلود کل تقویم (iCal)</span>
          </button>
        </div>
      </header>

      {/* Filter Tabs */}
      <nav className="rem-filters-row" aria-label="فیلتر وضعیت یادآورها">
        <button
          type="button"
          className={`rem-filter-pill ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          <span>همه</span>
          <span className="rem-filter-count">{counts.all}</span>
        </button>
        <button
          type="button"
          className={`rem-filter-pill ${activeFilter === 'overdue' ? 'active' : ''}`}
          onClick={() => setActiveFilter('overdue')}
        >
          <span>گذشته از موعد</span>
          <span className="rem-filter-count">{counts.overdue}</span>
        </button>
        <button
          type="button"
          className={`rem-filter-pill ${activeFilter === 'soon' ? 'active' : ''}`}
          onClick={() => setActiveFilter('soon')}
        >
          <span>نزدیک (۳ روز آینده)</span>
          <span className="rem-filter-count">{counts.soon}</span>
        </button>
        <button
          type="button"
          className={`rem-filter-pill ${activeFilter === 'scheduled' ? 'active' : ''}`}
          onClick={() => setActiveFilter('scheduled')}
        >
          <span>برنامه‌ریزی‌شده</span>
          <span className="rem-filter-count">{counts.scheduled}</span>
        </button>
        <button
          type="button"
          className={`rem-filter-pill ${activeFilter === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveFilter('completed')}
        >
          <span>تکمیل‌شده</span>
          <span className="rem-filter-count">{counts.completed}</span>
        </button>
      </nav>

      {/* Grid or Skeletons or Empty State */}
      {loading ? (
        <div className="rem-grid" role="status" aria-busy="true">
          <div className="rem-skeleton-card" />
          <div className="rem-skeleton-card" />
          <div className="rem-skeleton-card" />
        </div>
      ) : filteredReminders.length === 0 ? (
        <div className="rem-empty-box">
          <div className="rem-empty-icon" aria-hidden="true">🌱</div>
          <h2 className="rem-empty-title">یادآوری در این بخش یافت نشد</h2>
          <p className="rem-empty-desc">
            {activeFilter === 'all'
              ? 'هنوز یادآوری ثبت نکرده‌اید. برای حفظ سلامت پایدار و پیشگیری، چکاپ دوره‌ای بعدی خود را تعریف کنید.'
              : 'هیچ آزمایشی با وضعیت انتخاب‌شده وجود ندارد.'}
          </p>
          {activeFilter === 'all' && (
            <button
              type="button"
              className="rem-btn-add"
              onClick={() => setIsAddModalOpen(true)}
            >
              <PlusIcon />
              <span>برنامه‌ریزی اولین چکاپ</span>
            </button>
          )}
        </div>
      ) : (
        <div className="rem-grid">
          {filteredReminders.map((reminder) => (
            <article key={reminder.id} className="rem-card">
              <div>
                <div className="rem-card-top">
                  <div className="rem-card-title-wrap">
                    <h3 className="rem-card-title">{reminder.title}</h3>
                    {reminder.notes && (
                      <p className="rem-card-notes" title={reminder.notes}>
                        💡 {reminder.notes}
                      </p>
                    )}
                  </div>
                  <span className={`rem-status-badge ${reminder.statusInfo.className}`}>
                    {reminder.statusInfo.label}
                  </span>
                </div>
              </div>

              <div className="rem-card-meta">
                <span className="rem-meta-item">
                  <span>🗓️</span>
                  <span>{formatJalaliDate(reminder.targetDate)}</span>
                </span>
                <span className="rem-meta-item">
                  <span>🔁</span>
                  <span>{frequencyLabel(reminder.frequency)}</span>
                </span>
              </div>

              <div className="rem-card-actions">
                <div>
                  {!reminder.isCompleted ? (
                    <button
                      type="button"
                      className="rem-btn-complete"
                      onClick={() => handleComplete(reminder.id)}
                      title="ثبت به عنوان انجام شده"
                    >
                      <CheckIcon />
                      <span>تکمیل شد</span>
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      ✅ انجام شد
                    </span>
                  )}
                </div>

                <div className="rem-action-group">
                  <button
                    type="button"
                    className="rem-icon-btn"
                    onClick={() => handleOpenGoogleCalendar(reminder)}
                    title="افزودن به تقویم گوگل"
                    aria-label={`افزودن ${reminder.title} به تقویم گوگل`}
                  >
                    <CalendarIcon />
                  </button>

                  <button
                    type="button"
                    className="rem-icon-btn"
                    onClick={() => handleDownloadSingleIcs(reminder)}
                    title="دانلود فایل تقویم (iCal)"
                    aria-label={`دانلود تقویم ${reminder.title}`}
                  >
                    <DownloadIcon />
                  </button>

                  <button
                    type="button"
                    className="rem-icon-btn rem-btn-danger"
                    onClick={() => setDeleteTarget(reminder)}
                    title="حذف یادآور"
                    aria-label={`حذف یادآور ${reminder.title}`}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Add Reminder Modal */}
      <AddReminderModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddReminder}
      />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="rem-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="del-modal-title">
          <div className="rem-modal-box">
            <div className="rem-modal-icon-wrap" aria-hidden="true">
              <TrashIcon />
            </div>
            <h3 id="del-modal-title" className="rem-modal-title">حذف یادآور چکاپ</h3>
            <p className="rem-modal-desc">
              آیا از حذف یادآور <strong>«{deleteTarget.title}»</strong> اطمینان دارید؟ این عملیات قابل بازگشت نیست.
            </p>
            <div className="rem-modal-actions">
              <button
                type="button"
                className="rem-modal-btn-confirm"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? 'در حال حذف...' : 'بله، حذف کن'}
              </button>
              <button
                type="button"
                className="rem-modal-btn-cancel"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
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

export default RemindersPage;
