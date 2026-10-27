import { useState, useRef, useEffect } from 'react';
import API from '../api';
import { toast } from 'react-toastify';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import './AddTestModal.css';
import './AttachmentModal.css';

/** Attachment card document icon. */
const FileGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M13.5 3H7a1.8 1.8 0 0 0-1.8 1.8v14.4A1.8 1.8 0 0 0 7 21h10a1.8 1.8 0 0 0 1.8-1.8V8.3L13.5 3z" />
    <path d="M13.5 3v5.3H19" />
  </svg>
);

/** Dropzone cloud-upload icon. */
const UploadCloudGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6.5 18a4.5 4.5 0 0 1-.9-8.9A5.5 5.5 0 0 1 16.2 7.6 4.2 4.2 0 0 1 17.8 15.7" />
    <path d="M12 12v8" />
    <path d="M8.8 15L12 11.8 15.2 15" />
  </svg>
);

/** External-view action icon opening the stored file in a new tab. */
const EyeGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 5h5v5" />
    <path d="M19 5l-8 8" />
    <path d="M19 14v4a1.8 1.8 0 0 1-1.8 1.8H6A1.8 1.8 0 0 1 4.2 18V6.8A1.8 1.8 0 0 1 6 5h4" />
  </svg>
);

/** Delete-attachment action icon (swap-in spinner during pending delete). */
const TrashGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 7h16" />
    <path d="M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7" />
    <path d="M6.2 7l.9 12.1A1.5 1.5 0 0 0 8.6 20.5h6.8a1.5 1.5 0 0 0 1.5-1.4L17.8 7" />
  </svg>
);

/** Modal header close-button glyph. */
const CloseGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

/**
 * Formats a timestamp as a Persian date, or '—' when absent/unparsable.
 *
 * @param {string} value - ISO-ish datetime string.
 * @returns {string} Formatted date or em-dash placeholder.
 */
const formatDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : new Intl.DateTimeFormat('fa-IR-u-nu-latn').format(parsed);
};

/** Renders a byte count as a human-readable kilobyte label (minimum 1 KB). */
const formatSize = (bytes) => `${Math.max(1, Math.round((bytes || 0) / 1024))} کیلوبایت`;

/** Accepts only images (by MIME prefix) or PDF files (by extension). */
const isAllowedFile = (file) =>
  !!file && (file.type.startsWith('image/') || (file.name || '').toLowerCase().endsWith('.pdf'));

/** Resolves download/view URL ensuring absolute backend address when path is relative. */
const resolveFileUrl = (filePath) => {
  if (!filePath) return '#';
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  const backendOrigin = 'http://127.0.0.1:8000';
  return `${backendOrigin}${filePath.startsWith('/') ? '' : '/'}${filePath}`;
};

/**
 * Attachment manager for a test result: drag-&-drop upload zone with live
 * progress bar, attachment cards (view/delete) and optimistic local list sync.
 *
 * @param {{isOpen: boolean, onClose: Function, testData?: object|null,
 *          test?: object|null, testId?: string|number,
 *          onUploadSuccess?: Function}} props - Modal props.
 * @returns {JSX.Element|null} Attachment manager modal, or null when closed.
 */
const AttachmentModal = ({ isOpen, onClose, testData, test, testId, onUploadSuccess }) => {
  const currentTest = testData || test || (testId ? { id: testId } : null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [remoteAttachments, setRemoteAttachments] = useState(null);
  const inputRef = useRef(null);

  const targetTestId = currentTest?.id || testId;

  // Fetch latest attachments from server on mount or when targetTestId changes
  useEffect(() => {
    if (!targetTestId) return;

    let isCancelled = false;
    API.get(`attachments/?test_result=${targetTestId}`)
      .then((res) => {
        if (isCancelled) return;
        const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
        setRemoteAttachments(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        if (!isCancelled) {
          console.warn('Could not fetch attachments from server:', err);
          setRemoteAttachments([]);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [targetTestId]);

  if (!isOpen || !currentTest) return null;

  const loadingList = remoteAttachments === null;
  const attachments = remoteAttachments !== null ? remoteAttachments : (currentTest.attachments || []);

  /** Validates then stages a picked/dropped file in the upload chip. */
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

  /**
   * Uploads the staged file as multipart form data through axios so the
   * progress event can drive the progress bar; appends the created record
   * to the local list and notifies the parent on success.
   */
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
    formData.append('test_result', targetTestId);

    // Field names match the Attachment model exactly.
    formData.append('file_path', selectedFile);           // The uploaded file itself
    formData.append('file_name', (selectedFile.name || 'attachment').slice(0, 190));
    formData.append('mime_type', (selectedFile.type || 'application/octet-stream').slice(0, 50));

    try {
      const response = await API.post('attachments/', formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
          }
        },
      });

      if (response?.data?.id) {
        setRemoteAttachments((prev) => {
          const base = prev !== null ? prev : (currentTest.attachments || []);
          const exists = base.some((a) => a.id === response.data.id);
          return exists ? base : [response.data, ...base];
        });
        setLoading(false);
        setSelectedFile(null); // Clear the selected-file chip after a successful upload
        setUploadProgress(0);
        toast.success('📎 فایل پیوست با موفقیت آپلود شد!');
        onUploadSuccess?.(response.data); // Let the dashboard/tests page refresh its data table
      }
    } catch (err) {
      setLoading(false);
      console.error('Upload Error:', err.response?.data || err.message);
      let errorMsg = 'خطا در آپلود فایل. لطفاً دوباره تلاش کنید.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMsg = err.response.data;
        } else if (err.response.data.detail) {
          errorMsg = err.response.data.detail;
        } else {
          const firstVal = Object.values(err.response.data)[0];
          if (Array.isArray(firstVal) && firstVal.length > 0) {
            errorMsg = firstVal[0];
          } else if (typeof firstVal === 'string') {
            errorMsg = firstVal;
          }
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  /** Opens custom confirmation modal for the given attachment. */
  const handleDeleteClick = (attachment) => {
    setDeleteTarget(attachment);
  };

  /** Confirm-guarded DELETE of one attachment with spinner-driven pending state. */
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    const attachmentToDelete = deleteTarget;
    setDeletingId(attachmentToDelete.id);
    try {
      await API.delete(`attachments/${attachmentToDelete.id}/`);
      setRemoteAttachments((prev) => {
        const base = prev !== null ? prev : (currentTest.attachments || []);
        return base.filter((item) => item.id !== attachmentToDelete.id);
      });
      setDeleteTarget(null);
      toast.success(`پیوست «${attachmentToDelete.file_name || 'فایل'}» با موفقیت حذف شد.`);
      onUploadSuccess?.(null, attachmentToDelete.id);
    } catch (err) {
      console.error('Delete Attachment Error:', err);
      let errorMsg = 'خطا در حذف پیوست. لطفاً دوباره تلاش کنید.';
      if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      }
      toast.error(errorMsg);
    } finally {
      setDeletingId(null);
    }
  };

  const patientDisplayName =
    currentTest.patient_name ||
    (currentTest.patient && typeof currentTest.patient === 'object'
      ? `${currentTest.patient.first_name || ''} ${currentTest.patient.last_name || ''}`.trim()
      : (currentTest.patient ? `بیمار #${currentTest.patient}` : ''));

  const testTypeDisplayName =
    currentTest.test_type_name || currentTest.test_name || currentTest.name || '';

  return (
    <>
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
            {patientDisplayName && <>بیمار: <strong>{patientDisplayName}</strong> </>}
            {testTypeDisplayName && <span className="att-badge">{testTypeDisplayName}</span>}
          </p>

          <h3 className="att-section-title">فایل‌های آپلود شده:</h3>
          {loadingList && attachments.length === 0 ? (
            <div className="att-empty">
              <span className="btn-spinner" /> در حال دریافت پیوست‌ها...
            </div>
          ) : attachments.length > 0 ? (
            <ul className="att-list">
              {attachments.map((file, index) => (
                <li key={file.id} className="att-card">
                  <span className="att-file-icon"><FileGlyph /></span>
                  <span className="att-meta">
                    <span className="att-name">{file.file_name || `پیوست شماره ${index + 1}`}</span>
                    <span className="att-date">آپلود: {formatDate(file.uploaded_at)}</span>
                  </span>
                  <span className="att-actions">
                    {/* file_path holds the download URL */}
                    <a href={resolveFileUrl(file.file_path)} target="_blank" rel="noopener noreferrer" className="att-view">
                      <EyeGlyph />
                      مشاهده
                    </a>
                    <button
                      type="button"
                      className="att-delete"
                      onClick={() => handleDeleteClick(file)}
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

    {/* Custom Accessible Confirmation Modal for Deleting Attachment */}
    <ConfirmDeleteModal
      isOpen={Boolean(deleteTarget)}
      onClose={() => !deletingId && setDeleteTarget(null)}
      onConfirm={handleConfirmDelete}
      title="حذف فایل پیوست"
      message={
        deleteTarget
          ? `آیا از حذف پیوست «${deleteTarget.file_name || 'فایل انتخابی'}» اطمینان دارید؟ این عملیات غیرقابل بازگشت است.`
          : ''
      }
      loading={Boolean(deletingId)}
    />
  </>
);
};

export default AttachmentModal;
