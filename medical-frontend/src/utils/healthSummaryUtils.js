/**
 * Personal Health Record (PHR) — structured clinical summary persistence.
 * Storage: localStorage → `salamatyar_health_summary`.
 *
 * Sections:
 * - conditions:    `{ id, name, status: 'active'|'managed'|'resolved', diagnosedDate, notes }`
 * - medications:   `{ id, name, dosage, frequency, instructions, isActive }`
 * - allergies:     `{ id, allergen, severity: 'mild'|'moderate'|'severe', reaction, notes }`
 * - immunizations: `{ id, vaccineName, dateAdministered, boosterDueDate, notes }`
 * - carePlan:      `{ id, title, targetMetric, targetDate, status: 'in_progress'|'achieved' }`
 *
 * @module utils/healthSummaryUtils
 */

/** localStorage key holding the health summary object. */
export const SUMMARY_KEY = 'salamatyar_health_summary';

/** Display metadata for condition statuses keyed by status value. */
export const CONDITION_STATUSES = {
  active: { label: 'فعال', tone: 'danger' },
  managed: { label: 'تحت کنترل', tone: 'info' },
  resolved: { label: 'بهبود یافته', tone: 'success' },
};

/** Display metadata for allergy severities keyed by severity value. */
export const ALLERGY_SEVERITIES = {
  mild: { label: 'خفیف', tone: 'neutral' },
  moderate: { label: 'متوسط', tone: 'warn' },
  severe: { label: 'شدید', tone: 'danger' },
};

/** Display metadata for care-plan statuses keyed by status value. */
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

/** Generates a time-and-random-based unique id for summary items. */
const makeId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Coerces unknown stored values into arrays so sections never break rendering. */
const sanitizeList = (value) => (Array.isArray(value) ? value : []);

/* ---------- Persistence ---------- */

/**
 * Reads the full health summary, normalizing every section to an array.
 *
 * @returns {{conditions:Array,medications:Array,allergies:Array,immunizations:Array,carePlan:Array}}
 */
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

/**
 * Persists the full health summary (missing sections reset to empty).
 *
 * @param {object} summary - Complete summary object.
 * @returns {object} The sanitized summary that was stored.
 */
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

/** Applies a mutator to one section and persists the whole summary. */
const mutateSection = (section, mutator) => {
  const summary = getHealthSummary();
  const updated = {
    ...summary,
    [section]: mutator(sanitizeList(summary[section])),
  };
  return saveHealthSummary(updated);
};

/**
 * Adds a new item to a section. A unique `id` is generated automatically.
 *
 * @param {string} section - Target section key.
 * @param {object} item - Item payload (without `id`).
 * @returns {object} Updated health summary.
 */
export const addItem = (section, item) =>
  mutateSection(section, (list) => [
    ...list,
    { ...item, id: makeId() },
  ]);

/**
 * Partially updates an existing item by ID.
 *
 * @param {string} section - Target section key.
 * @param {string} itemId - Item ID to update.
 * @param {object} patch - Fields to merge.
 * @returns {object} Updated health summary.
 */
export const updateItem = (section, itemId, patch) =>
  mutateSection(section, (list) =>
    list.map((item) => (item.id === itemId ? { ...item, ...patch } : item))
  );

/**
 * Removes an item from a section by ID.
 *
 * @param {string} section - Target section key.
 * @param {string} itemId - Item ID to remove.
 * @returns {object} Updated health summary.
 */
export const deleteItem = (section, itemId) =>
  mutateSection(section, (list) => list.filter((item) => item.id !== itemId));

/**
 * Returns the summary enriched with profile-derived defaults
 * (reserved for future blood-group / profile integration).
 *
 * @param {object|null} profile - Patient profile.
 * @returns {object} Summary with optional `bloodGroup` default applied.
 */
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
