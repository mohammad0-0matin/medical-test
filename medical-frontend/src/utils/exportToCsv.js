/**
 * خروجی CSV/اکسل با پشتیبانی کامل متن فارسی
 * prepend UTF-8 BOM (\uFEFF) → Excel بدون Mojibake باز می‌کند
 */

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

const escapeCell = (value) => {
  const str = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return String(dateString);
  return new Intl.DateTimeFormat('fa-IR').format(parsed);
};

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

const buildFileName = () => {
  // تقویم شمسی با ارقام لاتین برای نام فایل تمیز (مثال: 1405-06-03)
  const jalali = new Intl.DateTimeFormat('fa-IR-u-nu-latn')
    .format(new Date())
    .replace(/\//g, '-');
  return `medical_tests_report_${jalali}.csv`;
};

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
