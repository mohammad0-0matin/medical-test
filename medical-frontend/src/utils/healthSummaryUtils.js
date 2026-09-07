import API from '../api';

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
  care_plans: [],
  carePlan: [],
  screenings: [],
};

const makeId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const sanitizeList = (val) => (Array.isArray(val) ? val : []);

/* ---------- ارتباط با سرور (API) ---------- */

export const getHealthSummaryApi = async () => {
  try {
    const res = await API.get('health-summary/');
    const data = res.data || {};
    const carePlans = sanitizeList(data.care_plans || data.carePlan);
    return {
      conditions: sanitizeList(data.conditions),
      medications: sanitizeList(data.medications),
      allergies: sanitizeList(data.allergies),
      immunizations: sanitizeList(data.immunizations),
      care_plans: carePlans,
      carePlan: carePlans,
      screenings: sanitizeList(data.screenings),
      updated_at: data.updated_at || '',
    };
  } catch (error) {
    console.error('خطا در دریافت خلاصه پرونده:', error);
    return { ...EMPTY_SUMMARY };
  }
};

export const saveHealthSummaryApi = async (summary) => {
  const carePlans = sanitizeList(summary.care_plans || summary.carePlan);
  const payload = {
    conditions: sanitizeList(summary.conditions),
    medications: sanitizeList(summary.medications),
    allergies: sanitizeList(summary.allergies),
    immunizations: sanitizeList(summary.immunizations),
    care_plans: carePlans,
    screenings: sanitizeList(summary.screenings),
  };
  const res = await API.put('health-summary/', payload);
  return res.data;
};

export const addItemApi = async (currentSummary, section, item) => {
  const targetSection = section === 'carePlan' ? 'care_plans' : section;
  const list = sanitizeList(currentSummary[targetSection] || currentSummary[section]);
  const updatedList = [...list, { ...item, id: makeId() }];
  const updatedSummary = {
    ...currentSummary,
    [targetSection]: updatedList,
    [section]: updatedList,
  };
  await saveHealthSummaryApi(updatedSummary);
  return updatedSummary;
};

export const updateItemApi = async (currentSummary, section, itemId, patch) => {
  const targetSection = section === 'carePlan' ? 'care_plans' : section;
  const list = sanitizeList(currentSummary[targetSection] || currentSummary[section]);
  const updatedList = list.map((it) => (it.id === itemId ? { ...it, ...patch } : it));
  const updatedSummary = {
    ...currentSummary,
    [targetSection]: updatedList,
    [section]: updatedList,
  };
  await saveHealthSummaryApi(updatedSummary);
  return updatedSummary;
};

export const deleteItemApi = async (currentSummary, section, itemId) => {
  const targetSection = section === 'carePlan' ? 'care_plans' : section;
  const list = sanitizeList(currentSummary[targetSection] || currentSummary[section]);
  const updatedList = list.filter((it) => it.id !== itemId);
  const updatedSummary = {
    ...currentSummary,
    [targetSection]: updatedList,
    [section]: updatedList,
  };
  await saveHealthSummaryApi(updatedSummary);
  return updatedSummary;
};

/* ---------- توابع همگام و سازگار برای رفع ارور کامپوننت‌های فرانت ---------- */

export const getHealthSummary = () => {
  try {
    const raw = localStorage.getItem(SUMMARY_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      conditions: sanitizeList(parsed.conditions),
      medications: sanitizeList(parsed.medications),
      allergies: sanitizeList(parsed.allergies),
      immunizations: sanitizeList(parsed.immunizations),
      care_plans: sanitizeList(parsed.care_plans || parsed.carePlan),
      carePlan: sanitizeList(parsed.care_plans || parsed.carePlan),
      screenings: sanitizeList(parsed.screenings),
    };
  } catch {
    return { ...EMPTY_SUMMARY };
  }
};

export const saveHealthSummary = (summary) => {
  try {
    localStorage.setItem(SUMMARY_KEY, JSON.stringify(summary));
  } catch {
    /* storage unavailable */
  }
  // ارسال غیرهمگام به سرور در پس‌زمینه در صورت در دسترس بودن
  saveHealthSummaryApi(summary).catch(() => {});
  return summary;
};

export const addItem = (section, item) => {
  const current = getHealthSummary();
  const targetSection = section === 'carePlan' ? 'care_plans' : section;
  const list = sanitizeList(current[targetSection] || current[section]);
  const updatedList = [...list, { ...item, id: makeId() }];
  const updated = {
    ...current,
    [targetSection]: updatedList,
    [section]: updatedList,
  };
  return saveHealthSummary(updated);
};

export const updateItem = (section, itemId, patch) => {
  const current = getHealthSummary();
  const targetSection = section === 'carePlan' ? 'care_plans' : section;
  const list = sanitizeList(current[targetSection] || current[section]);
  const updatedList = list.map((it) => (it.id === itemId ? { ...it, ...patch } : it));
  const updated = {
    ...current,
    [targetSection]: updatedList,
    [section]: updatedList,
  };
  return saveHealthSummary(updated);
};

export const deleteItem = (section, itemId) => {
  const current = getHealthSummary();
  const targetSection = section === 'carePlan' ? 'care_plans' : section;
  const list = sanitizeList(current[targetSection] || current[section]);
  const updatedList = list.filter((it) => it.id !== itemId);
  const updated = {
    ...current,
    [targetSection]: updatedList,
    [section]: updatedList,
  };
  return saveHealthSummary(updated);
};

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