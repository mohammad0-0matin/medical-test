import { toast } from 'react-toastify';
import {
  frequencyLabel,
  getReminderStatus,
} from '../utils/reminderUtils';
import { buildGoogleCalendarUrl, downloadIcs } from '../utils/icsExport';
import './UpcomingCheckupsWidget.css';

const toLocalFa = (value) =>
  String(value ?? '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

/** Complete-action check icon. */
const CheckGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 13l4 4L19 7" />
  </svg>
);

/** Google Calendar action icon. */
const CalendarGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="5.5" width="16" height="15" rx="2.5" />
    <path d="M8 3v4M16 3v4M4 10.5h16" />
  </svg>
);

/** .ics download action icon. */
const DownloadGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 4v11" />
    <path d="M7.5 10.5L12 15l4.5-4.5" />
    <path d="M4.5 19.5h15" />
  </svg>
);

/** Delete-reminder action icon. */
const TrashGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 7h16" />
    <path d="M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7" />
    <path d="M6.2 7l.9 12.1A1.5 1.5 0 0 0 8.6 20.5h6.8a1.5 1.5 0 0 0 1.5-1.4L17.8 7" />
  </svg>
);

/**
 * Reminders carousel showing upcoming checkups with tone-coded status chips
 * driven by {@link getReminderStatus}, plus per-card completion (advances
 * recurring schedules), Google-Calendar / .ics export and delete actions.
 * Completed reminders are filtered out entirely from this view.
 *
 * @param {{reminders?: Array<object>, onAddClick?: Function,
 *          onComplete?: Function, onDelete?: Function}} props - Widget props.
 * @param {Array<object>} [props.reminders] - Full reminder list state.
 * @param {Function} [props.onAddClick] - Opens the AddReminderModal.
 * @param {Function} [props.onComplete] - Marks a reminder complete by id.
 * @param {Function} [props.onDelete] - Deletes a reminder by id.
 * @returns {JSX.Element} Reminder region with empty-state call-to-action.
 */
const UpcomingCheckupsWidget = ({ reminders = [], onAddClick, onComplete, onDelete }) => {
  const activeReminders = reminders.filter((r) => !r.isCompleted);

  /** Opens Google Calendar's add-event template for this reminder in a new tab. */
  const handleGoogleCalendar = (reminder) => {
    const url = buildGoogleCalendarUrl({
      title: reminder.title,
      targetDate: reminder.targetDate,
      notes: reminder.notes,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  /** Downloads a single-event .ics file named after the reminder title. */
  const handleIcsDownload = (reminder) => {
    const ok = downloadIcs([reminder], `salamatyar_${reminder.title.replace(/\s+/g, '_')}.ics`);
    if (ok) toast.success('📅 فایل تقویم دانلود شد.');
  };

  return (
    <div className="uc" role="region" aria-label="یادآور و تقویم دوره‌ای آزمایش‌ها">
      <div className="uc-head">
        <h3 className="uc-title">📅 یادآور و تقویم دوره‌ای آزمایش‌ها</h3>
        <button type="button" className="uc-add-btn" onClick={() => onAddClick?.()}>
          + افزودن یادآور جدید
        </button>
      </div>

      {activeReminders.length === 0 ? (
        <div className="uc-empty">
          <span className="uc-empty-icon">🌿</span>
          <p>هنوز یادآوری ثبت نکرده‌اید. برای پیشگیری و سلامتی پایدار، چکاپ دوره‌ای خود را برنامه‌ریزی کنید.</p>
          <button type="button" className="uc-empty-cta" onClick={() => onAddClick?.()}>
            برنامه‌ریزی اولین چکاپ
          </button>
        </div>
      ) : (
        <ul className="uc-scroll">
          {activeReminders.map((reminder) => {
            const status = getReminderStatus(reminder);
            return (
              <li key={reminder.id} className={`uc-card uc-tone-${status.tone}`}>
                <header className="uc-card-head">
                  <strong className="uc-name" title={reminder.title}>{reminder.title}</strong>
                  <span className={`uc-status uc-status-${status.key}`}>{status.label}</span>
                </header>

                <div className="uc-meta-row">
                  <span className="uc-date">🗓️ {toLocalFa(reminder.targetDate)}</span>
                  <span className="uc-freq">🔁 {frequencyLabel(reminder.frequency)}</span>
                </div>

                {reminder.notes && (
                  <p className="uc-notes" title={reminder.notes}>💡 {reminder.notes}</p>
                )}

                <footer className="uc-actions">
                  <button
                    type="button"
                    className="uc-action uc-action-done"
                    onClick={() => onComplete?.(reminder.id)}
                    title="ثبت تکمیل و محاسبه دوره بعد"
                  >
                    <CheckGlyph /> تکمیل شد
                  </button>
                  <button
                    type="button"
                    className="uc-action"
                    onClick={() => handleGoogleCalendar(reminder)}
                    title="افزودن به Google Calendar"
                    aria-label="افزودن به Google Calendar"
                  >
                    <CalendarGlyph /> گوگل
                  </button>
                  <button
                    type="button"
                    className="uc-action"
                    onClick={() => handleIcsDownload(reminder)}
                    title="دانلود فایل iCalendar (.ics)"
                    aria-label="دانلود فایل iCalendar"
                  >
                    <DownloadGlyph /> ICS
                  </button>
                  <button
                    type="button"
                    className="uc-action uc-action-delete"
                    onClick={() => onDelete?.(reminder.id)}
                    title="حذف یادآور"
                    aria-label="حذف یادآور"
                  >
                    <TrashGlyph /> حذف
                  </button>
                </footer>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default UpcomingCheckupsWidget;
