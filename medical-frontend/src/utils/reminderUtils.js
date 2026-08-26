/**
 * یادآور و تقویم دوره‌ای آزمایش‌ها — CRUD و منطق وضعیت
 * ذخیره‌سازی: localStorage → salamatyar_test_reminders
 */

export const REMINDERS_KEY = 'salamatyar_test_reminders';

export const FREQUENCIES = [
  { value: 'once', label: 'یک‌بار', months: 0 },
  { value: 'monthly', label: 'هر ۱ ماه', months: 1 },
  { value: 'quarterly', label: 'هر ۳ ماه', months: 3 },
  { value: 'semiannual', label: 'هر ۶ ماه', months: 6 },
  { value: 'yearly', label: 'سالانه', months: 12 },
];

const toFaDigits = (value) =>
  String(value ?? '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

export const frequencyLabel = (value) =>
  FREQUENCIES.find((f) => f.value === value)?.label || value;

/* ---------- Persistence ---------- */

export const getReminders = () => {
  try {
    const raw = localStorage.getItem(REMINDERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const persist = (list) => {
  try {
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
};

/* ---------- Sorting ---------- */

export const sortByDueDate = (list) =>
  [...list].sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate));

/* ---------- CRUD ---------- */

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

export const deleteReminder = (id) => {
  const updated = getReminders().filter((r) => r.id !== id);
  persist(updated);
  return updated;
};

/**
 * تکمیل یادآور:
 * یک‌بار → isCompleted = true
 * دوره‌ای → محاسبه تاریخ دوره بعد و حفظ یادآور فعال
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

const addMonthsIso = (isoDate, months) => {
  const parts = String(isoDate).split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return isoDate;

  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  const originalDay = date.getDate();
  date.setMonth(date.getMonth() + months);

  // جلوگیری از پرش روز در ماه‌های کوتاه‌تر (مثلاً ۳۱ خرداد ← ۳۱ شهریور ندارد)
  if (date.getDate() !== originalDay) {
    date.setDate(0);
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const startOfDay = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * وضعیت پویا نسبت به امروز:
 * overdue (قرمز) | today | soon ≤۳ روز (کهربایی) | upcoming (سبز/آبی)
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

/** فقط یادآورهای فعال (تکمیل نشده) مرتب بر اساس موعد */
export const getActiveReminders = (list) =>
  sortByDueDate(list.filter((r) => !r.isCompleted));
