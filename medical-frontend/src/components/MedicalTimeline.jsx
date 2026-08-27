/**
 * Visual timeline of test results grouped by Jalali month/year.
 *
 * Props:
 * - tests: filtered & sorted dataset from the dashboard pipeline.
 * - clinicalNotesMap: existing clinical notes keyed by test id
 *   (rendered inside each card as an expandable `<details>` block).
 * - onChart / onAttachments / onEdit / onNotes: modal-open callbacks.
 *
 * Events are bucketed by month using a Map (guarantees insertion order);
 * each card shows a category chip from the keyword classifier, approval /
 * medical status chips, the result value with its normal-range pill,
 * and a footer of modal actions.
 *
 * @module components/MedicalTimeline
 */
import { useMemo } from 'react';
import './MedicalTimeline.css';

/* ---------- Category classification ---------- */

/**
 * Category metadata: display label plus lowercase keyword list.
 * A test name matching any keyword maps to the category; keyword sets are
 * intentionally bilingual (English abbreviations + Persian names) because
 * lab test titles arrive mixed-language from the backend.
 */
const CATEGORIES = {
  hematology: {
    label: 'هماتولوژی',
    keywords: ['cbc', 'hemoglobin', 'hb', 'rbc', 'wbc', 'platelet', 'پلاکت', 'هموگلوبین', 'هماتولوژی', 'کم خونی', 'کم‌خونی', 'anemia', 'esr', 'خون'],
  },
  biochemistry: {
    label: 'بیوشیمی',
    keywords: ['fbs', 'glucose', 'sugar', 'قند', 'hba1c', 'lipid', 'cholesterol', 'chol', 'trigly', 'چربی', 'creatinin', 'کراتینین', 'urea', 'اوره', 'uric', 'اسید اوریک', 'vitamin', 'ویتامین', 'liver', 'kidney', 'sgot', 'sgpt', 'بیوشیمی', 'biochem'],
  },
  hormone: {
    label: 'هورمونی و سرولوژی',
    keywords: ['tsh', 't3', 't4', 'thyroid', 'تیروئید', 'هورمون', 'hormone', 'testosteron', 'prolactin', 'cortisol', 'serolog', 'سرولوژی', 'antibod', 'آنتی‌بادی', 'dna', 'hiv', 'hbs'],
  },
  general: {
    label: 'عمومی',
    keywords: [],
  },
};

/**
 * Classifies a test name into a medical category based on keywords.
 * Priority order: hormone > biochemistry > hematology > general.
 *
 * @param {string} name - Test name to classify.
 * @returns {string} Category key: 'hematology' | 'biochemistry' | 'hormone' | 'general'
 */
const classifyTest = (name = '') => {
  const lowered = name.toLowerCase();

  if (CATEGORIES.hormone.keywords.some((k) => lowered.includes(k))) return 'hormone';
  if (CATEGORIES.biochemistry.keywords.some((k) => lowered.includes(k))) return 'biochemistry';
  if (CATEGORIES.hematology.keywords.some((k) => lowered.includes(k))) return 'hematology';
  return 'general';
};

/* ---------- SVG glyphs ---------- */

/** Category chip icon: hematology. */
const BloodGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3.2c3 4 6 7.2 6 10.6a6 6 0 0 1-12 0c0-3.4 3-6.6 6-10.6z" />
    <path d="M9.4 13.6a2.8 2.8 0 0 0 2.3 3" />
  </svg>
);

/** Category chip icon: biochemistry. */
const FlaskGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 3h4" />
    <path d="M10 3v6l-4.7 8.2A2.4 2.4 0 0 0 7.3 21h9.4a2.4 2.4 0 0 0 2-3.8L14 9V3" />
    <path d="M8.5 15h7" />
  </svg>
);

/** Category chip icon: hormone / serology. */
const DnaGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 3c0 6 12 6 12 12" />
    <path d="M18 3c0 6-12 6-12 12" />
    <path d="M6 21c0-2 3-3.5 6-3.5s6 1.5 6 3.5" />
    <path d="M8 6.5h8M8 11.5h8" />
  </svg>
);

/** Category chip icon: general / fallback. */
const StethoscopeGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4.5 3v6a5 5 0 0 0 10 0V3" />
    <path d="M9.5 14v1.5a4.5 4.5 0 0 0 9 0v-2.2" />
    <circle cx="19.6" cy="10.8" r="2" />
  </svg>
);

/** Map of category key → prebuilt chip icon element for timeline cards. */
const CATEGORY_GLYPHS = {
  hematology: <BloodGlyph />,
  biochemistry: <FlaskGlyph />,
  hormone: <DnaGlyph />,
  general: <StethoscopeGlyph />,
};

/* ---------- Date helpers ---------- */

/**
 * Parses an ISO date string to a Date object, returning null on invalid input.
 * 
 * @param {string} dateString - ISO date string (YYYY-MM-DD)
 * @returns {Date|null} Parsed Date object or null if invalid
 */
const toDate = (dateString) => {
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Formats a date string as a full Jalali date (e.g. "۱۴۰۴ مهر ۳").
 * 
 * @param {string} dateString - ISO date string (YYYY-MM-DD)
 * @returns {string} Full Jalali date string or '—' if invalid
 */
const fullJalali = (dateString) => {
  const date = toDate(dateString);
  return date
    ? new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
    : '—';
};

/**
 * Formats a date string as a Jalali month-year string (e.g. "مهر ۱۴۰۴").
 * 
 * @param {string} dateString - ISO date string (YYYY-MM-DD)
 * @returns {string} Jalali month-year string or 'تاریخ نامشخص' if invalid
 */
const monthYearJalali = (dateString) => {
  const date = toDate(dateString);
  return date
    ? new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long' }).format(date)
    : 'تاریخ نامشخص';
};

/**
 * Formats a date string as a relative Persian time string.
 * Returns relative time (e.g., "امروز", "دیروز", "۳ روز پیش", "۲ هفته پیش")
 * or falls back to month-year format for older dates.
 * 
 * @param {string} dateString - ISO date string (YYYY-MM-DD)
 * @returns {string} Relative Persian time string or empty string if invalid
 */
const relativeTimeFa = (dateString) => {
  const date = toDate(dateString);
  if (!date) return '';

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfDate = new Date(date);
  startOfDate.setHours(0, 0, 0, 0);

  const diffDays = Math.round((startOfToday - startOfDate) / 86400000);
  if (diffDays <= 0) return 'امروز';
  if (diffDays === 1) return 'دیروز';
  if (diffDays < 7) return `${toLocalFa(diffDays)} روز پیش`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${toLocalFa(weeks)} هفته پیش`;
  }
  return monthYearJalali(dateString);
};

/**
 * Converts Western digits to Persian digits.
 * 
 * @param {*} value - Input value (number or string)
 * @returns {string} Value with Persian digits (۰۱۲۳۴۵۶۷۸۹)
 */
const toLocalFa = (value) =>
  String(value ?? '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

/** Approval status display labels and CSS class mappings. */
const APPROVAL_LABELS = {
  approved: { text: 'تایید شده', className: 'tl-st-approved' },
  pending: { text: 'در انتظار تایید', className: 'tl-st-pending' },
  rejected: { text: 'رد شده', className: 'tl-st-rejected' },
};

/**
 * Determines the medical status of a test result against its reference range.
 * 
 * @param {object} test - Test result object with result_value, min/max ranges
 * @returns {object|null} { text, className } or null if values missing
 */
const medicalStatus = (test) => {
  const value = parseFloat(test.result_value);
  const min = parseFloat(test.min_range ?? test.lab_min_range);
  const max = parseFloat(test.max_range ?? test.lab_max_range);
  if (Number.isNaN(value) || Number.isNaN(min) || Number.isNaN(max)) return null;
  return value >= min && value <= max
    ? { text: 'نرمال', className: 'tl-med-normal' }
    : { text: 'غیرنرمال', className: 'tl-med-abnormal' };
};

/* ---------- Component ---------- */

/**
 * Visual timeline of test results grouped by Persian month.
 *
 * Props:
 * - tests: filtered & sorted dataset from the dashboard pipeline.
 * - clinicalNotesMap: existing notes keyed by test id (expandable block).
 * - onChart/onAttachments/onEdit/onNotes: modal open callbacks.
 */
const MedicalTimeline = ({
  tests = [],
  clinicalNotesMap = {},
  onChart,
  onAttachments,
  onEdit,
  onNotes,
}) => {
  const groups = useMemo(() => {
    const sorted = [...tests]
      .filter((t) => toDate(t.test_date))
      .sort((a, b) => toDate(b.test_date) - toDate(a.test_date));

    const map = new Map();
    sorted.forEach((test) => {
      const label = monthYearJalali(test.test_date);
      if (!map.has(label)) map.set(label, []);
      map.get(label).push({
        ...test,
        category: classifyTest(test.test_type_name),
      });
    });

    return [...map.entries()].map(([label, items]) => ({ label, items }));
  }, [tests]);

  if (tests.length === 0) {
    return (
      <div className="mt-empty" role="status">
        <StethoscopeGlyph />
        آزمایشی برای نمایش در تایم‌لاین وجود ندارد.
        <span>فیلترها را تغییر دهید یا آزمایش جدیدی ثبت کنید.</span>
      </div>
    );
  }

  return (
    <div className="mt" role="list" aria-label="تایم‌لاین آزمایش‌ها">
      {groups.map((group) => (
        <section key={group.label} className="mt-group">
          <div className="mt-group-label">
            <span className="mt-group-dot" aria-hidden="true" />
            {group.label}
          </div>

          <div className="mt-items">
            {group.items.map((test) => {
              const meta = CATEGORIES[test.category];
              const approval = APPROVAL_LABELS[test.status] || null;
              const medStatus = medicalStatus(test);
              const rangeMin = test.min_range ?? test.lab_min_range;
              const rangeMax = test.max_range ?? test.lab_max_range;
              const noteEntry = clinicalNotesMap?.[test.id];

              return (
                <article
                  key={`${test.id}-${test.category}`}
                  className={`mt-item tl-cat-${test.category}`}
                  role="listitem"
                >
                  <span className="mt-node" aria-hidden="true" />

                  <div className="mt-card">
                    <header className="mt-card-head">
                      <strong>{test.test_type_name}</strong>
                      <span className={`tl-cat-chip ${meta ? `tl-chip-${test.category}` : 'tl-chip-general'}`}>
                        {meta ? CATEGORY_GLYPHS[test.category] : <StethoscopeGlyph />}
                        {meta ? meta.label : 'عمومی'}
                      </span>
                    </header>

                    <div className="mt-meta-row">
                      <span className="mt-date-chip">🗓️ {fullJalali(test.test_date)}</span>
                      {relativeTimeFa(test.test_date) && (
                        <span className="mt-relative">{relativeTimeFa(test.test_date)}</span>
                      )}
                      {approval && (
                        <span className={`tl-status-chip ${approval.className}`}>{approval.text}</span>
                      )}
                      {medStatus && (
                        <span className={`tl-status-chip ${medStatus.className}`}>{medStatus.text}</span>
                      )}
                    </div>

                    <div className="mt-result-row">
                      <span className="mt-value">
                        {toLocalFa(test.result_value ?? '') || test.result_text || '—'}
                        {test.unit ? <small>{` ${test.unit}`}</small> : null}
                      </span>
                      {(rangeMin !== null && rangeMin !== undefined) ||
                      (rangeMax !== null && rangeMax !== undefined) ? (
                        <span className="mt-range-pill">
                          بازه نرمال: {rangeMin != null ? toLocalFa(rangeMin) : '—'} تا {rangeMax != null ? toLocalFa(rangeMax) : '—'}
                        </span>
                      ) : null}
                    </div>

                    {noteEntry && (
                      <details className="mt-notes">
                        <summary>📝 یادداشت بالینی</summary>
                        <div className="mt-notes-body">
                          {noteEntry.fastingHours && <span>🩸 ناشتایی: {noteEntry.fastingHours}</span>}
                          {noteEntry.medications && <span>💊 داروها: {noteEntry.medications}</span>}
                          {noteEntry.notes && <span>🩺 توصیه پزشک: {noteEntry.notes}</span>}
                          {noteEntry.doctorName && <span className="mt-notes-doctor">— {noteEntry.doctorName}</span>}
                        </div>
                      </details>
                    )}

                    <footer className="mt-actions">
                      <button type="button" onClick={() => onChart?.(test)}>📈 نمودار روند</button>
                      <button type="button" onClick={() => onAttachments?.(test)}>📎 پیوست‌ها ({test.attachments?.length || 0})</button>
                      <button type="button" onClick={() => onEdit?.(test)}>✏️ ویرایش</button>
                      <button
                        type="button"
                        className={`mt-notes-btn ${noteEntry ? 'mt-notes-btn-has' : ''}`}
                        onClick={() => onNotes?.(test)}
                        title={noteEntry ? 'مشاهده / ویرایش یادداشت بالینی' : 'افزودن یادداشت بالینی'}
                      >
                        📝 {noteEntry ? 'یادداشت' : 'افزودن یادداشت'}
                      </button>
                    </footer>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};

export default MedicalTimeline;
