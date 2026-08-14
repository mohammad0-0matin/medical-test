import { useState, useEffect } from 'react';
import API from '../api';

const AddTestModal = ({ isOpen, onClose, onTestAdded }) => {
  const [patients, setPatients] = useState([]);
  const [formData, setFormData] = useState({
    patient: '',
    test_type: '1', // مقدار پیش‌فرض
    result_value: '',
    result_text: '',
    lab_min_range: '',
    lab_max_range: '',
    test_date: new Date().toISOString().split('T')[0], // تاریخ امروز
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // دریافت لیست بیماران برای گزینه‌های Dropdown
  useEffect(() => {
    if (isOpen) {
      API.get('patients/')
        .then((res) => {
          const list = res.data.results || res.data;
          setPatients(list);
          if (list.length > 0) {
            setFormData((prev) => ({ ...prev, patient: list[0].id }));
          }
        })
        .catch((err) => console.error('Error fetching patients:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // تبدیل مقادیر خالی به null یا عدد
    const payload = {
      ...formData,
      patient: parseInt(formData.patient),
      test_type: parseInt(formData.test_type),
      result_value: formData.result_value !== '' ? parseFloat(formData.result_value) : null,
      lab_min_range: formData.lab_min_range !== '' ? parseFloat(formData.lab_min_range) : null,
      lab_max_range: formData.lab_max_range !== '' ? parseFloat(formData.lab_max_range) : null,
    };

    try {
      await API.post('test-results/', payload);
      setLoading(false);
      onTestAdded(); // به‌روزرسانی جدول در داشبورد
      onClose(); // بستن مودال
    } catch (err) {
      setLoading(false);
      if (err.response && err.response.data) {
        // دریافت خطاهای Validation بک‌اند
        const serverErrors = err.response.data;
        const firstError = Object.values(serverErrors)[0];
        setError(Array.isArray(firstError) ? firstError[0] : 'خطا در ثبت داده‌ها');
      } else {
        setError('خطا در ارتباط با سرور.');
      }
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>ثبت نتیجه آزمایش جدید</h2>
          <button onClick={onClose} style={styles.closeBtn}>×</button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>انتخاب بیمار:</label>
            <select
              name="patient"
              value={formData.patient}
              onChange={handleChange}
              style={styles.input}
              required
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>نوع آزمایش:</label>
              <select
                name="test_type"
                value={formData.test_type}
                onChange={handleChange}
                style={styles.input}
              >
                <option value="1">آزمایش خون / قند (FBS / CBC)</option>
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>تاریخ آزمایش:</label>
              <input
                type="date"
                name="test_date"
                value={formData.test_date}
                onChange={handleChange}
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>نتیجه عددی:</label>
              <input
                type="number"
                step="0.01"
                name="result_value"
                value={formData.result_value}
                onChange={handleChange}
                placeholder="مثلاً 95.5"
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>نتیجه متنی (اختیاری):</label>
              <input
                type="text"
                name="result_text"
                value={formData.result_text}
                onChange={handleChange}
                placeholder="مثلاً مثبت / منفی"
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>حداقل بازه نرمال:</label>
              <input
                type="number"
                step="0.01"
                name="lab_min_range"
                value={formData.lab_min_range}
                onChange={handleChange}
                placeholder="70"
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>حداکثر بازه نرمال:</label>
              <input
                type="number"
                step="0.01"
                name="lab_max_range"
                value={formData.lab_max_range}
                onChange={handleChange}
                placeholder="110"
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.actions}>
            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? 'در حال ثبت...' : 'ثبت آزمایش'}
            </button>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>
              انصراف
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    direction: 'rtl',
    fontFamily: 'Tahoma, Arial, sans-serif',
  },
  modal: {
    backgroundColor: '#fff',
    padding: '2rem',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '500px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  title: {
    margin: 0,
    fontSize: '1.2rem',
    color: '#1f2937',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#6b7280',
  },
  field: {
    marginBottom: '1rem',
    flex: 1,
  },
  row: {
    display: 'flex',
    gap: '1rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.4rem',
    fontSize: '0.85rem',
    color: '#374151',
  },
  input: {
    width: '100%',
    padding: '0.6rem',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '1.5rem',
  },
  submitBtn: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  cancelBtn: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  error: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '0.75rem',
    borderRadius: '6px',
    marginBottom: '1rem',
    fontSize: '0.85rem',
  },
};

export default AddTestModal;