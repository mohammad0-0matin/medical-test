import { useMemo } from 'react';
import './MedicalTimeline.css';

/* ---------- Category classification ---------- */

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

const classifyTest = (name = '') => {
  const lowered = name.toLowerCase();

  if (CATEGORIES.hormone.keywords.some((k) => lowered.includes(k))) return 'hormone';
  if (CATEGORIES.biochemistry.keywords.some((k) => lowered.includes(k))) return 'biochemistry';
  if (CATEGORIES.hematology.keywords.some((k) => lowered.includes(k))) return 'hematology';
  return 'general';
};

/* ---------- SVG glyphs ---------- */

const BloodGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3.2c3 4 6 7.2 6 10.6a6 6 0 0 1-12 0c0-3.4 3-6.6 6-10.6z" />
    <path d="M9.4 13.6a2.8 2.8 0 0 0 2.3 3" />
  </svg>
);

const FlaskGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 3h4" />
    <path d="M10 3v6l-4.7 8.2A2.4 2.4 0 0 0 7.3 21h9.4a2.4 2.4 0 0 0 2-3.8L14 9V3" />
    <path d="M8.5 15h7" />
  </svg>
);

const DnaGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 3c0 6 12 6 12 12" />
    <path d="M18 3c0 6-12 6-12 12" />
    <path d="M6 21c0-2 3-3.5 6-3.5s6 1.5 6 3.5" />
    <path d="M8 6.5h8M8 11.5h8" />
  </svg>
);

const StethoscopeGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4.5 3v6a5 5 0 0 0 10 0V3" />
    <path d="M9.5 14v1.5a4.5 4.5 0 0 0 9 0v-2.2" />
    <circle cx="19.6" cy="10.8" r="2" />
  </svg>
);

const CATEGORY_GLYPHS = {
  hematology: <BloodGlyph />,
  biochemistry: <FlaskGlyph />,
  hormone: <DnaGlyph />,
  general: <StethoscopeGlyph />,
};

/* ---------- Date helpers ---------- */

const toDate = (dateString) => {
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? null : date;
};

const fullJalali = (dateString) => {
  const date = toDate(dateString);
  return date
    ? new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
    : '—';
};

const monthYearJalali = (dateString) => {
  const date = toDate(dateString);
  return date
    ? new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long' }).format(date)
    : 'تاریخ نامشخص';
};

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

const toLocalFa = (value) =>
  String(value ?? '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

const APPROVAL_LABELS = {
  approved: { text: 'تایید شده', className: 'tl-st-approved' },
  pending: { text: 'در انتظار تایید', className: 'tl-st-pending' },
  rejected: { text: 'رد شده', className: 'tl-st-rejected' },
};

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

const MedicalTimeline = ({ tests = [], onChart, onAttachments, onEdit }) => {
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

                    <footer className="mt-actions">
                      <button type="button" onClick={() => onChart?.(test)}>📈 نمودار روند</button>
                      <button type="button" onClick={() => onAttachments?.(test)}>📎 پیوست‌ها ({test.attachments?.length || 0})</button>
                      <button type="button" onClick={() => onEdit?.(test)}>✏️ ویرایش</button>
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
