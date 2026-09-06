import React from 'react';
import './AddTestModal.css'; // استفاده از استایل‌های مشترک مودال

/**
 * TrashIcon: آیکون هشدار سطل زباله
 */
const TrashIcon = () => (
    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#dc2626" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
);

/**
 * CloseGlyph: آیکون بستن پنجره
 */
const CloseGlyph = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" />
    </svg>
);

/**
 * ConfirmDeleteModal Component
 *
 * @param {boolean} isOpen - وضعیت باز یا بسته بودن مودال
 * @param {Function} onClose - بستن مودال بدون انجام عملیات
 * @param {Function} onConfirm - اجرای تابع حذف رکورد
 * @param {string} title - عنوان هشدار
 * @param {string} message - متن توضیحات تایید حذف
 * @param {boolean} loading - وضعیت لودینگ هنگام ارسال درخواست حذف
 */
const ConfirmDeleteModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = "حذف رکورد آزمایش",
    message = "آیا از حذف این نتیجه آزمایش اطمینان دارید؟ این عملیات غیرقابل بازگشت است.",
    loading = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" dir="rtl">
            <div className="modal-container" style={{ maxWidth: '420px', textAlign: 'center' }}>
                <div className="modal-header" style={{ justifyContent: 'space-between' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>{title}</h3>
                    <button onClick={onClose} className="close-btn" aria-label="بستن پنجره">
                        <CloseGlyph />
                    </button>
                </div>

                <div className="modal-body" style={{ padding: '24px 16px' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: '16px'
                    }}>
                        <div style={{
                            backgroundColor: '#fee2e2',
                            borderRadius: '50%',
                            padding: '14px',
                            display: 'flex'
                        }}>
                            <TrashIcon />
                        </div>
                    </div>

                    <p style={{
                        fontSize: '0.95rem',
                        color: '#475569',
                        lineHeight: '1.6',
                        margin: 0
                    }}>
                        {message}
                    </p>
                </div>

                <div className="modal-footer" style={{ justifyContent: 'center', gap: '12px' }}>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className="btn-submit"
                        style={{
                            backgroundColor: '#dc2626',
                            color: '#ffffff',
                            border: 'none',
                            padding: '8px 20px',
                            borderRadius: '6px',
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? 'در حال حذف...' : 'بله، حذف شود'}
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="btn-cancel"
                        style={{
                            padding: '8px 20px',
                            borderRadius: '6px'
                        }}
                    >
                        انصراف
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDeleteModal;