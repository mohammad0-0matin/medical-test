import React, { useState, useEffect } from 'react';
import './AddTestModal.css';

const AddTestModal = ({ isOpen, onClose, onTestAdded }) => {
    const [testTypes, setTestTypes] = useState([]);
    const [patients, setPatients] = useState([]);
    
    // استیت‌های جدید برای سیستم جستجو
    const [searchQuery, setSearchQuery] = useState('');
    const [searchedPatient, setSearchedPatient] = useState(null);
    const [searchError, setSearchError] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const [formData, setFormData] = useState({
        patient: '',
        test_type: '',
        result_value: '',
        test_date: '',
        notes: ''
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (!isOpen) return;
        const fetchData = async () => {
            const token = localStorage.getItem('access_token');
            if (!token) return;
            const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

            try {
                const patientsRes = await fetch('http://127.0.0.1:8000/api/patients/', { headers });
                if (patientsRes.ok) {
                    const patientsData = await patientsRes.json();
                    setPatients(patientsData);
                    if (patientsData.length > 0) setFormData(prev => ({ ...prev, patient: patientsData[0].id }));
                }

                const testTypesRes = await fetch('http://127.0.0.1:8000/api/test-types/', { headers });
                if (testTypesRes.ok) {
                    const testTypesData = await testTypesRes.json();
                    setTestTypes(testTypesData);
                    if (testTypesData.length > 0) setFormData(prev => ({ ...prev, test_type: testTypesData[0].id }));
                }
            } catch (error) {
                console.error('خطا در دریافت اطلاعات:', error);
            }
        };
        fetchData();
    }, [isOpen]);

    // تابع ارسال کدملی به بک‌اند و قفل کردن فرم
    const handleSearch = async () => {
        if (!searchQuery) return;
        setIsSearching(true);
        setSearchError('');
        setSearchedPatient(null);

        const token = localStorage.getItem('access_token');
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/patients/search/?q=${searchQuery}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                if (data.length > 0) {
                    const found = data[0];
                    setSearchedPatient(found);
                    setFormData({ ...formData, patient: found.id }); // آیدی بیمار روی فرم ست می‌شود
                } else {
                    setSearchError('بیماری با این کدملی یافت نشد.');
                }
            } else {
                setSearchError('بیماری با این کدملی یافت نشد.');
            }
        } catch (error) {
            setSearchError('خطای ارتباط با سرور.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });
        
        const token = localStorage.getItem('access_token');
        try {
            const response = await fetch('http://127.0.0.1:8000/api/test-results/', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setMessage({ type: 'success', text: '✅ آزمایش با موفقیت ثبت شد!' });
                setFormData({ ...formData, result_value: '', notes: '' });
                if (onTestAdded) onTestAdded();
                setTimeout(() => {
                    onClose();
                    setMessage({ type: '', text: '' });
                    setSearchedPatient(null); // ریست کردن جستجو برای دفعه بعد
                    setSearchQuery('');
                }, 1500);
            } else {
                setMessage({ type: 'error', text: '❌ خطا در ثبت آزمایش. اطلاعات را بررسی کنید.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: '❌ خطای ارتباط با سرور' });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" dir="rtl">
            <div className="modal-container">
                <div className="modal-header">
                    <h2>ثبت نتیجه آزمایش جدید</h2>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>

                <div className="modal-body">
                    {message.text && (
                        <div className={`message-box ${message.type === 'success' ? 'message-success' : 'message-error'}`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        
                        {/* بخش هیبرید: انتخاب از لیست یا جستجو */}
                        <div className="form-group" style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '20px' }}>
                            <label className="form-label" style={{ marginBottom: '12px' }}>بیمار (انتخاب از لیست یا جستجو):</label>
                            
                            {searchedPatient ? (
                                // حالت قفل شده روی بیمار پیدا شده
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#dcfce7', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                                    <span style={{ color: '#15803d', fontWeight: 'bold' }}>
                                        ✅ {searchedPatient.first_name} {searchedPatient.last_name}
                                    </span>
                                    <button type="button" onClick={() => { setSearchedPatient(null); setFormData({...formData, patient: patients[0]?.id || ''}); setSearchQuery(''); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>
                                        لغو انتخاب
                                    </button>
                                </div>
                            ) : (
                                // حالت عادی (لیست + کادر جستجو)
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <select name="patient" value={formData.patient} onChange={handleChange} className="form-input">
                                        {patients.map(p => (
                                            <option key={p.id} value={p.id}>{p.first_name} {p.last_name} (بیماران من)</option>
                                        ))}
                                    </select>
                                    
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="جستجوی کدملی بیمار جدید..." className="form-input" style={{ flex: 1 }} />
                                        <button type="button" onClick={handleSearch} disabled={isSearching} className="btn-cancel" style={{ width: 'auto', padding: '0 16px', margin: 0, backgroundColor: '#e5e7eb' }}>
                                            {isSearching ? '...' : 'جستجو'}
                                        </button>
                                    </div>
                                    {searchError && <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>{searchError}</span>}
                                </div>
                            )}
                        </div>

                        <div className="form-row">
                            <div>
                                <label className="form-label">نوع آزمایش:</label>
                                <select name="test_type" value={formData.test_type} onChange={handleChange} className="form-input" dir="ltr">
                                    {testTypes.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} ({t.category_name})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">تاریخ آزمایش:</label>
                                <input type="date" name="test_date" value={formData.test_date} onChange={handleChange} required className="form-input" />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">مقدار نتیجه:</label>
                            <input type="number" step="0.01" name="result_value" value={formData.result_value} onChange={handleChange} required placeholder="مثلاً: 95.5" className="form-input" dir="ltr" />
                        </div>

                        <div className="form-group">
                            <label className="form-label">یادداشت (اختیاری):</label>
                            <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="توضیحات تکمیلی..." className="form-input form-textarea"></textarea>
                        </div>

                        <div className="modal-footer">
                            <button type="submit" disabled={loading} className="btn-submit">
                                {loading ? 'در حال ثبت...' : 'ثبت نتیجه آزمایش'}
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

export default AddTestModal;