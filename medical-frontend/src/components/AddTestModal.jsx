import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import './AddTestModal.css';

/** Patient picker icon. */
const UserGlyph = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="8" r="3.6" />
        <path d="M5 20v-.8A5.2 5.2 0 0 1 10.2 14h3.6a5.2 5.2 0 0 1 5.2 5.2V20" />
    </svg>
);

/** Test-type picker icon. */
const FlaskGlyph = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 3h4" />
        <path d="M10 3v6l-4.7 8.2A2.4 2.4 0 0 0 7.3 21h9.4a2.4 2.4 0 0 0 2-3.8L14 9V3" />
        <path d="M8.5 15h7" />
    </svg>
);

/** Date field icon. */
const CalendarGlyph = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="4" y="5.5" width="16" height="15" rx="2.5" />
        <path d="M8 3v4M16 3v4M4 10.5h16" />
    </svg>
);

/** Numeric-result field icon. */
const NumberGlyph = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9.5 4L7.7 20M16.3 4L14.5 20M4.5 9h15M3.7 15h15" />
    </svg>
);

/** Round close-button glyph for the modal header. */
const CloseGlyph = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
        strokeLinecap="round" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" />
    </svg>
);

/**
 * New test-result entry form with dynamic patients/test-types loading,
 * national-code search and toast-based validation feedback.
 * On open it fetches both dropdown datasets and preselects the first entry;
 * an empty dataset simply leaves the pickers blank.
 *
 * @param {{isOpen: boolean, onClose: Function,
 *          onTestAdded?: Function}} props - Modal props.
 * @param {boolean} props.isOpen - Whether the modal is visible.
 * @param {Function} props.onClose - Requests closing the modal.
 * @param {Function} [props.onTestAdded] - Notifies the dashboard to refetch results.
 * @returns {JSX.Element|null} Entry form modal, or null when closed.
 */
const AddTestModal = ({ isOpen, onClose, onTestAdded }) => {
    const [testTypes, setTestTypes] = useState([]);
    const [patients, setPatients] = useState([]);

    // National-code search state
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
        useEffect(() => {
        if (!isOpen) return;
        /** Fetches both dropdown datasets and defaults the selects to their first option. */
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
            } catch {
                /* Bootstrap failures are ignored: patient / test-type
                   pickers simply stay empty until the next open. */
            }
        };
        fetchData();
    }, [isOpen]);

    /** Searches patients by national-code fragment and locks onto the first match. */
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
                    setFormData({ ...formData, patient: found.id });
                } else {
                    setSearchError('بیماری با این کدملی یافت نشد.');
                }
            } else {
                setSearchError('بیماری با این کدملی یافت نشد.');
            }
        } catch {
            setSearchError('خطای ارتباط با سرور.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    /**
     * Posts the form payload to `test-results/`, clears value/notes fields on
     * success, then closes the modal and resets any national-code search state.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const token = localStorage.getItem('access_token');
        try {
            const response = await fetch('http://127.0.0.1:8000/api/test-results/', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                toast.success('🧪 نتیجه آزمایش با موفقیت ثبت شد!');
                setFormData({ ...formData, result_value: '', notes: '' });

                if (onTestAdded) onTestAdded();

                // Close immediately and reset search state.
                onClose();
                setSearchedPatient(null);
                setSearchQuery('');
            } else {
                toast.error('❌ خطا در ثبت آزمایش. اطلاعات را بررسی کنید.');
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
                    <h2>ثبت نتیجه آزمایش جدید</h2>
                    <button onClick={onClose} className="close-btn" aria-label="بستن پنجره" title="بستن">
                        <CloseGlyph />
                    </button>
                </div>

                <div className="modal-body">
                                        <form onSubmit={handleSubmit}>
                        <div className="patient-picker form-group">
                            <label className="form-label">بیمار (انتخاب از لیست یا جستجو):</label>

                            {searchedPatient ? (
                                <div className="searched-box">
                                    <span className="searched-name">
                                        ✅ {searchedPatient.first_name} {searchedPatient.last_name}
                                    </span>
                                    <button type="button" onClick={() => { setSearchedPatient(null); setFormData({...formData, patient: patients[0]?.id || ''}); setSearchQuery(''); }} className="unpick-btn">
                                        لغو انتخاب
                                    </button>
                                </div>
                            ) : (
                                <div className="picker-col">
                                    <div className="input-shell">
                                        <span className="input-icon"><UserGlyph /></span>
                                        <select name="patient" value={formData.patient} onChange={handleChange} className="form-input">
                                            {patients.map(p => (
                                                <option key={p.id} value={p.id}>{p.first_name} {p.last_name} (بیماران من)</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="picker-row">
                                        <div className="input-shell grow">
                                            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="جستجوی کدملی بیمار جدید..." className="form-input" />
                                        </div>
                                        <button type="button" onClick={handleSearch} disabled={isSearching} className="search-btn">
                                            {isSearching ? '...' : 'جستجو'}
                                        </button>
                                    </div>
                                    {searchError && <span className="search-error">{searchError}</span>}
                                </div>
                            )}
                        </div>

                        <div className="form-row">
                            <div>
                                <label className="form-label">نوع آزمایش:</label>
                                <div className="input-shell">
                                    <span className="input-icon"><FlaskGlyph /></span>
                                    <select name="test_type" value={formData.test_type} onChange={handleChange} className="form-input" dir="ltr">
                                        {testTypes.map(t => (
                                            <option key={t.id} value={t.id}>{t.name} ({t.category_name})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="form-label">تاریخ آزمایش:</label>
                                <div className="input-shell">
                                    <span className="input-icon"><CalendarGlyph /></span>
                                    <input type="date" name="test_date" value={formData.test_date} onChange={handleChange} required className="form-input" />
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">مقدار نتیجه:</label>
                            <div className="input-shell">
                                <span className="input-icon"><NumberGlyph /></span>
                                <input type="number" step="0.01" name="result_value" value={formData.result_value} onChange={handleChange} required placeholder="مثلاً: 95.5" className="form-input" dir="ltr" />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">یادداشت (اختیاری):</label>
                            <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="توضیحات تکمیلی..." className="form-input form-textarea"></textarea>
                        </div>

                        <div className="modal-footer">
                            <button type="submit" disabled={loading} className="btn-submit">
                                {loading ? (<><span className="btn-spinner" />در حال ثبت...</>) : 'ثبت نتیجه آزمایش'}
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
