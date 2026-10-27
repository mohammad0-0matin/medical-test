import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import API from '../api';
import { formatJalaliDate, getTodayIsoDate } from '../utils/dateUtils';
import './TestForm.css';

/**
 * TestForm — کامپوننت فرم جامع ثبت نتیجه آزمایش با قابلیت اسکن هوشمند هوش مصنوعی
 * و پنل پیش‌نمایش زنده برگه آزمایشگاه (Clinical Slip Preview).
 * 
 * ویژگی‌ها:
 * - دریافت داده‌های پیش‌نویس از سرویس OCR/AI بدون ثبت مستقیم در دیتابیس (جهت بازبینی و ویرایش توسط کاربر)
 * - پیش‌نمایش دینامیک زنده برگه بالینی با وضعیت نرمال/غیرنرمال بر مبنای محدوده مرجع
 * - جستجوی بیمار با کدملی و اتصال پرونده
 * - آپلود فایل پیوست تصویر یا PDF به همراه نتیجه آزمایش
 * - رعایت کامل دستورالعمل طراحی (DESIGN.md)، تقویم جلالی با ارقام لاتین و WCAG AA
 *
 * @param {Object} props
 * @param {Function} [props.onSuccess] فراخوانی پس از ثبت موفق آزمایش
 * @param {Function} [props.onCancel] فراخوانی در صورت انصراف
 * @param {Object} [props.initialData] داده‌های اولیه برای ویرایش یا پیش‌پر کردن
 */
const TestForm = ({ onSuccess, onCancel, initialData = null }) => {
  const navigate = useNavigate();
  const aiFileInputRef = useRef(null);
  const attachmentInputRef = useRef(null);

  // داده‌های لود شده از سرور
  const [patients, setPatients] = useState([]);
  const [testTypes, setTestTypes] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // جستجوی کدملی بیمار
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedPatient, setSearchedPatient] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // وضعیت اسکن هوش مصنوعی
  const [isScanning, setIsScanning] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState('');

  // حالت تست سفارشی (تایپ دستی نام آزمایش)
  const [isCustomType, setIsCustomType] = useState(false);

  // فایل پیوست و پیش‌نمایش تصویر
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

  // وضعیت ارسال فرم
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // استیت فیلدهای فرم
  const [formData, setFormData] = useState({
    patient: initialData?.patient?.id || initialData?.patient || '',
    test_type: initialData?.test_type || '',
    custom_test_name: '',
    custom_unit: '',
    custom_min_normal: '',
    custom_max_normal: '',
    result_value: initialData?.result_value ?? '',
    result_text: initialData?.result_text ?? '',
    test_date: initialData?.test_date || getTodayIsoDate(),
    notes: initialData?.notes || '',
  });

  // دریافت لیست بیماران و انواع آزمایش‌ها در زمان بارگذاری اولیه
  useEffect(() => {
    let isMounted = true;

    const fetchBootstrapData = async () => {
      try {
        const [patientsRes, typesRes] = await Promise.all([
          API.get('patients/'),
          API.get('test-types/'),
        ]);

        if (!isMounted) return;

        const loadedPatients = patientsRes.data || [];
        const loadedTypes = typesRes.data || [];

        setPatients(loadedPatients);
        setTestTypes(loadedTypes);

        // مقداردهی پیش‌فرض در صورت نبود initialData
        setFormData((prev) => ({
          ...prev,
          patient: prev.patient || (loadedPatients.length > 0 ? loadedPatients[0].id : ''),
          test_type: prev.test_type || (loadedTypes.length > 0 ? loadedTypes[0].id : ''),
        }));
      } catch {
        if (isMounted) {
          toast.error('خطا در دریافت اطلاعات بیماران یا فهرست آزمایش‌ها از سرور.');
        }
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    };

    fetchBootstrapData();

    return () => {
      isMounted = false;
    };
  }, []);

  // پاک‌سازی حافظه پیش‌نمایش تصویر در unmount
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  // تغییرات عمومی ورودی‌های فرم
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // مدیریت تغییر نوع آزمایش (انتخاب از لیست یا حالت سفارشی)
  const handleTestTypeChange = (e) => {
    const val = e.target.value;
    if (val === '__custom__') {
      setIsCustomType(true);
      setFormData((prev) => ({ ...prev, test_type: '' }));
    } else {
      setIsCustomType(false);
      setFormData((prev) => ({ ...prev, test_type: val }));
    }
  };

  // جستجوی بیمار با کد ملی
  const handleSearchPatient = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchError('');
    setSearchedPatient(null);

    try {
      const res = await API.get(`patients/search/?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = res.data;
      if (Array.isArray(data) && data.length > 0) {
        const found = data[0];
        setSearchedPatient(found);
        setFormData((prev) => ({ ...prev, patient: found.id }));
        toast.info(`بیمار «${found.first_name} ${found.last_name}» انتخاب شد.`);
      } else {
        setSearchError('بیماری با این کد ملی یافت نشد.');
      }
    } catch {
      setSearchError('بیماری با این کد ملی یافت نشد.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleUnpickSearchedPatient = () => {
    setSearchedPatient(null);
    setSearchQuery('');
    setFormData((prev) => ({
      ...prev,
      patient: patients.length > 0 ? patients[0].id : '',
    }));
  };

  // مدیریت انتخاب فایل پیوست دستی
  const handleAttachmentFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isPdf = file.name.toLowerCase().endsWith('.pdf');

    if (!isImage && !isPdf) {
      toast.error('فقط فایل‌های تصویری (JPEG, PNG, WebP) یا PDF مجاز هستند.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم فایل انتخابی نباید بیش از ۵ مگابایت باشد.');
      return;
    }

    setAttachmentFile(file);

    if (isImage) {
      const preview = URL.createObjectURL(file);
      setImagePreviewUrl(preview);
    } else {
      setImagePreviewUrl(null);
    }
  };

  const handleRemoveAttachment = () => {
    setAttachmentFile(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = '';
    }
  };

  // استخراج هوشمند با هوش مصنوعی (OCR & Extraction به صورت پیش‌نویس جهت بازبینی)
  const handleAiScanFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('لطفاً یک فایل تصویری (JPEG, PNG, WebP) معتبر انتخاب کنید.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم تصویر نباید بیش از ۵ مگابایت باشد.');
      return;
    }

    setIsScanning(true);
    setAiSuccessMessage('');
    const toastId = toast.loading('🤖 هوش مصنوعی در حال خواندن و استخراج داده‌های برگه آزمایش...');

    const payload = new FormData();
    payload.append('file', file);

    try {
      const res = await API.post('test-results/extract-draft/', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const draft = res.data?.draft;
      if (!draft) {
        throw new Error('داده‌ای استخراج نشد.');
      }

      // فایل اسکن‌شده را مستقیماً به عنوان فایل پیوست آزمایش ست می‌کنیم
      setAttachmentFile(file);
      const preview = URL.createObjectURL(file);
      setImagePreviewUrl(preview);

      // تطبیق نام آزمایش استخراج‌شده با کاتالوگ آزمایش‌های موجود در دیتابیس
      let matchedTypeId = '';
      if (draft.test_name && testTypes.length > 0) {
        const normalizedDraft = draft.test_name.toLowerCase().trim();
        const found = testTypes.find(
          (t) =>
            t.name.toLowerCase().trim() === normalizedDraft ||
            normalizedDraft.includes(t.name.toLowerCase().trim()) ||
            t.name.toLowerCase().trim().includes(normalizedDraft)
        );
        if (found) {
          matchedTypeId = found.id;
        }
      }

      setFormData((prev) => {
        const nextState = { ...prev };

        if (matchedTypeId) {
          setIsCustomType(false);
          nextState.test_type = matchedTypeId;
          nextState.custom_test_name = '';
        } else if (draft.test_name) {
          setIsCustomType(true);
          nextState.test_type = '';
          nextState.custom_test_name = draft.test_name;
          nextState.custom_unit = draft.unit || '';
          nextState.custom_min_normal = draft.min_range != null ? String(draft.min_range) : '';
          nextState.custom_max_normal = draft.max_range != null ? String(draft.max_range) : '';
        }

        if (draft.result_value != null && draft.result_value !== '') {
          nextState.result_value = draft.result_value;
        }
        if (draft.result_text) {
          nextState.result_text = draft.result_text;
        }
        if (draft.test_date) {
          nextState.test_date = draft.test_date;
        }

        if (draft.lab_name) {
          nextState.notes = prev.notes
            ? `${prev.notes}\nآزمایشگاه: ${draft.lab_name}`
            : `آزمایشگاه: ${draft.lab_name}`;
        }

        return nextState;
      });

      const successText = `فاکتورهای آزمایش «${draft.test_name || 'استخراج‌شده'}» در فرم قرار گرفت. تصویر نیز ضمیمه شد. لطفاً مقادیر را بازبینی و تأیید فرمایید.`;
      setAiSuccessMessage(successText);

      toast.update(toastId, {
        render: `✅ داده‌ها استخراج شدند! لطفاً فرم را بررسی و تأیید نمایید.`,
        type: 'success',
        isLoading: false,
        autoClose: 4000,
      });
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        'امکان استخراج هوشمند از تصویر فراهم نشد. لطفاً اطلاعات را دستی تکمیل فرمایید.';
      toast.update(toastId, {
        render: errorMsg,
        type: 'warning',
        isLoading: false,
        autoClose: 4000,
      });
    } finally {
      setIsScanning(false);
      if (aiFileInputRef.current) aiFileInputRef.current.value = '';
    }
  };

  // ارسال نهایی فرم و ایجاد آزمایش + آپلود پیوست
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // اعتبارسنجی اولیه کلاینت
    if (!formData.patient) {
      setFormError('لطفاً بیمار را انتخاب کنید.');
      toast.error('لطفاً بیمار را انتخاب کنید.');
      return;
    }

    if (!isCustomType && !formData.test_type) {
      setFormError('لطفاً نوع آزمایش را انتخاب کنید.');
      toast.error('لطفاً نوع آزمایش را انتخاب کنید.');
      return;
    }

    if (isCustomType && !formData.custom_test_name.trim()) {
      setFormError('لطفاً عنوان آزمایش سفارشی را وارد کنید.');
      toast.error('لطفاً عنوان آزمایش سفارشی را وارد کنید.');
      return;
    }

    if (
      (formData.result_value === '' || formData.result_value == null) &&
      !formData.result_text.trim()
    ) {
      setFormError('باید حداقل یکی از مقادیر عددی یا متنی آزمایش را وارد نمایید.');
      toast.error('باید حداقل یکی از مقادیر عددی یا متنی آزمایش را وارد نمایید.');
      return;
    }

    // بررسی تاریخ در آینده نباشد
    if (formData.test_date > getTodayIsoDate()) {
      setFormError('تاریخ آزمایش نمی‌تواند در آینده باشد.');
      toast.error('تاریخ آزمایش نمی‌تواند در آینده باشد.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        patient: parseInt(formData.patient, 10),
        test_date: formData.test_date,
        result_value:
          formData.result_value !== '' && formData.result_value != null
            ? parseFloat(formData.result_value)
            : null,
        result_text: formData.result_text.trim(),
        notes: formData.notes.trim(),
      };

      if (isCustomType) {
        payload.custom_test_name = formData.custom_test_name.trim();
        payload.custom_unit = formData.custom_unit.trim();
        payload.custom_min_normal =
          formData.custom_min_normal !== '' ? parseFloat(formData.custom_min_normal) : null;
        payload.custom_max_normal =
          formData.custom_max_normal !== '' ? parseFloat(formData.custom_max_normal) : null;
      } else {
        payload.test_type = parseInt(formData.test_type, 10);
      }

      // ۱. ذخیره نتیجه آزمایش
      const testResponse = await API.post('test-results/', payload);
      const createdTest = testResponse.data;

      // ۲. در صورت وجود فایل پیوست، آپلود در Attachments
      if (attachmentFile && createdTest?.id) {
        const attachFormData = new FormData();
        attachFormData.append('test_result', createdTest.id);
        attachFormData.append('file_path', attachmentFile);
        attachFormData.append('file_name', attachmentFile.name);
        attachFormData.append('mime_type', attachmentFile.type || 'application/octet-stream');

        await API.post('attachments/', attachFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      if (createdTest?.status === 'pending') {
        toast.info('🧪 نتیجه آزمایش ثبت شد و جهت بررسی و تأیید برای بیمار ارسال گردید.');
      } else {
        toast.success('🧪 نتیجه آزمایش با موفقیت ثبت شد!');
      }

      if (onSuccess) {
        onSuccess(createdTest);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const serverErrors = err.response?.data;
      if (serverErrors) {
        if (typeof serverErrors === 'string') {
          setFormError(serverErrors);
        } else if (serverErrors.detail) {
          setFormError(serverErrors.detail);
        } else {
          const firstKey = Object.keys(serverErrors)[0];
          const firstVal = serverErrors[firstKey];
          setFormError(
            `${firstKey}: ${Array.isArray(firstVal) ? firstVal.join(' ') : String(firstVal)}`
          );
        }
      } else {
        setFormError('خطا در برقراری ارتباط با سرور.');
      }
      toast.error('❌ خطا در ثبت آزمایش. لطفاً مقادیر را بررسی کنید.');
    } finally {
      setSubmitting(false);
    }
  };

  // داده‌های مورد نیاز برای پیش‌نمایش زنده
  const selectedTypeObj = !isCustomType
    ? testTypes.find((t) => String(t.id) === String(formData.test_type))
    : null;

  const previewTestName = isCustomType
    ? formData.custom_test_name || 'آزمایش سفارشی'
    : selectedTypeObj?.name || 'عنوان آزمایش';

  const previewUnit = isCustomType ? formData.custom_unit : selectedTypeObj?.unit || '';

  const minNormal = isCustomType
    ? formData.custom_min_normal !== ''
      ? parseFloat(formData.custom_min_normal)
      : null
    : selectedTypeObj?.min_normal != null
      ? parseFloat(selectedTypeObj.min_normal)
      : null;

  const maxNormal = isCustomType
    ? formData.custom_max_normal !== ''
      ? parseFloat(formData.custom_max_normal)
      : null
    : selectedTypeObj?.max_normal != null
      ? parseFloat(selectedTypeObj.max_normal)
      : null;

  // محاسبه وضعیت نرمال / غیرنرمال
  let statusType = 'neutral';
  let statusText = 'در انتظار ثبت مقدار';
  const numVal =
    formData.result_value !== '' && formData.result_value != null
      ? parseFloat(formData.result_value)
      : null;

  if (numVal != null && !isNaN(numVal)) {
    if (minNormal != null && maxNormal != null) {
      if (numVal < minNormal || numVal > maxNormal) {
        statusType = 'abnormal';
        statusText = '⚠️ خارج از محدوده نرمال';
      } else {
        statusType = 'normal';
        statusText = '✓ طبیعی (نرمال)';
      }
    } else if (minNormal != null) {
      if (numVal < minNormal) {
        statusType = 'abnormal';
        statusText = '⚠️ کمتر از حد مجاز';
      } else {
        statusType = 'normal';
        statusText = '✓ طبیعی (نرمال)';
      }
    } else if (maxNormal != null) {
      if (numVal > maxNormal) {
        statusType = 'abnormal';
        statusText = '⚠️ بیشتر از حد مجاز';
      } else {
        statusType = 'normal';
        statusText = '✓ طبیعی (نرمال)';
      }
    } else {
      statusType = 'neutral';
      statusText = 'ثبت‌شده';
    }
  } else if (formData.result_text.trim()) {
    statusType = 'neutral';
    statusText = 'کیفی / متنی';
  }

  // پیدا کردن نام بیمار برای پیش‌نمایش
  const activePatient =
    searchedPatient || patients.find((p) => String(p.id) === String(formData.patient));
  const previewPatientName = activePatient
    ? `${activePatient.first_name} ${activePatient.last_name}`
    : 'نامشخص';

  // متن محدوده مرجع
  let rangeDisplay = 'تعریف‌نشده';
  if (minNormal != null && maxNormal != null) {
    rangeDisplay = `${minNormal} - ${maxNormal} ${previewUnit}`.trim();
  } else if (minNormal != null) {
    rangeDisplay = `حداقل ${minNormal} ${previewUnit}`.trim();
  } else if (maxNormal != null) {
    rangeDisplay = `حداکثر ${maxNormal} ${previewUnit}`.trim();
  }

  return (
    <div className="tf-container" dir="rtl">
      {/* هدر صفحه و دکمه بازگشت */}
      <header className="tf-header">
        <Link
          to="/dashboard"
          onClick={(e) => {
            if (onCancel) {
              e.preventDefault();
              onCancel();
            }
          }}
          className="tf-back-link"
        >
          <span aria-hidden="true" className="rtl:rotate-180">←</span> بازگشت به داشبورد
        </Link>
        <h1 className="tf-title">
          <span>🧪</span> ثبت نتیجه آزمایش جدید
        </h1>
        <p className="tf-subtitle">
          اطلاعات برگه آزمایش را دستی تکمیل کرده یا تصویر آزمایش را با هوش مصنوعی اسکن کنید. پیش‌نمایش زنده در کنار فرم نمایش داده می‌شود.
        </p>
      </header>

      {/* جعبه اسکن هوشمند با هوش مصنوعی (AI Smart Scan Box) */}
      <section className="tf-ai-box" aria-label="اسکن هوشمند با هوش مصنوعی">
        <div className="tf-ai-header">
          <span>✨</span>
          <span>اسکن هوشمند با هوش مصنوعی (AI OCR)</span>
        </div>
        <p className="tf-ai-desc">
          تصویر برگه آزمایشگاه یا فاکتور بالینی را انتخاب کنید؛ هوش مصنوعی مقادیر، تاریخ و فاکتورها را استخراج کرده و فرم را برای بازبینی شما پر می‌کند.
        </p>

        <input
          type="file"
          ref={aiFileInputRef}
          onChange={handleAiScanFileChange}
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          aria-hidden="true"
        />

        <button
          type="button"
          onClick={() => aiFileInputRef.current?.click()}
          disabled={isScanning}
          className="tf-ai-btn"
          aria-busy={isScanning}
        >
          {isScanning ? (
            <>
              <span className="btn-spinner" aria-hidden="true" />
              <span>در حال آنالیز تصویر توسط هوش مصنوعی...</span>
            </>
          ) : (
            <>
              <span>📷</span>
              <span>انتخاب تصویر برگه آزمایش و اسکن هوشمند</span>
            </>
          )}
        </button>

        {aiSuccessMessage && (
          <div className="tf-ai-success-banner" role="status" aria-live="polite">
            <span>✅</span>
            <span>{aiSuccessMessage}</span>
          </div>
        )}
      </section>

      {/* چیدمان دو ستونه: فرم در راست، پیش‌نمایش زنده بالینی در چپ */}
      <div className="tf-layout">
        {/* ستون اصلی فرم */}
        <main className="tf-card">
          <form onSubmit={handleSubmit} noValidate>
            {formError && (
              <div
                className="tf-field"
                style={{
                  marginBottom: '1rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--error-bg, #fee2e2)',
                  color: 'var(--error-text, #dc2626)',
                  border: '1px solid var(--error-border, #fecaca)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
                role="alert"
              >
                {formError}
              </div>
            )}

            {/* بخش ۱: انتخاب بیمار */}
            <div className="tf-section-title">
              <span>👤</span>
              <span>مشخصات بیمار</span>
            </div>

            <div className="tf-row">
              <div className="tf-field">
                <label htmlFor="tf-patient-select" className="tf-label">
                  انتخاب پرونده بیمار <span className="tf-label-req">*</span>
                </label>

                {searchedPatient ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                      ✅ {searchedPatient.first_name} {searchedPatient.last_name} (کدملی: {searchedPatient.national_code})
                    </span>
                    <button
                      type="button"
                      onClick={handleUnpickSearchedPatient}
                      className="tf-file-btn"
                      style={{ height: '30px', padding: '0 0.6rem', fontSize: '0.78rem' }}
                    >
                      تغییر بیمار
                    </button>
                  </div>
                ) : (
                  <>
                    <select
                      id="tf-patient-select"
                      name="patient"
                      value={formData.patient}
                      onChange={handleChange}
                      disabled={loadingInitial}
                      className="tf-select"
                      required
                    >
                      {loadingInitial && <option value="">در حال بارگذاری بیماران...</option>}
                      {!loadingInitial && patients.length === 0 && (
                        <option value="">پرونده بیماری یافت نشد</option>
                      )}
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.first_name} {p.last_name} {p.national_code ? `(کدملی: ${p.national_code})` : ''}
                        </option>
                      ))}
                    </select>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="یا جستجوی بیمار با کدملی..."
                        className="tf-input"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={handleSearchPatient}
                        disabled={isSearching || !searchQuery.trim()}
                        className="tf-file-btn"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {isSearching ? '...' : 'جستجو'}
                      </button>
                    </div>
                    {searchError && (
                      <span style={{ fontSize: '0.78rem', color: '#dc2626', marginTop: '0.2rem' }}>
                        {searchError}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* بخش ۲: نوع آزمایش و تاریخ */}
            <div className="tf-section-title">
              <span>🔬</span>
              <span>نوع آزمایش و تاریخ</span>
            </div>

            <div className="tf-row tf-row-2">
              <div className="tf-field">
                <label htmlFor="tf-test-type" className="tf-label">
                  نوع آزمایش <span className="tf-label-req">*</span>
                </label>
                <select
                  id="tf-test-type"
                  value={isCustomType ? '__custom__' : formData.test_type}
                  onChange={handleTestTypeChange}
                  disabled={loadingInitial}
                  className="tf-select"
                >
                  {loadingInitial && <option value="">در حال بارگذاری فهرست آزمایش‌ها...</option>}
                  {testTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.category_name ? `(${t.category_name})` : ''}
                    </option>
                  ))}
                  <option value="__custom__">➕ ثبت نوع آزمایش جدید / سفارشی</option>
                </select>
              </div>

              <div className="tf-field">
                <label htmlFor="tf-test-date" className="tf-label">
                  تاریخ انجام آزمایش <span className="tf-label-req">*</span>
                </label>
                <input
                  type="date"
                  id="tf-test-date"
                  name="test_date"
                  value={formData.test_date}
                  onChange={handleChange}
                  max={getTodayIsoDate()}
                  className="tf-input"
                  dir="ltr"
                  required
                />
                <span className="tf-hint">
                  نمایش جلالی: {formatJalaliDate(formData.test_date)}
                </span>
              </div>
            </div>

            {/* فیلدهای اختصاصی آزمایش سفارشی */}
            {isCustomType && (
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px dashed var(--border)',
                  marginBottom: '1rem',
                }}
              >
                <div className="tf-row tf-row-2">
                  <div className="tf-field">
                    <label htmlFor="tf-custom-name" className="tf-label">
                      نام کامل آزمایش سفارشی <span className="tf-label-req">*</span>
                    </label>
                    <input
                      type="text"
                      id="tf-custom-name"
                      name="custom_test_name"
                      value={formData.custom_test_name}
                      onChange={handleChange}
                      placeholder="مثلاً: Vitamin D3 (25-OH)"
                      className="tf-input"
                      dir="ltr"
                      required
                    />
                  </div>

                  <div className="tf-field">
                    <label htmlFor="tf-custom-unit" className="tf-label">
                      واحد اندازه‌گیری
                    </label>
                    <input
                      type="text"
                      id="tf-custom-unit"
                      name="custom_unit"
                      value={formData.custom_unit}
                      onChange={handleChange}
                      placeholder="مثلاً: ng/mL یا mg/dL"
                      className="tf-input"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="tf-row tf-row-2">
                  <div className="tf-field">
                    <label htmlFor="tf-custom-min" className="tf-label">
                      حداقل نرمال (Min)
                    </label>
                    <input
                      type="number"
                      step="any"
                      id="tf-custom-min"
                      name="custom_min_normal"
                      value={formData.custom_min_normal}
                      onChange={handleChange}
                      placeholder="مثلاً: 30"
                      className="tf-input"
                      dir="ltr"
                    />
                  </div>

                  <div className="tf-field">
                    <label htmlFor="tf-custom-max" className="tf-label">
                      حداکثر نرمال (Max)
                    </label>
                    <input
                      type="number"
                      step="any"
                      id="tf-custom-max"
                      name="custom_max_normal"
                      value={formData.custom_max_normal}
                      onChange={handleChange}
                      placeholder="مثلاً: 100"
                      className="tf-input"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* بخش ۳: مقادیر نتیجه آزمایش */}
            <div className="tf-section-title">
              <span>📊</span>
              <span>مقادیر و نتیجه بالینی</span>
            </div>

            <div className="tf-row tf-row-2">
              <div className="tf-field">
                <label htmlFor="tf-result-value" className="tf-label">
                  مقدار عددی نتیجه {previewUnit && `(${previewUnit})`}
                </label>
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  id="tf-result-value"
                  name="result_value"
                  value={formData.result_value}
                  onChange={handleChange}
                  placeholder="مثلاً: 95.5"
                  className="tf-input"
                  dir="ltr"
                />
                <span className="tf-hint">جهت نمودار و تحلیل محدوده نرمال</span>
              </div>

              <div className="tf-field">
                <label htmlFor="tf-result-text" className="tf-label">
                  نتیجه کیفی یا متنی (اختیاری)
                </label>
                <input
                  type="text"
                  id="tf-result-text"
                  name="result_text"
                  value={formData.result_text}
                  onChange={handleChange}
                  placeholder="مثلاً: منفی (Negative)، نرمال، مشاهده نشد"
                  className="tf-input"
                />
                <span className="tf-hint">برای آزمایش‌های کیفی یا توضیحات نتیجه</span>
              </div>
            </div>

            {/* بخش ۴: پیوست فایل و توضیحات */}
            <div className="tf-section-title">
              <span>📎</span>
              <span>فایل ضمیمه و توضیحات تکمیلی</span>
            </div>

            <div className="tf-row">
              <div className="tf-field">
                <label className="tf-label">پیوست برگه آزمایش (تصویر یا PDF)</label>
                <input
                  type="file"
                  ref={attachmentInputRef}
                  onChange={handleAttachmentFileChange}
                  accept="image/*,application/pdf"
                  style={{ display: 'none' }}
                  aria-hidden="true"
                />
                <div className="tf-file-picker-wrap">
                  <button
                    type="button"
                    onClick={() => attachmentInputRef.current?.click()}
                    className="tf-file-btn"
                  >
                    <span>📁</span>
                    <span>انتخاب فایل پیوست</span>
                  </button>
                  <span className="tf-file-name">
                    {attachmentFile ? attachmentFile.name : 'هیچ فایلی انتخاب نشده است.'}
                  </span>
                  {attachmentFile && (
                    <button
                      type="button"
                      onClick={handleRemoveAttachment}
                      className="tf-file-btn"
                      style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                      title="حذف فایل پیوست"
                    >
                      ✕ حذف
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="tf-row">
              <div className="tf-field">
                <label htmlFor="tf-notes" className="tf-label">
                  یادداشت یا نام آزمایشگاه (اختیاری)
                </label>
                <textarea
                  id="tf-notes"
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="توضیحات پزشک، نام آزمایشگاه، ناشتا بودن و..."
                  className="tf-textarea"
                />
              </div>
            </div>

            {/* دکمه‌های عملیات فرم */}
            <div className="tf-actions">
              <button
                type="submit"
                disabled={submitting || loadingInitial}
                className="tf-btn-submit"
                aria-busy={submitting}
              >
                {submitting ? (
                  <>
                    <span className="btn-spinner" aria-hidden="true" />
                    <span>در حال ثبت آزمایش...</span>
                  </>
                ) : (
                  <>
                    <span>🧪</span>
                    <span>ثبت و ذخیره آزمایش</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onCancel) {
                    onCancel();
                  } else {
                    navigate('/dashboard');
                  }
                }}
                disabled={submitting}
                className="tf-btn-cancel"
              >
                انصراف
              </button>
            </div>
          </form>
        </main>

        {/* ستون کناری: پیش‌نمایش زنده برگه آزمایش (Live Clinical Slip Preview) */}
        <aside className="tf-preview-card" aria-label="پیش‌نمایش زنده برگه آزمایش">
          <div className="tf-preview-head">
            <div className="tf-preview-brand">
              <span>🩺</span>
              <span>پیش‌نمایش برگه آزمایش</span>
            </div>
            <span className="tf-preview-tag">زنده</span>
          </div>

          <div className="tf-preview-patient-row">
            <span>بیمار:</span>
            <strong>{previewPatientName}</strong>
          </div>

          <div className="tf-preview-result-hero">
            <div className="tf-preview-test-name">{previewTestName}</div>
            <div className="tf-preview-val-large">
              {formData.result_value !== '' && formData.result_value != null ? (
                <>
                  <span>{formData.result_value}</span>
                  {previewUnit && <span className="tf-preview-unit">{previewUnit}</span>}
                </>
              ) : formData.result_text ? (
                <span style={{ fontSize: '1.25rem' }}>{formData.result_text}</span>
              ) : (
                '—'
              )}
            </div>

            <div
              className={`tf-preview-status-pill ${
                statusType === 'normal'
                  ? 'tf-status-normal'
                  : statusType === 'abnormal'
                    ? 'tf-status-abnormal'
                    : 'tf-status-neutral'
              }`}
            >
              <span>{statusText}</span>
            </div>
          </div>

          <div className="tf-preview-range-box">
            <span>محدوده مرجع نرمال:</span>
            <span className="tf-preview-range-val" dir="ltr">
              {rangeDisplay}
            </span>
          </div>

          <div className="tf-preview-range-box" style={{ marginBottom: 0 }}>
            <span>تاریخ ثبت:</span>
            <span dir="ltr">{formatJalaliDate(formData.test_date)}</span>
          </div>

          {imagePreviewUrl && (
            <div className="tf-preview-thumb-box">
              <img
                src={imagePreviewUrl}
                alt="پیش‌نمایش برگه پیوست"
                className="tf-preview-thumb"
              />
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-strong)' }}>تصویر پیوست شد</div>
                <div style={{ fontSize: '0.72rem' }}>آماده ذخیره‌سازی در پرونده</div>
              </div>
            </div>
          )}

          {attachmentFile && !imagePreviewUrl && (
            <div className="tf-preview-thumb-box">
              <span style={{ fontSize: '1.5rem' }}>📄</span>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-strong)' }}>فایل PDF پیوست شد</div>
                <div style={{ fontSize: '0.72rem' }}>{attachmentFile.name}</div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default TestForm;
