/**
 * Calendar export utilities — RFC-5545 (.ics) and Google Calendar links.
 * Fully client-side with UTF-8 support; every reminder becomes an all-day
 * VEVENT carrying a one-day-before VALARM trigger.
 *
 * @module utils/icsExport
 */

/** Approximate column at which RFC-5545 content lines are folded. */
const FOLD_AT = 73;

/** Escapes text for ICS property values per RFC-5545 (backslash, `;`, `,`, newlines). */
const escapeIcsText = (value) =>
  String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

/**
 * Folds long content lines at ~75 characters per RFC-5545 (character-count
 * approximation), continuing each folded segment with a single leading space.
 */
const foldLine = (line) => {
  if (line.length <= FOLD_AT) return line;
  const parts = [line.slice(0, FOLD_AT)];
  let rest = line.slice(FOLD_AT);
  while (rest.length > 0) {
    parts.push(` ${rest.slice(0, FOLD_AT - 1)}`);
    rest = rest.slice(FOLD_AT - 1);
  }
  return parts.join('\r\n');
};

const toIcsDateBasic = (isoDate) => String(isoDate).replace(/-/g, '');

const nextDayBasic = (isoDate) => {
  const parts = String(isoDate).split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return toIcsDateBasic(isoDate);
  const date = new Date(parts[0], parts[1] - 1, parts[2] + 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
};

const icsTimestampNow = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(
    now.getUTCDate()
  ).padStart(2, '0')}T${String(now.getUTCHours()).padStart(2, '0')}${String(
    now.getUTCMinutes()
  ).padStart(2, '0')}${String(now.getUTCSeconds()).padStart(2, '0')}Z`;
};

/**
 * Builds a one-click Google Calendar web link for an all-day event.
 *
 * @param {{title:string,targetDate:string,notes?:string}} reminder - Reminder data.
 * @returns {string} `render?action=TEMPLATE` URL with text/dates/details.
 */
export const buildGoogleCalendarUrl = ({ title, targetDate, notes = '' }) => {
  const dates = `${toIcsDateBasic(targetDate)}/${nextDayBasic(targetDate)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates,
    details: notes || 'یادآور آزمایش پزشکی — سلامت‌یار',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/**
 * Generates an RFC-5545 compliant calendar string.
 * Each reminder becomes an all-day VEVENT with a `VALARM` triggered
 * one day before the due date (`TRIGGER:-P1D`).
 *
 * @param {Array<object>} reminders - Reminders to include.
 * @returns {string} Complete ICS file content joined with CRLF.
 */
export const buildIcsCalendar = (reminders) => {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Salamatyar//Medical Test Reminders//FA',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  reminders.forEach((reminder) => {
    const descriptionParts = [];
    if (reminder.notes) descriptionParts.push(escapeIcsText(reminder.notes));
    descriptionParts.push('یادآور دوره‌ای آزمایش پزشکی — سلامت‌یار');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${reminder.id}@salamatyar.local`);
    lines.push(`DTSTAMP:${icsTimestampNow()}`);
    lines.push(`DTSTART;VALUE=DATE:${toIcsDateBasic(reminder.targetDate)}`);
    lines.push(`DTEND;VALUE=DATE:${nextDayBasic(reminder.targetDate)}`);
    lines.push(foldLine(`SUMMARY:${escapeIcsText(reminder.title)}`));
    lines.push(foldLine(`DESCRIPTION:${descriptionParts.join(' | ')}`));
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-P1D');
    lines.push('ACTION:DISPLAY');
    lines.push(foldLine(`DESCRIPTION:${escapeIcsText(`یادآوری یک روز قبل: ${reminder.title}`)}`));
    lines.push('END:VALARM');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');

  return lines.map(foldLine).join('\r\n');
};

/**
 * Triggers a browser download for an `.ics` file.
 *
 * @param {Array<object>} reminders - Reminders to export.
 * @param {string} [fileName] - Optional custom download filename.
 * @returns {boolean} False when there is nothing to download.
 */
export const downloadIcs = (reminders, fileName) => {
  if (!reminders || reminders.length === 0) return false;

  const icsContent = buildIcsCalendar(reminders);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download =
    fileName ||
    `salamatyar_reminders_${String(reminders[0].targetDate).replace(/-/g, '')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
};
