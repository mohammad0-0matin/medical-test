/**
 * CSV / Excel export with full Persian-text support.
 *
 * A UTF-8 Byte Order Mark (`\uFEFF`) is prepended to the generated payload
 * so Microsoft Excel opens the download as UTF-8 without mojibake.
 *
 * @module utils/exportToCsv
 */

/** Display labels keyed by backend approval status values. */
const STATUS_LABELS = {
  approved: 'تایید شده',
  pending: 'در انتظار تایید',
  rejected: 'رد شده',
};

const HEADERS = [
  'ردیف',
  'نام بیمار',
  'کد ملی',
  'نوع آزمایش',
  'مقدار نتیجه',
  'واحد اندازه‌گیری',
  'بازه نرمال',
  'تاریخ آزمایش',
  'وضعیت',
];

/**
 * Escapes a single CSV cell according to RFC-4180.
 * Cells containing quotes, commas or line breaks are wrapped in double
 * quotes with inner quotes doubled.
 */
const escapeCell = (value) => {
  const str = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

/** Formats a test date as a Persian calendar date; unparsable inputs pass through raw. */
const formatDate = (dateString) => {
  if (!dateString) return '';
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return String(dateString);
  return new Intl.DateTimeFormat('fa-IR').format(parsed);
};

/** Renders min/max bounds as a single 'X تا Y' text fragment, tolerating one-sided ranges. */
const buildRangeText = (test) => {
  const min = test.min_range ?? test.lab_min_range;
  const max = test.max_range ?? test.lab_max_range;

  if (min === null || min === undefined) {
    return max === null || max === undefined ? '' : String(max);
  }
  if (max === null || max === undefined) {
    return String(min);
  }
  return `${min} تا ${max}`;
};

/** Assembles one CSV row per test using patient/type/result/range/date/status columns. */
const buildRow = (test, index) => [
  index + 1,
  test.patient_name ||
    (test.patient?.first_name ? `${test.patient.first_name} ${test.patient.last_name}` : ''),
  test.patient?.national_code || '',
  test.test_type_name || '',
  test.result_value ?? test.result_text ?? '',
  test.unit || '—',
  buildRangeText(test),
  formatDate(test.test_date),
  STATUS_LABELS[test.status] || 'نامشخص',
];

/**
 * Builds a clean download filename using the current Jalali date
 * with Latin digits, e.g. `medical_tests_report_1405-06-03.csv`.
 */
const buildFileName = () => {
  const jalali = new Intl.DateTimeFormat('fa-IR-u-nu-latn')
    .format(new Date())
    .replace(/\//g, '-');
  return `medical_tests_report_${jalali}.csv`;
};

/**
 * Exports test results to an Excel-compatible CSV file.
 *
 * A UTF-8 Byte Order Mark (`\uFEFF`) is prepended so Persian text opens
 * correctly in Microsoft Excel without mojibake. The file is delivered via a
 * temporary object-URL anchor click and cleaned up immediately afterwards.
 *
 * @param {Array<object>} tests - Test results (already filtered/sorted).
 * @returns {void}
 */
export const exportTestsToCsv = (tests) => {
  const rows = [HEADERS, ...tests.map(buildRow)];
  const csvContent = '\uFEFF' + rows.map((row) => row.map(escapeCell).join(',')).join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = buildFileName();
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default exportTestsToCsv;
