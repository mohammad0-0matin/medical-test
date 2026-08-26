/**
 * یادداشت‌های بالینی هر نتیجه آزمایش
 * ذخیره‌سازی: localStorage → salamatyar_clinical_notes
 * ساختار: { [testId]: { notes, fastingHours, medications, doctorName, updatedAt } }
 */

const NOTES_KEY = 'salamatyar_clinical_notes';

const readAll = () => {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeAll = (map) => {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable */
  }
};

const hasContent = (entry) =>
  Boolean(
    entry &&
      (String(entry.notes || '').trim() ||
        String(entry.fastingHours || '').trim() ||
        String(entry.medications || '').trim() ||
        String(entry.doctorName || '').trim())
  );

export const getAllClinicalNotes = () => readAll();

export const getClinicalNote = (testId) => readAll()[testId] || null;

export const hasClinicalNote = (testId) => hasContent(readAll()[testId]);

/**
 * خلاصه متنی برای tooltip / گزارش چاپی
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
    // اگر همه فیلدها خالی باشند، عملاً حذف محسوب می‌شود
    delete map[testId];
    writeAll(map);
    return null;
  }

  map[testId] = entry;
  writeAll(map);
  return entry;
};

export const deleteClinicalNote = (testId) => {
  const map = readAll();
  delete map[testId];
  writeAll(map);
};

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
