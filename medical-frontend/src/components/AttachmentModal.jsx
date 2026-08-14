import { useState } from 'react';
import API from '../api';

const AttachmentModal = ({ isOpen, onClose, testData, onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !testData) return null;

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
    setError(null);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('لطفاً ابتدا یک فایل انتخاب کنید.');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('test_result', testData.id);
    
    // 👈 هماهنگ‌سازی دقیق با مدل دیتابیس شما
    formData.append('file_path', selectedFile);           // خود فایل
    formData.append('file_name', selectedFile.name);      // نام فایل
    formData.append('mime_type', selectedFile.type);      // نوع فایل (مثلا image/png یا application/pdf)

    try {
      await API.post('attachments/', formData);
      setLoading(false);
      setSelectedFile(null); // پاک کردن فایل انتخاب شده
      onUploadSuccess(); // آپدیت جدول داشبورد
    } catch (err) {
      setLoading(false);
      console.error('Upload Error:', err.response?.data || err.message);
      setError('خطا در آپلود فایل. لطفاً دوباره تلاش کنید.');
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>پیوست‌های آزمایش</h2>
          <button onClick={onClose} style={styles.closeBtn}>×</button>
        </div>

        <div style={styles.content}>
          <p style={styles.subtitle}>
            بیمار: <strong>{testData.patient?.first_name} {testData.patient?.last_name}</strong> | 
            نوع: <strong>{testData.test_type_name}</strong>
          </p>

          <div style={styles.attachmentList}>
            <h3 style={styles.listTitle}>فایل‌های آپلود شده:</h3>
            {testData.attachments && testData.attachments.length > 0 ? (
              <ul style={styles.ul}>
                {testData.attachments.map((file, index) => (
                  <li key={file.id} style={styles.li}>
                    {/* 👈 نمایش نام فایل که در دیتابیس ذخیره شده */}
                    <span>{file.file_name || `پیوست شماره ${index + 1}`}</span>
                    
                    {/* 👈 استفاده از file_path برای لینک دانلود */}
                    <a href={file.file_path} target="_blank" rel="noopener noreferrer" style={styles.viewLink}>
                      مشاهده فایل
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={styles.emptyText}>هیچ فایلی برای این آزمایش ثبت نشده است.</p>
            )}
          </div>

          <hr style={styles.divider} />

          <form onSubmit={handleUpload}>
            <h3 style={styles.listTitle}>آپلود فایل جدید:</h3>
            {error && <div style={styles.error}>{error}</div>}
            
            <div style={styles.uploadGroup}>
              <input 
                type="file" 
                onChange={handleFileChange} 
                style={styles.fileInput}
                accept=".pdf, image/*"
              />
              <button type="submit" style={styles.uploadBtn} disabled={loading || !selectedFile}>
                {loading ? 'در حال آپلود...' : 'آپلود'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, direction: 'rtl', fontFamily: 'Tahoma, Arial, sans-serif' },
  modal: { backgroundColor: '#fff', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '500px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  title: { margin: 0, fontSize: '1.2rem', color: '#1f2937' },
  closeBtn: { background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' },
  content: { marginTop: '1rem' },
  subtitle: { fontSize: '0.9rem', color: '#4b5563', marginBottom: '1.5rem' },
  attachmentList: { marginBottom: '1.5rem', backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px' },
  listTitle: { fontSize: '0.95rem', color: '#374151', margin: '0 0 0.75rem 0' },
  ul: { listStyle: 'none', padding: 0, margin: 0 },
  li: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb', fontSize: '0.9rem' },
  viewLink: { color: '#2563eb', textDecoration: 'none', fontWeight: 'bold' },
  emptyText: { fontSize: '0.85rem', color: '#9ca3af', margin: 0 },
  divider: { border: 'none', borderTop: '1px solid #e5e7eb', margin: '1.5rem 0' },
  uploadGroup: { display: 'flex', gap: '0.5rem' },
  fileInput: { flex: 1, padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' },
  uploadBtn: { padding: '0.5rem 1.5rem', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  error: { backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' },
};

export default AttachmentModal;