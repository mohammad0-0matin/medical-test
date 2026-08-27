import { useState } from 'react';
import { toast } from 'react-toastify';
import {
  getClinicalNote,
  saveClinicalNote,
  deleteClinicalNote,
  formatNoteTimestamp,
} from '../utils/clinicalNotesUtils';
import './AddTestModal.css';
import './ClinicalNotesModal.css';

const CloseGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

/** Suggested fasting/sample-condition strings offered via datalist. */
const FASTING_SUGGESTIONS = [
  '۸ ساعت ناشتا',
  '۱۲ ساعت ناشتا',
  'رندوم / بدون ناشتایی',
  'نمونه‌گیری صبحگاهی',
];

/** Blank field template reused whenever no note exists yet. */
const EMPTY_FORM = {
  fastingHours: '',
  medications: '',
  notes: '',
  doctorName: '',
};

/**
 * Create / edit / delete clinical notes for a single test result.
 * Fields: fasting state, concurrent medications, doctor interpretation
 * and signer name. Doctor-role users receive their name auto-prefilled
 * via {@link doctorPrefill}. Saving an entirely empty form deletes the entry.
 *
 * @param {{isOpen: boolean, onClose: Function, test: object|null,
 *          doctorPrefill?: string, onSaved?: Function,
 *          onDeleted?: Function}} props - Modal props.
 * @param {boolean} props.isOpen - Whether the modal is visible.
 * @param {Function} props.onClose - Requests closing the modal.
 * @param {object|null} props.test - Test result being annotated.
 * @param {string} [props.doctorPrefill] - Pre-filled signer name for doctors.
 * @param {Function} [props.onSaved] - Called with (testId, storedEntry).
 * @param {Function} [props.onDeleted] - Called with testId when removed.
 * @returns {JSX.Element|null} Clinical-notes modal, or null when closed.
 */
const ClinicalNotesModal = ({
  isOpen,
  onClose,
  test,
  doctorPrefill = '',
  onSaved,
  onDeleted,
}) => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [existingUpdatedAt, setExistingUpdatedAt] = useState('');
  const [hasExisting, setHasExisting] = useState(false);

  // Load the existing note every time the modal opens for a test.
  // (Render-phase state adjustment pattern instead of useEffect.)
  const [syncedKey, setSyncedKey] = useState('closed');
  const openKey = isOpen && test ? `cn-${test.id}` : 'closed';

  if (openKey !== syncedKey) {
    setSyncedKey(openKey);
    if (isOpen && test) {
      const note = getClinicalNote(test.id);
      if (note) {
        setFormData({
          fastingHours: note.fastingHours || '',
          medications: note.medications || '',
          notes: note.notes || '',
          doctorName: note.doctorName || '',
        });
        setExistingUpdatedAt(note.updatedAt || '');
        setHasExisting(true);
      } else {
        setFormData({ ...EMPTY_FORM, doctorName: doctorPrefill });
        setExistingUpdatedAt('');
        setHasExisting(false);
      }
    }
  }

  if (!isOpen || !test) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  /** Persists the note; a null return means the empty form deleted it. */
  const handleSave = (e) => {
    e.preventDefault();

    const entry = saveClinicalNote(test.id, formData);
    setHasExisting(Boolean(entry));
    setExistingUpdatedAt(entry?.updatedAt || '');

    if (entry) {
      toast.success('📝 یادداشت بالینی ذخیره شد.');
      onSaved?.(test.id, entry);
    } else {
      toast.info('یادداشت خالی بود و حذف شد.');
      onDeleted?.(test.id);
    }
  };

  /** Confirm-guarded removal that resets the form back to the doctor prefill. */
  const handleDelete = () => {
    if (!window.confirm('حذف کامل یادداشت بالینی این آزمایش؟')) return;
    deleteClinicalNote(test.id);
    setFormData({ ...EMPTY_FORM, doctorName: doctorPrefill });
    setHasExisting(false);
    setExistingUpdatedAt('');
    toast.success('🗑️ یادداشت حذف شد.');
    onDeleted?.(test.id);
  };

  return (
    <div className="modal-overlay" dir="rtl">
      <div className="modal-container cn-modal">
        <div className="modal-header">
          <h2>📝 یادداشت بالینی</h2>
          <button onClick={onClose} className="close-btn" aria-label="بستن پنجره" title="بستن">
            <CloseGlyph />
          </button>
        </div>

        <div className="modal-body">
          <p className="cn-test-name">
            آزمایش: <strong>{test.test_type_name}</strong>
            {test.patient_name && <> — بیمار: <strong>{test.patient_name}</strong></>}
          </p>

          {hasExisting && existingUpdatedAt && (
            <p className="cn-updated">آخرین به‌روزرسانی: {formatNoteTimestamp(existingUpdatedAt)}</p>
          )}

          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label" htmlFor="cn-fasting">وضعیت ناشتایی و شرایط نمونه‌گیری:</label>
              <input
                id="cn-fasting"
                type="text"
                name="fastingHours"
                value={formData.fastingHours}
                onChange={handleChange}
                placeholder="مثلاً: ۸ ساعت ناشتا"
                className="form-input"
                list="cn-fasting-suggestions"
              />
              <datalist id="cn-fasting-suggestions">
                {FASTING_SUGGESTIONS.map((suggestion) => (
                  <option key={suggestion} value={suggestion} />
                ))}
              </datalist>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="cn-meds">داروها و دوز مصرفی همزمان:</label>
              <input
                id="cn-meds"
                type="text"
                name="medications"
                value={formData.medications}
                onChange={handleChange}
                placeholder="مثلاً: لووتیروکسین ۵۰ میکروگرم، متفورمین ۵۰۰"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="cn-notes">نظر، تشخیص و توصیه‌های پزشک:</label>
              <textarea
                id="cn-notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="تفسیر بالینی، توصیه‌های درمانی و پیگیری بعدی..."
                className="form-input form-textarea cn-notes-area"
              ></textarea>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="cn-doctor">نام یا مهر پزشک ثبت‌کننده (اختیاری):</label>
              <input
                id="cn-doctor"
                type="text"
                name="doctorName"
                value={formData.doctorName}
                onChange={handleChange}
                placeholder="مثلاً: دکتر رضایی"
                className="form-input"
              />
            </div>

            <div className="modal-footer cn-footer">
              {hasExisting && (
                <button type="button" className="btn-cancel cn-delete-btn" onClick={handleDelete}>
                  حذف یادداشت
                </button>
              )}
              <button type="submit" className="btn-submit">ذخیره یادداشت</button>
              <button type="button" onClick={onClose} className="btn-cancel">بستن</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ClinicalNotesModal;
