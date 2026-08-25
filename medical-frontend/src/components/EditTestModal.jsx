import { useState } from 'react';
import API from '../api';
import './AddTestModal.css';

const UserGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="3.6" />
    <path d="M5 20v-.8A5.2 5.2 0 0 1 10.2 14h3.6a5.2 5.2 0 0 1 5.2 5.2V20" />
  </svg>
);

const FlaskGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 3h4" />
    <path d="M10 3v6l-4.7 8.2A2.4 2.4 0 0 0 7.3 21h9.4a2.4 2.4 0 0 0 2-3.8L14 9V3" />
    <path d="M8.5 15h7" />
  </svg>
);

const CalendarGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="5.5" width="16" height="15" rx="2.5" />
    <path d="M8 3v4M16 3v4M4 10.5h16" />
  </svg>
);

const NumberGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9.5 4L7.7 20M16.3 4L14.5 20M4.5 9h15M3.7 15h15" />
  </svg>
);

const TextGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 6h14M5 11h14M5 16h9" />
  </svg>
);

const MinGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 4v13" />
    <path d="M6.5 12L12 17.5 17.5 12" />
    <path d="M5 20h14" />
  </svg>
);

const MaxGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20V7" />
    <path d="M6.5 12L12 6.5 17.5 12" />
    <path d="M5 4h14" />
  </svg>
);

const CloseGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const EditTestModal = ({ isOpen, onClose, onTestUpdated, testData }) => {
  const [formData, setFormData] = useState({
    patient: '',
    test_type: '',
    result_value: '',
    result_text: '',
    lab_min_range: '',
    lab_max_range: '',
    test_date: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // وقتی مودال برای هر آزمایشی باز می‌شود، اطلاعات آن را در فرم قرار می‌دهیم
  // (الگوی رسمی «تنظیم وضعیت هنگام تغییر پراپس» به‌جای useEffect)
  const [syncedTestId, setSyncedTestId] = useState('closed');
  const openTestId = isOpen && testData ? `edit-${testData.id}` : 'closed';

  if (openTestId !== syncedTestId) {
    setSyncedTestId(openTestId);
    if (isOpen && testData) {
      setFormData({
        patient: testData.patient?.id || '',
        test_type: testData.test_type || '',
        result_value: testData.result_value ?? '',
        result_text: testData.result_text ?? '',
        lab_min_range: testData.lab_min_range ?? '',
        lab_max_range: testData.lab_max_range ?? '',
        test_date: testData.test_date || '',
        notes: testData.notes || '',
      });
      setError(null);
    }
  }

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      ...formData,
      patient: parseInt(formData.patient),
      test_type: parseInt(formData.test_type),
      result_value: formData.result_value !== '' ? parseFloat(formData.result_value) : null,
      lab_min_range: formData.lab_min_range !== '' ? parseFloat(formData.lab_min_range) : null,
      lab_max_range: formData.lab_max_range !== '' ? parseFloat(formData.lab_max_range) : null,
    };

    try {
      // استفاده از متد PUT برای آپدیت رکورد
      await API.put(`test-results/${testData.id}/`, payload);
      setLoading(false);
      onTestUpdated(); // آپدیت کردن جدول
      onClose(); // بستن مودال
    } catch (err) {
      setLoading(false);
      if (err.response && err.response.data) {
        const serverErrors = err.response.data;
        const firstError = Object.values(serverErrors)[0];
        setError(Array.isArray(firstError) ? firstError[0] : 'خطا در ویرایش داده‌ها');
      } else {
        setError('خطا در ارتباط با سرور.');
      }
    }
  };

  return (
    <div className="modal-overlay" dir="rtl">
      <div className="modal-container">
        <div className="modal-header">
          <h2>ویرایش نتیجه آزمایش</h2>
          <button onClick={onClose} className="close-btn" aria-label="بستن پنجره" title="بستن">
            <CloseGlyph />
          </button>
        </div>

        <div className="modal-body">
          {/* برای سادگی ویرایش، نام بیمار و نوع آزمایش را فقط خواندنی (Read-Only) می‌کنیم */}
          {error && (
            <div className="modal-alert" role="alert">⚠️ {error}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div>
                <label className="form-label">نام بیمار:</label>
                <div className="input-shell">
                  <span className="input-icon"><UserGlyph /></span>
                  <input
                    type="text"
                    value={`${testData.patient?.first_name ?? ''} ${testData.patient?.last_name ?? ''}`}
                    disabled
                    className="form-input"
                  />
                </div>
              </div>
              <div>
                <label className="form-label">نوع آزمایش:</label>
                <div className="input-shell">
                  <span className="input-icon"><FlaskGlyph /></span>
                  <input type="text" value={testData.test_type_name} disabled className="form-input" />
                </div>
              </div>
            </div>

            <div className="form-row">
              <div>
                <label className="form-label">نتیجه عددی:</label>
                <div className="input-shell">
                  <span className="input-icon"><NumberGlyph /></span>
                  <input
                    type="number"
                    step="0.01"
                    name="result_value"
                    value={formData.result_value}
                    onChange={handleChange}
                    className="form-input"
                    dir="ltr"
                  />
                </div>
              </div>
              <div>
                <label className="form-label">نتیجه متنی:</label>
                <div className="input-shell">
                  <span className="input-icon"><TextGlyph /></span>
                  <input
                    type="text"
                    name="result_text"
                    value={formData.result_text}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
              <div>
                <label className="form-label">حداقل بازه نرمال:</label>
                <div className="input-shell">
                  <span className="input-icon"><MinGlyph /></span>
                  <input
                    type="number"
                    step="0.01"
                    name="lab_min_range"
                    value={formData.lab_min_range}
                    onChange={handleChange}
                    className="form-input"
                    dir="ltr"
                  />
                </div>
              </div>
              <div>
                <label className="form-label">حداکثر بازه نرمال:</label>
                <div className="input-shell">
                  <span className="input-icon"><MaxGlyph /></span>
                  <input
                    type="number"
                    step="0.01"
                    name="lab_max_range"
                    value={formData.lab_max_range}
                    onChange={handleChange}
                    className="form-input"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">تاریخ آزمایش:</label>
              <div className="input-shell">
                <span className="input-icon"><CalendarGlyph /></span>
                <input
                  type="date"
                  name="test_date"
                  value={formData.test_date}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? (<><span className="btn-spinner" />در حال ذخیره...</>) : 'ذخیره تغییرات'}
              </button>
              <button type="button" onClick={onClose} className="btn-cancel">
                انصراف
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditTestModal;
