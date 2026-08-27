/**
 * Clinical notes attached to individual test results.
 * Storage: localStorage → `salamatyar_clinical_notes`
 * Shape:   `{ [testId]: { notes, fastingHours, medications, doctorName, updatedAt } }`
 *
 * Purely client-side: no backend schema migration is required, and empty
 * saves are treated as deletions so the store never holds blank entries.
 *
 * @module utils/clinicalNotesUtils
 */

/** localStorage key holding the notes map. */
const NOTES_KEY = 'salamatyar_clinical_notes';

/** Reads the full `{ [testId]: entry }` map. */
const readAll = () => {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

/** Persists the notes map as JSON; storage failures are silently ignored. */
const writeAll = (map) => {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable */
  }
};

/**
 * An entry is considered meaningful only when at least one field has content;
 * whitespace-only entries never pollute the indicator badges.
 */
const hasContent = (entry) =>
  Boolean(
    entry &&
      (String(entry.notes || '').trim() ||
        String(entry.fastingHours || '').trim() ||
        String(entry.medications || '').trim() ||
        String(entry.doctorName || '').trim())
  );

/**
 * Returns the complete clinical-notes map.
 *
 * @returns {object} Map of testId → note entry.
 */
export const getAllClinicalNotes = () => readAll();

/**
 * Returns the note entry for a single test result.
 *
 * @param {string|number} testId - Test result ID.
 * @returns {object|null} Note entry or null when absent.
 */
export const getClinicalNote = (testId) => readAll()[testId] || null;

/**
 * Checks whether a meaningful note exists for a test result.
 *
 * @param {string|number} testId - Test result ID.
 * @returns {boolean}
 */
export const hasClinicalNote = (testId) => hasContent(readAll()[testId]);

/**
 * Builds a single-line preview (for tooltips / printed reports).
 * Composes fasting state, medications, interpretation and doctor name,
 * truncated to `maxLength` characters with an ellipsis suffix.
 *
 * @param {string|number} testId - Test result ID.
 * @param {number} [maxLength=90] - Maximum preview length.
 * @returns {string} Preview text or an empty string when no note exists.
 */
export const getClinicalNotePreview = (testId, maxLength = 90) => {
  const note = readAll()[testId];
  if (!hasContent(note)) return '';

  const parts = [];
  if (note.fastingHours) parts.push(`ناشتایی: ${note.fastingHours}`);
  if (note.medications) parts.push(`دارو: ${note.medications}`);
  if (note.notes) parts.push(note.notes);
  if (note.doctorName) parts.push(`پزشک: ${note.doctorName}`);

  const joined = parts.join(' | ');
  return joined.length > maxLength ? `${joined.slice(0, maxLength)}…` : joined;
};

/**
 * Creates or updates a note for a test result and stamps `updatedAt`.
 * Saving an entirely empty form removes any previous entry.
 *
 * @param {string|number} testId - Test result ID.
 * @param {object} fields - Note fields to persist.
 * @returns {object|null} The stored entry, or null when it was removed.
 */
export const saveClinicalNote = (testId, fields) => {
  const map = readAll();
  const entry = {
    notes: String(fields?.notes || '').trim(),
    fastingHours: String(fields?.fastingHours || '').trim(),
    medications: String(fields?.medications || '').trim(),
    doctorName: String(fields?.doctorName || '').trim(),
    updatedAt: new Date().toISOString(),
  };

  if (!hasContent(entry)) {
    delete map[testId];
    writeAll(map);
    return null;
  }

  map[testId] = entry;
  writeAll(map);
  return entry;
};

/**
 * Removes a note entry for a test result.
 *
 * @param {string|number} testId - Test result ID.
 * @returns {void}
 */
export const deleteClinicalNote = (testId) => {
  const map = readAll();
  delete map[testId];
  writeAll(map);
};

/**
 * Formats an ISO timestamp as a long Persian date-time string
 * (e.g. «۱۴۰۴ مهر ۳، ۱۴:۳۰»).
 *
 * @param {string} isoString - ISO timestamp.
 * @returns {string} Formatted label or '' when invalid/absent.
 */
export const formatNoteTimestamp = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};
