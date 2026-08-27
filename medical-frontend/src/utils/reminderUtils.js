/**
 * Medical test schedule & reminders — CRUD and status logic.
 * Persistence: localStorage → `salamatyar_test_reminders`.
 *
 * @module utils/reminderUtils
 */

/** localStorage key holding the reminder list. */
export const REMINDERS_KEY = 'salamatyar_test_reminders';

/**
 * Available recurrence options.
 * `months` drives the next-due calculation on completion (0 = one-time).
 */
export const FREQUENCIES = [
  { value: 'once', label: 'یک‌بار', months: 0 },
  { value: 'monthly', label: 'هر ۱ ماه', months: 1 },
  { value: 'quarterly', label: 'هر ۳ ماه', months: 3 },
  { value: 'semiannual', label: 'هر ۶ ماه', months: 6 },
  { value: 'yearly', label: 'سالانه', months: 12 },
];

/** Converts Western digits inside any value to Persian digits. */
const toFaDigits = (value) =>
  String(value ?? '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

/**
 * Resolves the display label for a frequency key.
 *
 * @param {string} value - Frequency key (`once`, `monthly`, ...).
 * @returns {string} Persian label or the raw key when unknown.
 */
export const frequencyLabel = (value) =>
  FREQUENCIES.find((f) => f.value === value)?.label || value;

/* ---------- Persistence ---------- */

/**
 * Reads all reminders from localStorage.
 *
 * @returns {Array<object>} Reminder list (empty array when unavailable).
 */
export const getReminders = () => {
  try {
    const raw = localStorage.getItem(REMINDERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/** Safely persists a reminder list. */
const persist = (list) => {
  try {
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
};

/* ---------- Sorting ---------- */

/**
 * Returns a new list sorted by due date (oldest first).
 *
 * @param {Array<object>} list - Reminder list.
 * @returns {Array<object>} Sorted copy.
 */
export const sortByDueDate = (list) =>
  [...list].sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate));

/* ---------- CRUD ---------- */

/**
 * Creates a reminder and returns the updated, re-sorted list.
 *
 * @param {object} payload - New reminder data.
 * @param {string} payload.title - Test name / description.
 * @param {string} payload.targetDate - Due date (`YYYY-MM-DD`).
 * @param {string} [payload.frequency='once'] - Recurrence key.
 * @param {string} [payload.notes=''] - Preparation notes.
 * @returns {Array<object>} Updated reminder list.
 */
export const addReminder = ({ title, targetDate, frequency = 'once', notes = '' }) => {
  const reminder = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    title: String(title || '').trim(),
    targetDate,
    frequency,
    notes: String(notes || '').trim(),
    isCompleted: false,
  };

  const updated = sortByDueDate([...getReminders(), reminder]);
  persist(updated);
  return updated;
};

/**
 * Deletes a reminder by ID.
 *
 * @param {string} id - Reminder ID.
 * @returns {Array<object>} Updated reminder list.
 */
export const deleteReminder = (id) => {
  const updated = getReminders().filter((r) => r.id !== id);
  persist(updated);
  return updated;
};

/**
 * Marks a reminder as completed.
 * One-shot reminders are flagged `isCompleted`; recurring reminders keep
 * running and their due date is advanced by the configured recurrence.
 *
 * @param {string} id - Reminder ID.
 * @returns {Array<object>} Updated (re-sorted) reminder list.
 */
export const completeReminder = (id) => {
  const current = getReminders();
  const target = current.find((r) => r.id === id);
  if (!target) return sortByDueDate(current);

  const freqMeta = FREQUENCIES.find((f) => f.value === target.frequency);

  let updated;
  if (!freqMeta || freqMeta.months === 0) {
    updated = current.map((r) =>
      r.id === id ? { ...r, isCompleted: true } : r
    );
  } else {
    updated = current.map((r) =>
      r.id === id ? { ...r, targetDate: addMonthsIso(r.targetDate, freqMeta.months) } : r
    );
  }

  updated = sortByDueDate(updated);
  persist(updated);
  return updated;
};

/* ---------- Helpers ---------- */

/**
 * Adds months to an ISO date while clamping day overflow
 * (e.g. Jan 31 + 1 month → Feb 28/29 instead of rolling into March).
 *
 * @param {string} isoDate - `YYYY-MM-DD` input.
 * @param {number} months - Months to add.
 * @returns {string} Adjusted `YYYY-MM-DD` string.
 */
const addMonthsIso = (isoDate, months) => {
  const parts = String(isoDate).split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return isoDate;

  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  const originalDay = date.getDate();
  date.setMonth(date.getMonth() + months);

  if (date.getDate() !== originalDay) {
    date.setDate(0);
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** Normalizes any parseable date to local midnight. */
const startOfDay = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Computes the dynamic status of a reminder relative to today.
 *
 * Status keys:
 * - `overdue` (red): past due.
 * - `today` / `soon` ≤ 3 days (amber): imminent.
 * - `upcoming` (green/blue): further away.
 * - `done` / `unknown`: completed or unparsable.
 *
 * @param {object} reminder - Reminder record.
 * @returns {{key:string,label:string,tone:string,diffDays:number|null}}
 */
export const getReminderStatus = (reminder) => {
  const due = startOfDay(reminder.targetDate);
  const today = startOfDay(new Date());
  if (!due || !today) {
    return { key: 'unknown', label: 'نامشخص', tone: 'neutral', diffDays: null };
  }

  const diffDays = Math.round((due - today) / 86400000);

  if (diffDays < 0) {
    return {
      key: 'overdue',
      label: `${toFaDigits(Math.abs(diffDays))} روز گذشته`,
      tone: 'danger',
      diffDays,
    };
  }
  if (diffDays === 0) {
    return { key: 'today', label: 'امروز موعد است', tone: 'warn', diffDays: 0 };
  }
  if (diffDays <= 3) {
    return { key: 'soon', label: `${toFaDigits(diffDays)} روز مانده`, tone: 'warn', diffDays };
  }
  return { key: 'upcoming', label: `${toFaDigits(diffDays)} روز مانده`, tone: 'ok', diffDays };
};

/**
 * Returns only active (non-completed) reminders, sorted by due date.
 *
 * @param {Array<object>} list - Reminder list.
 * @returns {Array<object>} Active reminders.
 */
export const getActiveReminders = (list) =>
  sortByDueDate(list.filter((r) => !r.isCompleted));
