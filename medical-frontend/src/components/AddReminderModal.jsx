import { useState } from 'react';
import { FREQUENCIES } from '../utils/reminderUtils';
import './AddTestModal.css';
import './AddReminderModal.css';

const POPULAR_TESTS = [
  'چکاپ قند خون ناشتا (FBS)',
  'آزمایش سالانه CBC',
  'پروفایل چربی خون (Lipid)',
  'تیروئید TSH',
  'فشار خون و قند',
  'هموگلوبین HbA1c',
];

const CloseGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const AddReminderModal = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    targetDate: '',
    frequency: 'once',
    notes: '',
  });
  const [formError, setFormError] = useState(null);

  if (!isOpen) return null;

  const todayIso = new Date().toISOString().slice(0, 10);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const title = formData.title.trim();
    if (title.length < 2) {
      setFormError('عنوان آزمایش را وارد کنید.');
      return;
    }
    if (!formData.targetDate) {
      setFormError('تاریخ موعد را انتخاب کنید.');
      return;
    }
    if (formData.targetDate < todayIso) {
      setFormError('تاریخ موعد نمی‌تواند در گذشته باشد.');
      return;
    }

    setFormError(null);
    onSave?.({
      title,
      targetDate: formData.targetDate,
      frequency: formData.frequency,
      notes: formData.notes,
    });

    setFormData({ title: '', targetDate: '', frequency: 'once', notes: '' });
    onClose();
  };

  return (
    <div className="modal-overlay" dir="rtl">
      <div className="modal-container arm-modal">
        <div className="modal-header">
          <h2>🗓️ افزودن یادآور آزمایش</h2>
          <button onClick={onClose} className="close-btn" aria-label="بستن پنجره" title="بستن">
            <CloseGlyph />
          </button>
        </div>

        <div className="modal-body">
          <div className="message-box message-info">
            دوره تکرار را مشخص کنید تا پس از هر تکمیل، موعد بعدی به‌صورت خودکار محاسبه شود.
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="arm-title">عنوان آزمایش:</label>
              <input
                id="arm-title"
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="مثلاً: چکاپ قند خون ناشتا"
                className="form-input"
                list="popular-tests"
              />
              <datalist id="popular-tests">
                {POPULAR_TESTS.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>

            <div className="form-row">
              <div>
                <label className="form-label" htmlFor="arm-date">تاریخ موعد:</label>
                <input
                  id="arm-date"
                  type="date"
                  name="targetDate"
                  value={formData.targetDate}
                  onChange={handleChange}
                  min={todayIso}
                  required
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label" htmlFor="arm-frequency">دوره تکرار:</label>
                <select
                  id="arm-frequency"
                  name="frequency"
                  value={formData.frequency}
                  onChange={handleChange}
                  className="form-input"
                >
                  {FREQUENCIES.map((freq) => (
                    <option key={freq.value} value={freq.value}>{freq.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="arm-notes">نکات و مراقبت‌های قبل از آزمایش (اختیاری):</label>
              <textarea
                id="arm-notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="مثلاً: ۸ ساعت ناشتا بودن ضروری است"
                className="form-input form-textarea"
              ></textarea>
            </div>

            {formError && (
              <div className="modal-alert" role="alert">⚠️ {formError}</div>
            )}

            <div className="modal-footer">
              <button type="submit" className="btn-submit">ثبت یادآور</button>
              <button type="button" onClick={onClose} className="btn-cancel">انصراف</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddReminderModal;
