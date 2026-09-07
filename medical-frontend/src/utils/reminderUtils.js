import API from '../api';

export const FREQUENCIES = [
  { value: 'once', label: 'یک‌بار', months: 0 },
  { value: 'monthly', label: 'هر ۱ ماه', months: 1 },
  { value: 'every_3_months', label: 'هر ۳ ماه', months: 3 },
  { value: 'every_6_months', label: 'هر ۶ ماه', months: 6 },
  { value: 'yearly', label: 'سالانه', months: 12 },
];

export const toFaDigits = (value) =>
  String(value ?? '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

export const frequencyLabel = (value) =>
  FREQUENCIES.find((f) => f.value === value)?.label || value;

/**
 * تبدیل رکورد سرور (due_date / is_completed) به ساختار مصرفی فرانت‌اند (targetDate / isCompleted)
 */
export const normalizeReminder = (item) => ({
  id: item.id,
  title: item.title,
  targetDate: item.due_date,
  frequency: item.frequency,
  isCompleted: item.is_completed,
  notes: item.notes || '',
});

/**
 * واکشی یادآورها از سرور جنگو
 */
export const fetchRemindersApi = async () => {
  try {
    const res = await API.get('reminders/');
    const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
    return data.map(normalizeReminder);
  } catch (error) {
    console.error('خطا در دریافت یادآورها از سرور:', error);
    return [];
  }
};

/**
 * ثبت یادآور در دیتابیس
 */
export const addReminderApi = async (payload) => {
  const body = {
    title: payload.title,
    due_date: payload.targetDate,
    frequency: payload.frequency || 'once',
    notes: payload.notes || '',
  };
  const res = await API.post('reminders/', body);
  return normalizeReminder(res.data);
};

/**
 * تکمیل یادآور (یا محاسبه موعد بعدی بر اساس فرکانس)
 */
export const completeReminderApi = async (id, currentReminder) => {
  const freqMeta = FREQUENCIES.find((f) => f.value === currentReminder.frequency);

  if (!freqMeta || freqMeta.months === 0) {
    const res = await API.patch(`reminders/${id}/`, { is_completed: true });
    return normalizeReminder(res.data);
  }

  // اگر دوره‌ای بود، موعد بعدی را حساب کرده و تاریخ جدید را می‌فرستیم
  const parts = String(currentReminder.targetDate).split('-').map(Number);
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  const originalDay = date.getDate();
  date.setMonth(date.getMonth() + freqMeta.months);
  if (date.getDate() !== originalDay) {
    date.setDate(0);
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const nextDate = `${y}-${m}-${d}`;

  const res = await API.patch(`reminders/${id}/`, { due_date: nextDate });
  return normalizeReminder(res.data);
};

/**
 * حذف یادآور از دیتابیس
 */
export const deleteReminderApi = async (id) => {
  await API.delete(`reminders/${id}/`);
  return id;
};

/**
 * محاسبه وضعیت موعد برای بج‌های رنگی در کارت
 */
export const getReminderStatus = (reminder) => {
  if (!reminder?.targetDate) {
    return { key: 'unknown', label: 'نامشخص', tone: 'neutral', diffDays: null };
  }

  const [y, m, d] = reminder.targetDate.split('-').map(Number);
  const due = new Date(y, m - 1, d);
  due.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

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

export const getActiveReminders = (list) =>
  list.filter((r) => !r.isCompleted);