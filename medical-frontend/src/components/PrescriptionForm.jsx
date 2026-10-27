import { useState, useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import API from '../api';
import {
  createPrescription,
  updatePrescription,
  extractDraftFromPrescription,
  fetchApprovedDoctors,
} from '../api/prescriptionApi';
import { formatJalaliDate, getTodayIsoDate } from '../utils/dateUtils';
import './Prescriptions.css';

/**
 * Recursively formats DRF errors into readable Persian messages,
 * avoiding raw [object Object] strings for nested item errors.
 */
const formatApiErrors = (errData) => {
  if (!errData) return 'خطا در ارتباط با سرور.';
  if (typeof errData === 'string') return errData;
  if (Array.isArray(errData)) {
    return errData.map(formatApiErrors).filter(Boolean).join(' | ');
  }
  if (typeof errData === 'object') {
    const fieldLabels = {
      patient: 'پرونده بیمار',
      doctor: 'پزشک',
      registered_doctor: 'پزشک سامانه',
      external_doctor_name: 'نام پزشک',
      items: 'اقلام نسخه',
      prescribed_date: 'تاریخ تجویز',
      scan_file: 'فایل اسکن',
      drug_name: 'نام دارو',
      frequency: 'دستور مصرف',
      detail: 'خطا',
      non_field_errors: 'خطا',
    };
    return Object.entries(errData)
      .map(([key, value]) => {
        const label = fieldLabels[key] || key;
        const msg = formatApiErrors(value);
        return `${label}: ${msg}`;
      })
      .join(' | ');
  }
  return String(errData);
};

/**
 * Returns an appropriate icon for common medication forms.
 */
const getMedFormIcon = (form) => {
  if (!form) return '💊';
  const f = form.toLowerCase();
  if (f.includes('شربت') || f.includes('محلول') || f.includes('قطره')) return '🧪';
  if (f.includes('آمپول') || f.includes('ویال') || f.includes('تزریق')) return '💉';
  if (f.includes('پماد') || f.includes('کرم') || f.includes('ژل')) return '🧴';
  return '💊';
};

/**
 * Doctor's Prescription Form Component
 *
 * Implements react-hook-form with useFieldArray for dynamic medication items.
 * Supports:
 * - Dynamic items list (add, edit, remove with minimum 1 item requirement)
 * - Doctor type toggle: system doctor vs external doctor details
 * - Jalali date display preview with Latin digits (0-9)
 * - AI scan/paper draft extraction flow (unsaved draft -> user review -> create)
 * - File upload validation (type and <= 5MB size limit)
 * - Live Digital Prescription Slip Preview on desktop
 */
const PrescriptionForm = ({ initialData = null, isEdit = false, onSuccess = null }) => {
  const navigate = useNavigate();
  const [doctorType, setDoctorType] = useState(
    initialData?.registered_doctor ? 'system' : 'external'
  );
  const [patients, setPatients] = useState([]);
  const [systemDoctors, setSystemDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiExtracting, setAiExtracting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [selectedScanFile, setSelectedScanFile] = useState(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      patient: initialData?.patient?.id || initialData?.patient || '',
      prescribed_date: initialData?.prescribed_date || getTodayIsoDate(),
      registered_doctor: initialData?.registered_doctor || '',
      external_doctor_name: initialData?.external_doctor_name || '',
      external_doctor_specialty: initialData?.external_doctor_specialty || '',
      external_doctor_clinic: initialData?.external_doctor_clinic || '',
      external_doctor_license_number: initialData?.external_doctor_license_number || '',
      diagnosis: initialData?.diagnosis || '',
      notes: initialData?.notes || '',
      items: initialData?.items?.length
        ? initialData.items
        : [
            {
              drug_name: '',
              strength_dose: '',
              form: '',
              frequency: '',
              duration: '',
              quantity: '',
              instructions: '',
            },
          ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  // Watch fields for live preview card
  const watchedPatientId = useWatch({ control, name: 'patient' });
  const watchedDate = useWatch({ control, name: 'prescribed_date' });
  const watchedDoctorName = useWatch({ control, name: 'external_doctor_name' });
  const watchedSpecialty = useWatch({ control, name: 'external_doctor_specialty' });
  const watchedClinic = useWatch({ control, name: 'external_doctor_clinic' });
  const watchedDiagnosis = useWatch({ control, name: 'diagnosis' });
  const watchedItems = useWatch({ control, name: 'items' });
  const watchedSystemDocId = useWatch({ control, name: 'registered_doctor' });

  // Load patients and approved system doctors for select dropdowns
  useEffect(() => {
    let isMounted = true;
    const loadBootstrapData = async () => {
      setLoadingDoctors(true);
      try {
        const [docs, patientsRes] = await Promise.all([
          fetchApprovedDoctors(),
          API.get('patients/').catch(() => ({ data: [] })),
        ]);
        if (!isMounted) return;
        setSystemDoctors(docs || []);
        const loadedPatients = patientsRes?.data || [];
        setPatients(loadedPatients);
        if (!initialData?.patient && loadedPatients.length > 0) {
          setValue('patient', loadedPatients[0].id);
        }
      } catch {
        if (isMounted) {
          setSystemDoctors([]);
          setPatients([]);
        }
      } finally {
        if (isMounted) setLoadingDoctors(false);
      }
    };
    loadBootstrapData();
    return () => {
      isMounted = false;
    };
  }, [initialData, setValue]);

  // Handle AI Draft extraction from an uploaded scan image or PDF
  const handleAiExtract = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم فایل اسکن نباید بیشتر از ۵ مگابایت باشد.');
      e.target.value = '';
      return;
    }

    // Validate mime type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('فرمت فایل مجاز نیست. لطفاً یک تصویر (JPEG, PNG, WebP) یا فایل PDF انتخاب کنید.');
      e.target.value = '';
      return;
    }

    setSelectedScanFile(file);
    setAiExtracting(true);
    setServerError(null);

    try {
      const response = await extractDraftFromPrescription(file);
      const draft = response.draft;

      if (draft) {
        // Populate draft into form without auto-saving
        setDoctorType('external');
        if (draft.external_doctor_name) {
          setValue('external_doctor_name', draft.external_doctor_name);
        }
        if (draft.external_doctor_specialty) {
          setValue('external_doctor_specialty', draft.external_doctor_specialty);
        }
        if (draft.external_doctor_clinic) {
          setValue('external_doctor_clinic', draft.external_doctor_clinic);
        }
        if (draft.external_doctor_license_number) {
          setValue('external_doctor_license_number', draft.external_doctor_license_number);
        }
        if (draft.prescribed_date) {
          setValue('prescribed_date', draft.prescribed_date);
        }
        if (draft.diagnosis) {
          setValue('diagnosis', draft.diagnosis);
        }
        if (draft.notes) {
          setValue('notes', draft.notes);
        }

        if (draft.items && draft.items.length > 0) {
          setValue('items', draft.items);
        }

        toast.info(
          'پیش‌نویس نسخه با موفقیت استخراج شد. لطفاً اطلاعات را بازبینی و در صورت نیاز تکمیل فرمایید.'
        );
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'خطا در استخراج اطلاعات از فایل نسخه.';
      toast.error(msg);
    } finally {
      setAiExtracting(false);
      e.target.value = '';
    }
  };

  // Form submission handler
  const onSubmit = async (formData) => {
    setServerError(null);

    // Validate items constraint
    if (!formData.items || formData.items.length === 0) {
      setServerError('ثبت حداقل یک قلم دارویی برای نسخه الزامی است.');
      return;
    }

    // Prepare payload ensuring exactly one doctor is set
    const payload = {
      prescribed_date: formData.prescribed_date,
      diagnosis: formData.diagnosis,
      notes: formData.notes,
      items: formData.items.map((item, idx) => ({
        ...item,
        order: idx,
      })),
    };

    if (formData.patient) {
      payload.patient = parseInt(formData.patient, 10);
    }

    if (doctorType === 'system') {
      if (!formData.registered_doctor) {
        setServerError('لطفاً یک پزشک عضو سامانه را انتخاب کنید.');
        return;
      }
      payload.registered_doctor = parseInt(formData.registered_doctor, 10);
      payload.external_doctor_name = '';
      payload.external_doctor_specialty = '';
      payload.external_doctor_clinic = '';
      payload.external_doctor_license_number = '';
    } else {
      if (!formData.external_doctor_name || !formData.external_doctor_name.trim()) {
        setServerError('نام پزشک صادرکننده الزامی است.');
        return;
      }
      payload.registered_doctor = null;
      payload.external_doctor_name = formData.external_doctor_name.trim();
      payload.external_doctor_specialty = formData.external_doctor_specialty?.trim() || '';
      payload.external_doctor_clinic = formData.external_doctor_clinic?.trim() || '';
      payload.external_doctor_license_number = formData.external_doctor_license_number?.trim() || '';
    }

    // Attach scan file if selected
    if (selectedScanFile) {
      payload.scan_file = selectedScanFile;
    }

    setSubmitting(true);
    try {
      if (isEdit && initialData?.uuid) {
        await updatePrescription(initialData.uuid, payload);
        toast.success('نسخه با موفقیت به‌روزرسانی شد.');
      } else {
        await createPrescription(payload);
        toast.success('نسخه با موفقیت در پرونده ثبت شد.');
      }

      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/prescriptions');
      }
    } catch (err) {
      const errData = err.response?.data;
      setServerError(formatApiErrors(errData));
    } finally {
      setSubmitting(false);
    }
  };

  // Compute patient & doctor name for live preview
  const activePatient = patients.find((p) => String(p.id) === String(watchedPatientId));
  const livePatientName =
    initialData?.patient_name ||
    (activePatient ? `${activePatient.first_name} ${activePatient.last_name}` : 'پرونده من');

  const liveDoctorName =
    doctorType === 'system'
      ? systemDoctors.find((d) => String(d.user_id || d.id) === String(watchedSystemDocId))?.grantee_name || 'پزشک سامانه'
      : watchedDoctorName || 'نام پزشک...';

  return (
    <div className="rx-card" dir="rtl">
      <div className="rx-header">
        <div>
          <h2 className="rx-title">
            <span role="img" aria-hidden="true">💊</span>
            {isEdit ? 'ویرایش نسخه پزشک' : 'ثبت نسخه جدید'}
          </h2>
          <p className="rx-subtitle">
            ثبت اطلاعات داروها و دستورات پزشک برای پرونده سلامت شما
          </p>
        </div>
      </div>

      {/* AI Extraction Banner (only in create mode) */}
      {!isEdit && (
        <div className="rx-ai-box">
          <div className="rx-ai-title">
            <span role="img" aria-hidden="true">✨</span>
            استخراج هوشمند از تصویر یا فایل نسخه (اختیاری)
          </div>
          <p className="rx-ai-desc">
            تصویر یا PDF نسخه کاغذی خود را بارگذاری کنید تا اقلام نسخه به صورت پیش‌نویس استخراج شوند.
          </p>
          <label className="rx-btn rx-btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex' }}>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              style={{ display: 'none' }}
              onChange={handleAiExtract}
              disabled={aiExtracting}
            />
            {aiExtracting ? 'در حال استخراج هوشمند...' : 'بارگذاری فایل اسکن / نسخه'}
          </label>
          {selectedScanFile && (
            <p className="rx-helper-text" style={{ marginTop: '0.5rem' }}>
              فایل انتخاب‌شده: {selectedScanFile.name} ({(selectedScanFile.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>
      )}

      {serverError && (
        <div
          role="alert"
          style={{
            backgroundColor: 'var(--error-bg)',
            color: 'var(--error-text)',
            border: '1px solid var(--error-border)',
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            marginBottom: '1.25rem',
            fontSize: '0.875rem',
          }}
        >
          {serverError}
        </div>
      )}

      {/* Two-Column Responsive Layout */}
      <div className="rx-form-layout">
        {/* Right Column: Form Inputs */}
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Patient Profile Selection */}
          {patients.length > 0 && !isEdit && (
            <div className="rx-form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="rx-label" htmlFor="patient">
                پرونده بیمار
                <span className="required-star">*</span>
              </label>
              <select
                id="patient"
                className="rx-select"
                {...register('patient')}
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name} {p.national_code ? `(کدملی: ${p.national_code})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isEdit && (
            <div
              style={{
                marginBottom: '1.25rem',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>👤 <strong>پرونده بیمار:</strong></span>
              <span>{livePatientName}</span>
            </div>
          )}

          {/* Date and Basic Info */}
          <div className="rx-form-grid rx-form-grid-2" style={{ marginBottom: '1.25rem' }}>
            <div className="rx-form-group">
              <label className="rx-label" htmlFor="prescribed_date">
                تاریخ تجویز نسخه
                <span className="required-star">*</span>
              </label>
              <input
                id="prescribed_date"
                type="date"
                className="rx-input"
                aria-invalid={errors.prescribed_date ? 'true' : 'false'}
                {...register('prescribed_date', { required: 'انتخاب تاریخ تجویز الزامی است' })}
              />
              {errors.prescribed_date && (
                <span className="rx-error-text">{errors.prescribed_date.message}</span>
              )}
              {watchedDate && (
                <div className="rx-date-badge">
                  <span role="img" aria-hidden="true">📅</span>
                  تاریخ معادل شمسی: {formatJalaliDate(watchedDate)}
                </div>
              )}
            </div>

            <div className="rx-form-group">
              <label className="rx-label" htmlFor="diagnosis">
                تشخیص / علت مراجعه (اختیاری)
              </label>
              <input
                id="diagnosis"
                type="text"
                className="rx-input"
                placeholder="مثال: سرماخوردگی فصلی، فشار خون بالا..."
                {...register('diagnosis')}
              />
            </div>
          </div>

          {/* Doctor Information & Toggle */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label className="rx-label" style={{ marginBottom: '0.5rem' }}>
              پزشک صادرکننده نسخه
              <span className="required-star">*</span>
            </label>
            <div className="rx-segmented-control" role="radiogroup">
              <button
                type="button"
                className={`rx-segment-btn ${doctorType === 'external' ? 'active' : ''}`}
                onClick={() => setDoctorType('external')}
              >
                پزشک خارج از سامانه (مطب / بیمارستان)
              </button>
              <button
                type="button"
                className={`rx-segment-btn ${doctorType === 'system' ? 'active' : ''}`}
                onClick={() => setDoctorType('system')}
              >
                پزشک عضو سامانه
              </button>
            </div>

            {doctorType === 'system' ? (
              <div className="rx-form-group">
                <label className="rx-label" htmlFor="registered_doctor">
                  انتخاب پزشک عضو سامانه
                  <span className="required-star">*</span>
                </label>
                <select
                  id="registered_doctor"
                  className="rx-select"
                  disabled={loadingDoctors}
                  {...register('registered_doctor', {
                    required: doctorType === 'system' ? 'انتخاب پزشک عضو سامانه الزامی است' : false,
                  })}
                >
                  <option value="">-- لطفاً پزشک را انتخاب فرمایید --</option>
                  {systemDoctors.map((doc) => (
                    <option key={doc.id || doc.user_id} value={doc.user_id || doc.id}>
                      {doc.grantee_name || `کاربر شناسه ${doc.user_id}`}
                    </option>
                  ))}
                </select>
                {systemDoctors.length === 0 && !loadingDoctors && (
                  <span className="rx-helper-text">
                    پزشک متصل به پرونده شما یافت نشد. می‌توانید از تب «پزشک خارج از سامانه» استفاده فرمایید.
                  </span>
                )}
              </div>
            ) : (
              <div className="rx-form-grid rx-form-grid-2">
                <div className="rx-form-group">
                  <label className="rx-label" htmlFor="external_doctor_name">
                    نام و نام خانوادگی پزشک
                    <span className="required-star">*</span>
                  </label>
                  <input
                    id="external_doctor_name"
                    type="text"
                    className="rx-input"
                    placeholder="مثال: دکتر علیرضا محمدی"
                    {...register('external_doctor_name', {
                      required: doctorType === 'external' ? 'نام پزشک صادرکننده الزامی است' : false,
                    })}
                  />
                  {errors.external_doctor_name && (
                    <span className="rx-error-text">{errors.external_doctor_name.message}</span>
                  )}
                </div>

                <div className="rx-form-group">
                  <label className="rx-label" htmlFor="external_doctor_specialty">
                    تخصص پزشک (اختیاری)
                  </label>
                  <input
                    id="external_doctor_specialty"
                    type="text"
                    className="rx-input"
                    placeholder="مثال: متخصص داخلی"
                    {...register('external_doctor_specialty')}
                  />
                </div>

                <div className="rx-form-group">
                  <label className="rx-label" htmlFor="external_doctor_clinic">
                    مطب / مرکز درمانی (اختیاری)
                  </label>
                  <input
                    id="external_doctor_clinic"
                    type="text"
                    className="rx-input"
                    placeholder="مثال: بیمارستان شریعتی"
                    {...register('external_doctor_clinic')}
                  />
                </div>

                <div className="rx-form-group">
                  <label className="rx-label" htmlFor="external_doctor_license_number">
                    شماره نظام پزشکی (اختیاری)
                  </label>
                  <input
                    id="external_doctor_license_number"
                    type="text"
                    dir="ltr"
                    className="rx-input"
                    placeholder="مثال: 98765"
                    {...register('external_doctor_license_number')}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Medication Items (useFieldArray) */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div className="rx-items-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                  اقلام دارویی نسخه ({fields.length} قلم)
                  <span className="required-star">*</span>
                </h3>
                <p className="rx-helper-text" style={{ margin: '0.2rem 0 0' }}>
                  حداقل یک قلم دارو برای نسخه الزامی است.
                </p>
              </div>
              <button
                type="button"
                className="rx-btn rx-btn-secondary"
                onClick={() =>
                  append({
                    drug_name: '',
                    strength_dose: '',
                    form: '',
                    frequency: '',
                    duration: '',
                    quantity: '',
                    instructions: '',
                  })
                }
              >
                + افزودن قلم دارویی
              </button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="rx-item-card">
                <div className="rx-item-top">
                  <span className="rx-item-badge">داروی شماره {index + 1}</span>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      className="rx-btn rx-btn-destructive"
                      style={{ minHeight: '32px', padding: '0.25rem 0.65rem', fontSize: '0.84rem', fontWeight: 600 }}
                      onClick={() => remove(index)}
                      aria-label={`حذف داروی شماره ${index + 1}`}
                    >
                      حذف قلم
                    </button>
                  )}
                </div>

                <div className="rx-form-grid rx-form-grid-3">
                  <div className="rx-form-group">
                    <label className="rx-label" htmlFor={`items.${index}.drug_name`}>
                      نام دارو
                      <span className="required-star">*</span>
                    </label>
                    <input
                      id={`items.${index}.drug_name`}
                      type="text"
                      className="rx-input"
                      placeholder="مثال: Amoxicillin"
                      {...register(`items.${index}.drug_name`, {
                        required: 'نام دارو الزامی است',
                      })}
                    />
                    {errors.items?.[index]?.drug_name && (
                      <span className="rx-error-text">
                        {errors.items[index].drug_name.message}
                      </span>
                    )}
                  </div>

                  <div className="rx-form-group">
                    <label className="rx-label" htmlFor={`items.${index}.strength_dose`}>
                      دوز / قدرت دارو
                    </label>
                    <input
                      id={`items.${index}.strength_dose`}
                      type="text"
                      dir="ltr"
                      className="rx-input"
                      placeholder="مثال: 500mg"
                      {...register(`items.${index}.strength_dose`)}
                    />
                  </div>

                  <div className="rx-form-group">
                    <label className="rx-label" htmlFor={`items.${index}.form`}>
                      شکل دارویی
                    </label>
                    <input
                      id={`items.${index}.form`}
                      type="text"
                      className="rx-input"
                      placeholder="قرص، کپسول، شربت، آمپول..."
                      {...register(`items.${index}.form`)}
                    />
                  </div>

                  <div className="rx-form-group">
                    <label className="rx-label" htmlFor={`items.${index}.frequency`}>
                      نحوه مصرف / تناوب
                      <span className="required-star">*</span>
                    </label>
                    <input
                      id={`items.${index}.frequency`}
                      type="text"
                      className="rx-input"
                      placeholder="مثال: هر ۸ ساعت بعد از غذا"
                      {...register(`items.${index}.frequency`, {
                        required: 'نحوه یا تناوب مصرف الزامی است',
                      })}
                    />
                    {errors.items?.[index]?.frequency && (
                      <span className="rx-error-text">
                        {errors.items[index].frequency.message}
                      </span>
                    )}
                  </div>

                  <div className="rx-form-group">
                    <label className="rx-label" htmlFor={`items.${index}.duration`}>
                      طول دوره درمان
                    </label>
                    <input
                      id={`items.${index}.duration`}
                      type="text"
                      className="rx-input"
                      placeholder="مثال: ۷ روز"
                      {...register(`items.${index}.duration`)}
                    />
                  </div>

                  <div className="rx-form-group">
                    <label className="rx-label" htmlFor={`items.${index}.quantity`}>
                      تعداد / مقدار
                    </label>
                    <input
                      id={`items.${index}.quantity`}
                      type="text"
                      dir="ltr"
                      className="rx-input"
                      placeholder="مثال: 20"
                      {...register(`items.${index}.quantity`)}
                    />
                  </div>
                </div>

                <div className="rx-form-group" style={{ marginTop: '0.75rem' }}>
                  <label className="rx-label" htmlFor={`items.${index}.instructions`}>
                    دستورات تکمیلی پزشک برای مصرف این دارو
                  </label>
                  <input
                    id={`items.${index}.instructions`}
                    type="text"
                    className="rx-input"
                    placeholder="مثال: همراه با یک لیوان آب فراوان میل شود."
                    {...register(`items.${index}.instructions`)}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* General Notes */}
          <div className="rx-form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="rx-label" htmlFor="notes">
              توضیحات و توصیه‌های تکمیلی نسخه (اختیاری)
            </label>
            <textarea
              id="notes"
              rows={3}
              className="rx-textarea"
              placeholder="هرگونه یادداشت تکمیلی پزشک..."
              {...register('notes')}
            />
          </div>

          {/* Submit Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="rx-btn rx-btn-ghost"
              onClick={() => navigate('/prescriptions')}
              disabled={submitting}
            >
              انصراف
            </button>
            <button
              type="submit"
              className="rx-btn rx-btn-primary"
              disabled={submitting}
            >
              {submitting ? 'در حال ثبت...' : isEdit ? 'ذخیره تغییرات نسخه' : 'ثبت نهایی نسخه'}
            </button>
          </div>
        </form>

        {/* Left Column: Live Digital Prescription Slip Preview (Desktop) */}
        <aside className="rx-live-preview-card" aria-label="پیش‌نمایش زنده نسخه">
          <div className="rx-preview-header">
            <h3 className="rx-preview-title">℞ سربرگ نسخه دیجیتال</h3>
            <span style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--text-body)' }}>
              سامانه هوشمند سلامت‌یار
            </span>
            <div>
              <span className="rx-preview-stamp">تأییدیه نسخه</span>
            </div>
          </div>

          <div className="rx-preview-row">
            <strong>بیمار:</strong>
            <span>{livePatientName}</span>
          </div>

          <div className="rx-preview-row">
            <strong>پزشک:</strong>
            <span>{liveDoctorName}</span>
          </div>

          {watchedSpecialty && (
            <div className="rx-preview-row">
              <strong>تخصص:</strong>
              <span>{watchedSpecialty}</span>
            </div>
          )}

          {watchedClinic && (
            <div className="rx-preview-row">
              <strong>مرکز / مطب:</strong>
              <span>{watchedClinic}</span>
            </div>
          )}

          <div className="rx-preview-row">
            <strong>تاریخ تجویز:</strong>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatJalaliDate(watchedDate)}
            </span>
          </div>

          {watchedDiagnosis && (
            <div className="rx-preview-row">
              <strong>تشخیص:</strong>
              <span>{watchedDiagnosis}</span>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.75rem', paddingTop: '0.75rem' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-strong)', display: 'block', marginBottom: '0.4rem' }}>
              اقلام تجویزشده ({watchedItems?.length || 0}):
            </span>
            {watchedItems && watchedItems.length > 0 ? (
              watchedItems.map((med, idx) => (
                <div key={idx} className="rx-preview-med-item">
                  <span>
                    <span style={{ marginInlineEnd: '0.35rem' }}>
                      {getMedFormIcon(med.form)}
                    </span>
                    <strong>{med.drug_name || `داروی ${idx + 1}`}</strong>
                    {med.strength_dose ? ` (${med.strength_dose})` : ''}
                  </span>
                  <span style={{ color: 'var(--text-body)', fontSize: '0.84rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {med.frequency || med.quantity || '—'}
                  </span>
                </div>
              ))
            ) : (
              <span style={{ fontSize: '0.86rem', fontWeight: 500, color: 'var(--text-body)' }}>
                هنوز دارویی ثبت نشده است.
              </span>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default PrescriptionForm;