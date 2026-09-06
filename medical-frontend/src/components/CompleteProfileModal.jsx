import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { MEDICAL_ROLES, ROLE_LABELS, getStoredIdentity, storeIdentity } from '../utils/medicalIdentity';
import './AddTestModal.css';

/** Name/national-code field icon. */
const UserGlyph = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="8" r="3.6" />
        <path d="M5 20v-.8A5.2 5.2 0 0 1 10.2 14h3.6a5.2 5.2 0 0 1 5.2 5.2V20" />
    </svg>
);

/** Medical-ID card field icon. */
const IdCardGlyph = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <circle cx="9" cy="10.5" r="1.9" />
        <path d="M6.2 16.2c.6-1.6 1.9-2.4 2.8-2.4s2.2.8 2.8 2.4" />
        <path d="M15 9.5h4M15 13h4" />
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
 * Health-profile completion form (names, national code) plus optional
 * medical role & identity fields powering role badges. Existing values are
 * fetched from `/patients/me/` on open; when absent, the local identity
 * snapshot pre-fills role/id. Staff and doctor roles conditionally reveal
 * their dedicated ID field.
 *
 * @param {{isOpen: boolean, onClose: Function,
 *          onProfileUpdated?: Function}} props - Modal props.
 * @param {boolean} props.isOpen - Whether the modal is visible.
 * @param {Function} props.onClose - Requests closing the modal.
 * @param {Function} [props.onProfileUpdated] - Notifies parent after successful save.
 * @returns {JSX.Element|null} Profile form modal, or null when closed.
 */
const CompleteProfileModal = ({ isOpen, onClose, onProfileUpdated }) => {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        national_code: '',
        phone_number: '',      
        birth_date: '',        
        insurance_provider: 'none',
        medical_role: MEDICAL_ROLES.STANDARD,
        medical_id: ''
    });

    const [loading, setLoading] = useState(false);
        // Load existing profile data when the modal opens.
    useEffect(() => {
        if (!isOpen) return;

        const fetchProfile = async () => {
            const token = localStorage.getItem('access_token');
            try {
                const res = await fetch('http://127.0.0.1:8000/api/patients/me/', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    // Precedence: server value -> local snapshot -> standard default.
                    const identity = getStoredIdentity();
                    setFormData({
                        first_name: data.first_name || '',
                        last_name: data.last_name || '',
                        national_code: data.national_code || '',
                        phone_number: data.phone_number || '',
                        birth_date: data.birth_date || '',
                        insurance_provider: data.insurance_provider || 'none',
                        medical_role: data.medical_role || identity.role,
                        medical_id: data.medical_id || identity.id
                    });
                } else if (res.status === 404 || res.status === 401) {
                    const identity = getStoredIdentity();
                    setFormData((prev) => ({
                        ...prev,
                        medical_role: identity.role,
                        medical_id: identity.id
                    }));
                }
            } catch (error) {
                console.error('خطا در دریافت پروفایل:', error);
            }
        };

        fetchProfile();
    }, [isOpen]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    /**
     * POSTs the payload to `patients/me/`, mirrors the medical identity to
     * localStorage so badges work even without backend persistence, and
     * closes instantly — the toast renders floating on the main page.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            ...formData,
            medical_role: formData.medical_role || MEDICAL_ROLES.STANDARD,
            medical_id: formData.medical_role === MEDICAL_ROLES.STANDARD ? '' : formData.medical_id
        };  

        const token = localStorage.getItem('access_token');
        try {
            const response = await fetch('http://127.0.0.1:8000/api/patients/me/', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                // Mirror identity locally so badges work without backend support.
                storeIdentity({ role: payload.medical_role, id: payload.medical_id });
                toast.success('🩺 پرونده سلامت شما با موفقیت تکمیل شد!');
                if (onProfileUpdated) onProfileUpdated();
                // Close right away — the success toast floats over the page behind.
                onClose();
            } else {
                toast.error('❌ خطا در ثبت اطلاعات. لطفاً کدملی را بررسی کنید.');
            }
        } catch {
            toast.error('❌ خطای ارتباط با سرور');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" dir="rtl">
            <div className="modal-container">
                <div className="modal-header">
                    <h2>تکمیل پرونده سلامت</h2>
                    <button onClick={onClose} className="close-btn" aria-label="بستن پنجره" title="بستن">
                        <CloseGlyph />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="message-box message-info">
                        برای اینکه دیگران بتوانند برای شما نتیجه آزمایش ارسال کنند، لطفاً کدملی خود را با دقت وارد کنید.
                    </div>

                                        <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div>
                                <label className="form-label">نام:</label>
                                <div className="input-shell">
                                    <span className="input-icon"><UserGlyph /></span>
                                    <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} required className="form-input" autoComplete="given-name" />
                                </div>
                            </div>
                            <div>
                                <label className="form-label">نام خانوادگی:</label>
                                <div className="input-shell">
                                    <span className="input-icon"><UserGlyph /></span>
                                    <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} required className="form-input" autoComplete="family-name" />
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">کد ملی:</label>
                            <div className="input-shell">
                                <span className="input-icon"><IdCardGlyph /></span>
                                <input type="text" name="national_code" value={formData.national_code} onChange={handleChange} required placeholder="مثلاً 1234567890" className="form-input" dir="ltr" autoComplete="off" />
                            </div>
                        </div>
                        {/* شماره تماس */}
                        <div className="form-group">
                            <label className="form-label">شماره تلفن همراه:</label>
                            <div className="input-shell">
                                <span className="input-icon"><IdCardGlyph /></span>
                                <input
                                    type="tel"
                                    name="phone_number"
                                    value={formData.phone_number}
                                    onChange={handleChange}
                                    placeholder="مثال: 09123456789"
                                    className="form-input"
                                    dir="ltr"
                                    maxLength={11}
                                    autoComplete="tel"
                                />
                            </div>
                        </div>

                        {/* تاریخ تولد و بیمه در یک ردیف */}
                        <div className="form-row">
                            <div>
                                <label className="form-label">تاریخ تولد:</label>
                                <div className="input-shell">
                                    <input
                                        type="date"
                                        name="birth_date"
                                        value={formData.birth_date}
                                        onChange={handleChange}
                                        className="form-input"
                                    />
                                </div>
                            </div>
                        <div>
                            <label className="form-label" htmlFor="insurance-provider">بیمه طرف قرارداد:</label>
                            <div className="input-shell">
                                <select
                                    id="insurance-provider"
                                    name="insurance_provider"
                                    value={formData.insurance_provider}
                                    onChange={handleChange}
                                    className="form-input"
                                >
                                    <option value="none">فاقد بیمه پایه</option>
                                    <option value="tamin">تأمین اجتماعی</option>
                                    <option value="salamat">بیمه سلامت ایرانیان</option>
                                    <option value="mosahlar">خدمات درمانی نیروهای مسلح</option>
                                    <option value="other">سایر</option>
                                </select>
                            </div>
                        </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="medical-role">نقش کاربری و هویت پزشکی:</label>
                            <div className="input-shell">
                                <select
                                    id="medical-role"
                                    name="medical_role"
                                    value={formData.medical_role}
                                    onChange={handleChange}
                                    className="form-input"
                                >
                                    {Object.values(MEDICAL_ROLES).map((value) => (
                                        <option key={value} value={value}>{ROLE_LABELS[value]}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {formData.medical_role === MEDICAL_ROLES.DOCTOR && (
                            <div className="form-group">
                                <label className="form-label">شماره نظام پزشکی:</label>
                                <div className="input-shell">
                                    <span className="input-icon"><IdCardGlyph /></span>
                                    <input
                                        type="text"
                                        name="medical_id"
                                        value={formData.medical_id}
                                        onChange={handleChange}
                                        placeholder="مثلاً 123456"
                                        className="form-input"
                                        dir="ltr"
                                        autoComplete="off"
                                    />
                                </div>
                            </div>
                        )}

                        {formData.medical_role === MEDICAL_ROLES.STAFF && (
                            <div className="form-group">
                                <label className="form-label">کد پرسنلی / شناسه درمانی:</label>
                                <div className="input-shell">
                                    <span className="input-icon"><IdCardGlyph /></span>
                                    <input
                                        type="text"
                                        name="medical_id"
                                        value={formData.medical_id}
                                        onChange={handleChange}
                                        placeholder="شناسه درمانی خود را وارد کنید"
                                        className="form-input"
                                        dir="ltr"
                                        autoComplete="off"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="modal-footer">
                            <button type="submit" disabled={loading} className="btn-submit">
                                {loading ? (<><span className="btn-spinner" />در حال ثبت...</>) : 'ثبت و ذخیره پرونده'}
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

export default CompleteProfileModal;
