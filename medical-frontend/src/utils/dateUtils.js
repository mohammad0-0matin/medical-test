/**
 * Date utilities for Jalali display and ISO 8601 formatting.
 * Strictly adheres to Salamat-Yar DESIGN.md:
 * - Jalali (Solar Hijri) calendar for display
 * - Latin digits (0-9) everywhere
 * - ISO 8601 UTC (YYYY-MM-DD) for API transmission
 */

/**
 * Formats an ISO date string or Date object to Jalali date with Latin digits.
 * Example output: "1405/07/15"
 *
 * @param {string|Date} dateInput
 * @returns {string}
 */
export const formatJalaliDate = (dateInput) => {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '—';
    // 'fa-IR-u-ca-persian-nu-latn' ensures Jalali calendar with Latin digits (0-9)
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return '—';
  }
};

/**
 * Formats date and time to Jalali with Latin digits.
 * Example output: "1405/07/15، 14:30"
 *
 * @param {string|Date} dateInput
 * @returns {string}
 */
export const formatJalaliDateTime = (dateInput) => {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return '—';
  }
};

/**
 * Returns today's date in YYYY-MM-DD format for HTML5 date inputs.
 *
 * @returns {string}
 */
export const getTodayIsoDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
