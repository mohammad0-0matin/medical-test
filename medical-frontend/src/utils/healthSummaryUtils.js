/**
 * خلاصه پرونده سلامت (Personal Health Record)
 * ذخیره‌سازی: localStorage → salamatyar_health_summary
 */

export const SUMMARY_KEY = 'salamatyar_health_summary';

export const CONDITION_STATUSES = {
  active: { label: 'فعال', tone: 'danger' },
  managed: { label: 'تحت کنترل', tone: 'info' },
  resolved: { label: 'بهبود یافته', tone: 'success' },
};

export const ALLERGY_SEVERITIES = {
  mild: { label: 'خفیف', tone: 'neutral' },
  moderate: { label: 'متوسط', tone: 'warn' },
  severe: { label: 'شدید', tone: 'danger' },
};

export const CARE_PLAN_STATUSES = {
  in_progress: { label: 'در حال انجام', tone: 'info' },
  achieved: { label: 'محقق شد', tone: 'success' },
};

const EMPTY_SUMMARY = {
  conditions: [],
  medications: [],
  allergies: [],
  immunizations: [],
  carePlan: [],
};

const SECTIONS = Object.keys(EMPTY_SUMMARY);

const makeId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const sanitizeList = (value) => (Array.isArray(value) ? value : []);

/* ---------- Persistence ---------- */

export const getHealthSummary = () => {
  try {
    const raw = localStorage.getItem(SUMMARY_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const result = { ...EMPTY_SUMMARY };
    SECTIONS.forEach((section) => {
      result[section] = sanitizeList(parsed?.[section]);
    });
    return result;
  } catch {
    return { ...EMPTY_SUMMARY };
  }
};

export const saveHealthSummary = (summary) => {
  const clean = { ...EMPTY_SUMMARY };
  SECTIONS.forEach((section) => {
    clean[section] = sanitizeList(summary?.[section]);
  });
  try {
    localStorage.setItem(SUMMARY_KEY, JSON.stringify(clean));
  } catch {
    /* storage unavailable */
  }
  return clean;
};

/* ---------- Item CRUD ---------- */

const mutateSection = (section, mutator) => {
  const summary = getHealthSummary();
  const updated = {
    ...summary,
    [section]: mutator(sanitizeList(summary[section])),
  };
  return saveHealthSummary(updated);
};

export const addItem = (section, item) =>
  mutateSection(section, (list) => [
    ...list,
    { ...item, id: makeId() },
  ]);

export const updateItem = (section, itemId, patch) =>
  mutateSection(section, (list) =>
    list.map((item) => (item.id === itemId ? { ...item, ...patch } : item))
  );

export const deleteItem = (section, itemId) =>
  mutateSection(section, (list) => list.filter((item) => item.id !== itemId));

/** پیش‌نمایش تکمیل داده در صورت نبود مقدار */
export const resolveWithDefaults = (profile) => {
  const summary = getHealthSummary();
  if (!summary.conditions.length && !summary.medications.length && !summary.allergies.length) {
    return {
      ...summary,
      bloodGroup: profile?.blood_group || '',
    };
  }
  return summary;
};
