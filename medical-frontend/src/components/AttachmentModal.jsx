import { useState, useRef } from 'react';
import API from '../api';
import { toast } from 'react-toastify';
import './AddTestModal.css';
import './AttachmentModal.css';

const FileGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M13.5 3H7a1.8 1.8 0 0 0-1.8 1.8v14.4A1.8 1.8 0 0 0 7 21h10a1.8 1.8 0 0 0 1.8-1.8V8.3L13.5 3z" />
    <path d="M13.5 3v5.3H19" />
  </svg>
);

const UploadCloudGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6.5 18a4.5 4.5 0 0 1-.9-8.9A5.5 5.5 0 0 1 16.2 7.6 4.2 4.2 0 0 1 17.8 15.7" />
    <path d="M12 12v8" />
    <path d="M8.8 15L12 11.8 15.2 15" />
  </svg>
);

const EyeGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 5h5v5" />
    <path d="M19 5l-8 8" />
    <path d="M19 14v4a1.8 1.8 0 0 1-1.8 1.8H6A1.8 1.8 0 0 1 4.2 18V6.8A1.8 1.8 0 0 1 6 5h4" />
  </svg>
);

const TrashGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 7h16" />
    <path d="M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7" />
    <path d="M6.2 7l.9 12.1A1.5 1.5 0 0 0 8.6 20.5h6.8a1.5 1.5 0 0 0 1.5-1.4L17.8 7" />
  </svg>
);

const CloseGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const formatDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : new Intl.DateTimeFormat('fa-IR').format(parsed);
};

const formatSize = (bytes) => `${Math.max(1, Math.round((bytes || 0) / 1024))} کیلوبایت`;

const isAllowedFile = (file) =>
  !!file && (file.type.startsWith('image/') || (file.name || '').toLowerCase().endsWith('.pdf'));

const AttachmentModal = ({ isOpen, onClose, testData, onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingId, setDeletingId] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const inputRef = useRef(null);

  // همگام‌سازی لیست پیوست‌ها با testData هر بار که مودال برای یک آزمایش باز می‌شود
  // (الگوی رسمی «تنظیم وضعیت هنگام تغییر پراپس» به‌جای useEffect)
  const [syncedKey, setSyncedKey] = useState('idle');
  const syncKey = isOpen && testData ? `att-${testData.id}` : 'idle';

  if (syncKey !== syncedKey) {
    setSyncedKey(syncKey);
    if (isOpen && testData) {
      setAttachments(testData.attachments || []);
      setSelectedFile(null);
      setError(null);
      setUploadProgress(0);
      setDragActive(false);
    }
  }

  if (!isOpen || !testData) return null;

  const acceptFile = (file) => {
    if (!isAllowedFile(file)) {
      setError('فقط فایل‌های PDF یا تصویر مجاز هستند.');
      return;
    }
    setError(null);
    setSelectedFile(file);
  };

  const handleFileChange = (e) => {
    acceptFile(e.target.files[0]);
  };

  const openPicker = () => {
    inputRef.current?.click();
  };

  const handleDropzoneKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPicker();
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    acceptFile(e.dataTransfer.files[0]);
  };

  const clearSelected = () => setSelectedFile(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('لطفاً ابتدا یک فایل انتخاب کنید.');
      return;
    }

    setLoading(true);
    setError(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('test_result', testData.id);

    // 👈 هماهنگ‌سازی دقیق با مدل دیتابیس شما
    formData.append('file_path', selectedFile);           // خود فایل
    formData.append('file_name', selectedFile.name);      // نام فایل
    formData.append('mime_type', selectedFile.type);      // نوع فایل (مثلا image/png یا application/pdf)

    try {
      const response = await API.post('attachments/', formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
          }
        },
      });

      if (response?.data?.id) {
        setAttachments((prev) => [...prev, response.data]);
      }

      setLoading(false);
      setSelectedFile(null); // پاک کردن فایل انتخاب شده
      setUploadProgress(0);
      toast.success('📎 فایل پیوست با موفقیت آپلود شد!');
      onUploadSuccess(); // آپدیت جدول داشبورد
    } catch (err) {
      setLoading(false);
      console.error('Upload Error:', err.response?.data || err.message);
      setError('خطا در آپلود فایل. لطفاً دوباره تلاش کنید.');
    }
  };

  const handleDelete = async (attachment) => {
    if (!window.confirm(`حذف پیوست «${attachment.file_name}»؟ این عملیات قابل بازگشت نیست.`)) return;

    setDeletingId(attachment.id);
    try {
      await API.delete(`attachments/${attachment.id}/`);
      setAttachments((prev) => prev.filter((item) => item.id !== attachment.id));
      toast.success('🗑️ پیوست با موفقیت حذف شد.');
    } catch {
      toast.error('خطا در حذف پیوست. لطفاً دوباره تلاش کنید.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="modal-overlay" dir="rtl">
      <div className="modal-container">
        <div className="modal-header">
          <h2>پیوست‌های آزمایش</h2>
          <button onClick={onClose} className="close-btn" aria-label="بستن پنجره" title="بستن">
            <CloseGlyph />
          </button>
        </div>

        <div className="modal-body">
          <p className="att-subtitle">
            بیمار: <strong>{testData.patient?.first_name} {testData.patient?.last_name}</strong>
            <span className="att-badge">{testData.test_type_name}</span>
          </p>

          <h3 className="att-section-title">فایل‌های آپلود شده:</h3>
          {attachments.length > 0 ? (
            <ul className="att-list">
              {attachments.map((file, index) => (
                <li key={file.id} className="att-card">
                  <span className="att-file-icon"><FileGlyph /></span>
                  <span className="att-meta">
                    <span className="att-name">{file.file_name || `پیوست شماره ${index + 1}`}</span>
                    <span className="att-date">آپلود: {formatDate(file.uploaded_at)}</span>
                  </span>
                  <span className="att-actions">
                    {/* 👈 استفاده از file_path برای لینک دانلود */}
                    <a href={file.file_path} target="_blank" rel="noopener noreferrer" className="att-view">
                      <EyeGlyph />
                      مشاهده
                    </a>
                    <button
                      type="button"
                      className="att-delete"
                      onClick={() => handleDelete(file)}
                      disabled={deletingId === file.id}
                      aria-label={`حذف ${file.file_name || 'پیوست'}`}
                      title={deletingId === file.id ? 'در حال حذف...' : 'حذف'}
                    >
                      {deletingId === file.id ? <span className="btn-spinner" /> : <TrashGlyph />}
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="att-empty">
              <FileGlyph />
              هیچ فایلی برای این آزمایش ثبت نشده است.
            </div>
          )}

          <hr className="att-divider" />

          <form onSubmit={handleUpload}>
            <h3 className="att-section-title">آپلود فایل جدید:</h3>
            {error && <div className="modal-alert" role="alert">⚠️ {error}</div>}

            <div
              className={`att-dropzone ${dragActive ? 'att-dropzone-active' : ''}`}
              onClick={openPicker}
              onKeyDown={handleDropzoneKeyDown}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              role="button"
              tabIndex={0}
              aria-label="انتخاب یا رها کردن فایل"
            >
              <span className="att-dropzone-icon"><UploadCloudGlyph /></span>
              <span className="att-dropzone-title">فایل را اینجا رها کنید یا کلیک کنید</span>
              <span className="att-dropzone-hint">فرمت‌های مجاز: PDF و تصاویر</span>
              <input
                ref={inputRef}
                type="file"
                onChange={handleFileChange}
                accept=".pdf, image/*"
                className="att-hidden-input"
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>

            {selectedFile && !loading && (
              <div className="att-chip">
                <span className="att-chip-name">{selectedFile.name}</span>
                <span className="att-chip-size">{formatSize(selectedFile.size)}</span>
                <button type="button" className="att-chip-remove" onClick={clearSelected} aria-label="حذف فایل انتخاب شده">
                  <CloseGlyph />
                </button>
              </div>
            )}

            {loading && (
              <div className="att-progress">
                <div className="att-progress-track">
                  <div className="att-progress-bar" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p className="att-progress-label">در حال آپلود... {uploadProgress}٪</p>
              </div>
            )}

            <div className="att-footer">
              <button type="submit" className="btn-submit" disabled={loading || !selectedFile}>
                {loading ? (<><span className="btn-spinner" />در حال آپلود...</>) : 'آپلود فایل'}
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

export default AttachmentModal;
