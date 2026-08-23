import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify'; // 👈 کتابخانه توست اضافه شد
import './AddTestModal.css'; 

const CompleteProfileModal = ({ isOpen, onClose, onProfileUpdated }) => {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        national_code: ''
    });

    const [loading, setLoading] = useState(false);
    // استیت قدیمی پیام‌ها حذف شد تا توست جایگزین آن شود

    // وقتی فرم باز می‌شود، چک می‌کند آیا قبلاً اطلاعاتی ثبت شده یا نه
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
                    setFormData({
                        first_name: data.first_name || '',
                        last_name: data.last_name || '',
                        national_code: data.national_code || ''
                    });
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        const token = localStorage.getItem('access_token');
        try {
            const response = await fetch('http://127.0.0.1:8000/api/patients/me/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                toast.success('🩺 پرونده سلامت شما با موفقیت تکمیل شد!'); // 👈 جادوی توست
                if (onProfileUpdated) onProfileUpdated();
                onClose(); // 👈 فرم بلافاصله بسته می‌شود چون توست روی صفحه اصلی شناور می‌ماند
            } else {
                toast.error('❌ خطا در ثبت اطلاعات. لطفاً کدملی را بررسی کنید.');
            }
        } catch (error) {
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
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>

                <div className="modal-body">
                    <div className="message-box message-success" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd', marginBottom: '20px' }}>
                        برای اینکه دیگران بتوانند برای شما نتیجه آزمایش ارسال کنند، لطفاً کدملی خود را با دقت وارد کنید.
                    </div>

                    {/* کدهای قدیمی نمایش ارور از اینجا حذف شد */}

                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div>
                                <label className="form-label">نام:</label>
                                <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} required className="form-input" />
                            </div>
                            <div>
                                <label className="form-label">نام خانوادگی:</label>
                                <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} required className="form-input" />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">کد ملی:</label>
                            <input type="text" name="national_code" value={formData.national_code} onChange={handleChange} required placeholder="مثلاً 1234567890" className="form-input" dir="ltr" />
                        </div>

                        <div className="modal-footer">
                            <button type="submit" disabled={loading} className="btn-submit">
                                {loading ? 'در حال ثبت...' : 'ثبت و ذخیره پرونده'}
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