import { useState, useEffect, useRef, useMemo } from 'react';
import './AddTestModal.css';
import './TestComparisonModal.css';

const toFaDigits = (value) =>
  String(value ?? '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

/** Safely parses ISO-ish dates; returns null instead of an Invalid Date. */
const toDate = (dateString) => {
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Full Jalali date formatter (year/month/day) with '—' fallback. */
const jalaliFull = (dateString) => {
  const date = toDate(dateString);
  return date
    ? new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
    : '—';
};

/** Modal close glyph. */
const CloseGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

/** Extracts a finite number when the result value is numeric; null otherwise. */
const parseNumber = (test) => {
  if (test.result_value === null || test.result_value === undefined || test.result_value === '') {
    return null;
  }
  const num = parseFloat(test.result_value);
  return Number.isNaN(num) ? null : num;
};

/** Reads min/max from either key style; requires BOTH bounds to form a range. */
const getRange = (test) => {
  const min = test.min_range ?? test.lab_min_range;
  const max = test.max_range ?? test.lab_max_range;
  if (min === null || min === undefined || max === null || max === undefined) return null;
  return { min: parseFloat(min), max: parseFloat(max) };
};

/** True when the value falls inside [min, max]; null-safe on missing pieces. */
const inRange = (value, range) =>
  value !== null && range !== null && value >= range.min && value <= range.max;

/* ---------- Comparison math ---------- */

/**
 * Computes the full numeric comparison between two results.
 *
 * Delta calculation: `delta` is the raw signed difference; `deltaPct` divides
 * by `Math.abs(oldValue)` so negative baselines behave symmetrically and is
 * rounded to one decimal (skipped entirely for zero baselines). Direction
 * classifies the sign. When both values are numeric and each side exposes a
 * complete normal range, a membership transition is derived — 'improve'
 * (entered range), 'warn' (left range), or stable in/out states — which
 * drives the colored insight chip and summary wording.
 *
 * @param {object} oldTest - Baseline ("previous") test record.
 * @param {object} newTest - Target ("current") test record.
 * @returns {{numeric: boolean, oldValue: number|null, newValue: number|null,
 *   delta: number|null, deltaPct: number|null,
 *   direction: 'up'|'down'|'same',
 *   transition: {key:string,text:string}|null,
 *   oldRange: {min:number,max:number}|null,
 *   newRange: {min:number,max:number}|null,
 *   oldInRange: boolean|null, newInRange: boolean|null}}
 */
const computeComparison = (oldTest, newTest) => {
  const oldValue = parseNumber(oldTest);
  const newValue = parseNumber(newTest);
  const numeric = oldValue !== null && newValue !== null;

  const oldRange = getRange(oldTest);
  const newRange = getRange(newTest);

  let delta = null;
  let deltaPct = null;
  let direction = 'same';

  if (numeric) {
    delta = newValue - oldValue;
    if (delta > 0) direction = 'up';
    else if (delta < 0) direction = 'down';

    if (oldValue !== 0) {
      const pct = ((newValue - oldValue) / Math.abs(oldValue)) * 100;
      deltaPct = Number.isFinite(pct) ? Math.round(pct * 10) / 10 : null;
    }
  }

  // Normal-range membership transition.
  const oldInRange = numeric ? inRange(oldValue, oldRange) : null;
  const newInRange = numeric ? inRange(newValue, newRange) : null;

  let transition = null;
  if (oldInRange !== null && newInRange !== null) {
    if (!oldInRange && newInRange) {
      transition = { key: 'improve', text: 'بهبود: ورود به بازه نرمال 🟢' };
    } else if (oldInRange && !newInRange) {
      transition = { key: 'warn', text: 'هشدار: خروج از بازه نرمال 🔴' };
    } else if (oldInRange && newInRange) {
      transition = { key: 'stable-in', text: 'پایدار در محدوده نرمال ⚪' };
    } else {
      transition = { key: 'stable-out', text: 'پایدار خارج از محدوده ⚪' };
    }
  }

  return { numeric, oldValue, newValue, delta, deltaPct, direction, transition, oldRange, newRange, oldInRange, newInRange };
};

/**
 * Composes the Persian clinical-summary sentence shown under the grid,
 * combining direction-of-change wording (with localized percent where
 * available) and the appropriate tail clause for the transition state.
 *
 * @param {string} typeName - Human-readable test-type name.
 * @param {object} comparison - Result object from {@link computeComparison}.
 * @returns {string} Ready-to-render Persian analysis sentence.
 */
const buildClinicalSummary = (typeName, comparison) => {
  if (!comparison.numeric) {
    return `آزمایش ${typeName} دارای مقدار کیفی/متنی است و مقایسه عددی برای آن امکان‌پذیر نیست.`;
  }

  const { delta, deltaPct, transition } = comparison;

  let changeClause;
  if (delta === 0) {
    changeClause = 'شاخص ' + typeName + ' نسبت به آزمایش قبلی بدون تغییر مانده است';
  } else {
    const dirWord = delta > 0 ? 'افزایش' : 'کاهش';
    const pctText = deltaPct !== null ? `${toFaDigits(Math.abs(deltaPct).toFixed(1))}٪ ` : '';
    changeClause = `شاخص ${typeName} نسبت به آزمایش قبلی ${pctText}${dirWord} یافته است`;
  }

  const transitionClauses = {
    improve: 'و پس از خروج از بازه نرمال، اکنون در محدوده استاندارد تثبیت شده است.',
    warn: 'و از محدوده استاندارد خارج شده است؛ بررسی توسط پزشک توصیه می‌شود.',
    'stable-in': 'و همچنان در محدوده استاندارد قرار دارد.',
    'stable-out': 'و همچنان خارج از محدوده استاندارد قرار دارد؛ پیگیری پزشکی توصیه می‌شود.',
  };

  const tail = transition ? ` ${transitionClauses[transition.key]}` : '.';
  return changeClause + tail;
};

/* ---------- Normal-range position bar ---------- */

/**
 * Visual min→max bar pinning the result onto its reference interval.
 * The pin is anchored from the right edge (RTL layout), clamped into the
 * track, and tagged/darkened when the value lies outside the interval.
 *
 * @param {{value?: number|null, range?: {min:number,max:number}|null}} props - Bar props.
 * @returns {JSX.Element} Position bar, or the no-range placeholder row.
 */
const RangeBar = ({ value, range }) => {
  if (!range || value === null) {
    return <div className="tc-bar tc-bar-na">بازه نرمال ثبت نشده است</div>;
  }

  const span = range.max - range.min;
  const rawPos = span > 0 ? ((value - range.min) / span) * 100 : 50;
  const clampedPos = Math.min(100, Math.max(0, rawPos));
  const outside = rawPos < 0 || rawPos > 100;

  return (
    <div className="tc-bar-wrap">
      <div className="tc-bar">
        <span className="tc-bar-track" />
        <span
          className={`tc-pin ${outside ? 'tc-pin-out' : ''}`}
          style={{ right: `${clampedPos}%` }}
          title={outside ? (rawPos < 0 ? 'کمتر از حد نرمال' : 'بیشتر از حد نرمال') : 'در بازه نرمال'}
        >
          {toFaDigits(value)}
        </span>
      </div>
      <div className="tc-bar-labels">
        <span>حداقل: {toFaDigits(range.min)}</span>
        {outside && (
          <span className={`tc-out-tag ${rawPos < 0 ? 'tc-out-low' : 'tc-out-high'}`}>
            {rawPos < 0 ? '▼ کمتر از بازه' : '▲ بیشتر از بازه'}
          </span>
        )}
        <span>حداکثر: {toFaDigits(range.max)}</span>
      </div>
    </div>
  );
};

/* ---------- Component ---------- */

/**
 * Side-by-side comparison modal for two results of the same test type.
 * Tests are grouped by type (minimum two required per group); picking base
 * & target results feeds {@link computeComparison}, which powers direction
 * chips, delta percentages, RangeBar pins, the transition chip and the
 * Persian clinical summary — all wrapped in a physician disclaimer.
 *
 * @param {{isOpen: boolean, onClose: Function, tests?: Array<object>}} props - Modal props.
 * @param {boolean} props.isOpen - Whether the modal is visible.
 * @param {Function} props.onClose - Requests closing the modal (also fires on outside click / Escape).
 * @param {Array<object>} [props.tests] - Full results dataset to group and compare.
 * @returns {JSX.Element|null} Comparison modal, or null when closed.
 */
const TestComparisonModal = ({ isOpen, onClose, tests = [] }) => {
  if (!isOpen) return null;
  const [selectedType, setSelectedType] = useState('');
  const [baseId, setBaseId] = useState(null);
  const [targetId, setTargetId] = useState(null);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Test types with at least two recorded results.
  const typeGroups = useMemo(() => {
    const map = new Map();
    tests.forEach((t) => {
      if (t.test_type === undefined || t.test_type === null || !toDate(t.test_date)) return;
      if (!map.has(t.test_type)) {
        map.set(t.test_type, { name: t.test_type_name || '', items: [] });
      }
      map.get(t.test_type).items.push(t);
    });

    return [...map.entries()]
      .filter(([, group]) => group.items.length >= 2)
      .map(([id, group]) => ({
        id,
        name: group.name,
        items: group.items.slice().sort((a, b) => toDate(a.test_date) - toDate(b.test_date)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fa'));
  }, [tests]);

  // Reset selections every time the modal opens.
  const [syncedOpen, setSyncedOpen] = useState(false);
  if (isOpen !== syncedOpen) {
    setSyncedOpen(isOpen);
    if (isOpen) {
      setSelectedType('');
      setBaseId(null);
      setTargetId(null);
    }
  }

  const activeGroup = typeGroups.find((g) => String(g.id) === String(selectedType)) || null;

  const handleTypeChange = (e) => {
    const value = e.target.value;
    setSelectedType(value);

    const group = typeGroups.find((g) => String(g.id) === String(value));
    if (group && group.items.length >= 2) {
      // Auto-prefill the two most recent tests.
      setBaseId(group.items[group.items.length - 2].id);
      setTargetId(group.items[group.items.length - 1].id);
    } else {
      setBaseId(null);
      setTargetId(null);
    }
  };

  const baseTest = activeGroup?.items.find((i) => i.id === baseId) || null;
  const targetTest = activeGroup?.items.find((i) => i.id === targetId) || null;

  const sameSelection =
    baseTest && targetTest && baseTest.id === targetTest.id;

  const comparison =
    baseTest && targetTest && !sameSelection
      ? computeComparison(baseTest, targetTest)
      : null;

  const summaryText =
    baseTest && targetTest && comparison
      ? buildClinicalSummary(activeGroup?.name || baseTest.test_type_name || 'این آزمایش', comparison)
      : '';

  return (
    <div className="modal-overlay" dir="rtl">
      <div className="modal-container tc-modal" ref={rootRef}>
        <div className="modal-header">
          <h2>⚖️ مقایسه آزمایش‌ها</h2>
          <button onClick={onClose} className="close-btn" aria-label="بستن پنجره" title="بستن">
            <CloseGlyph />
          </button>
        </div>

        <div className="modal-body">
          {typeGroups.length === 0 ? (
            <div className="tc-empty">
              برای مقایسه، هر نوع آزمایش باید حداقل ۲ نتیجه ثبت‌شده داشته باشد.
              ابتدا چند نتیجه از یک نوع آزمایش یکسان ثبت کنید.
            </div>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="tc-type">نوع آزمایش:</label>
                <select
                  id="tc-type"
                  className="form-input"
                  value={selectedType}
                  onChange={handleTypeChange}
                >
                  <option value="">— انتخاب کنید —</option>
                  {typeGroups.map((group) => (
                    <option key={group.id} value={String(group.id)}>
                      {group.name} ({toFaDigits(group.items.length)} نتیجه)
                    </option>
                  ))}
                </select>
              </div>

              {!activeGroup && (
                <div className="tc-hint">برای شروع مقایسه، نوع آزمایش را انتخاب کنید.</div>
              )}

              {activeGroup && (
                <>
                  <div className="tc-pickers">
                    <div>
                      <label className="form-label">🧪 آزمایش پایه / قبلی:</label>
                      <select
                        className="form-input"
                        value={baseId ?? ''}
                        onChange={(e) => setBaseId(Number(e.target.value))}
                        aria-label="انتخاب آزمایش پایه"
                      >
                        {activeGroup.items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {jalaliFull(item.test_date)} — {(parseNumber(item) ?? item.result_text) || '—'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">🎯 آزمایش جدید / هدف:</label>
                      <select
                        className="form-input"
                        value={targetId ?? ''}
                        onChange={(e) => setTargetId(Number(e.target.value))}
                        aria-label="انتخاب آزمایش هدف"
                      >
                        {activeGroup.items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {jalaliFull(item.test_date)} — {(parseNumber(item) ?? item.result_text) || '—'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {sameSelection && (
                    <div className="modal-alert" role="alert">
                      ⚠️ لطفاً دو آزمایش متفاوت را برای مقایسه انتخاب کنید.
                    </div>
                  )}

                  {comparison && baseTest && targetTest && (
                    <>
                      <div className="tc-grid">
                        {/* Baseline test */}
                        <section className="tc-side-card">
                          <span className="tc-side-tag tc-side-old">آزمایش پایه</span>
                          <p className="tc-date">{jalaliFull(baseTest.test_date)}</p>
                          <p className="tc-value">
                            {comparison.oldValue !== null
                              ? toFaDigits(comparison.oldValue)
                              : (baseTest.result_text || '—')}
                          </p>
                          {comparison.numeric && comparison.oldRange && (
                            <RangeBar value={comparison.oldValue} range={comparison.oldRange} />
                          )}
                        </section>

                        {/* Delta column */}
                        <div className="tc-delta-col">
                          {comparison.direction === 'up' && (
                            <span className="tc-dir-chip tc-dir-up">▲ افزایش</span>
                          )}
                          {comparison.direction === 'down' && (
                            <span className="tc-dir-chip tc-dir-down">▼ کاهش</span>
                          )}
                          {comparison.direction === 'same' && (
                            <span className="tc-dir-chip tc-dir-same">= بدون تغییر</span>
                          )}
                          <strong className="tc-delta-value">
                            {comparison.delta !== null
                              ? `${comparison.delta > 0 ? '+' : ''}${toFaDigits(Math.round(comparison.delta * 100) / 100)}`
                              : '—'}
                          </strong>
                          {comparison.deltaPct !== null && (
                            <span className="tc-delta-pct">
                              Δ {comparison.deltaPct > 0 ? '+' : ''}
                              {toFaDigits(toFaSafe(comparison.deltaPct))}٪
                            </span>
                          )}
                          {comparison.transition && (
                            <span className={`tc-transition tc-transition-${comparison.transition.key}`}>
                              {comparison.transition.text}
                            </span>
                          )}
                        </div>

                        {/* Target test */}
                        <section className="tc-side-card">
                          <span className="tc-side-tag tc-side-new">آزمایش جدید / هدف</span>
                          <p className="tc-date">{jalaliFull(targetTest.test_date)}</p>
                          <p className="tc-value">
                            {comparison.newValue !== null
                              ? toFaDigits(comparison.newValue)
                              : (targetTest.result_text || '—')}
                          </p>
                          {comparison.numeric && comparison.newRange && (
                            <RangeBar value={comparison.newValue} range={comparison.newRange} />
                          )}
                        </section>
                      </div>

                      <div className="tc-summary" role="note">
                        <strong>خلاصه تحلیل:</strong> {summaryText}
                      </div>

                      <p className="tc-disclaimer">
                        ⚕️ این تحلیل صرفاً نمایش ریاضی تغییرات است و جایگزین مشاوره با پزشک نیست.
                      </p>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Rounds to one decimal first, then converts Western digits to Persian,
 * so percentages never display fractional-precision noise.
 */
const toFaSafe = (num) => toFaDigits(Number(num).toFixed(1));

export default TestComparisonModal;
