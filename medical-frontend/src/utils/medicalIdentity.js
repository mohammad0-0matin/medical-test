/**
 * نقش کاربری و هویت پزشکی
 *
 * مقادیر در payload پروفایل ارسال می‌شوند (medical_role / medical_id)؛
 * اگر بک‌اند این فیلدها را نگه دارد مقدار سرور اولویت دارد،
 * وگرنه به صورت امن در localStorage ذخیره می‌شود تا بدون خطا کار کند.
 */

const STORAGE_KEY = 'salamatyar_medical_identity';

export const MEDICAL_ROLES = {
  STANDARD: 'standard',
  DOCTOR: 'doctor',
  STAFF: 'staff',
};

export const ROLE_LABELS = {
  standard: 'کاربر عادی / بیمار',
  doctor: 'پزشک متخصص / عمومی',
  staff: 'کادر درمان / پرستار',
};

const readStored = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') {
      return {
        role: Object.values(MEDICAL_ROLES).includes(parsed.role) ? parsed.role : MEDICAL_ROLES.STANDARD,
        id: typeof parsed.id === 'string' ? parsed.id : '',
      };
    }
  } catch {
    /* storage unavailable */
  }
  return { role: MEDICAL_ROLES.STANDARD, id: '' };
};

export const getStoredIdentity = () => readStored();

export const storeIdentity = ({ role, id }) => {
  writeJson({
    role: Object.values(MEDICAL_ROLES).includes(role) ? role : MEDICAL_ROLES.STANDARD,
    id: typeof id === 'string' ? id : '',
  });
};

const writeJson = (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
};

/**
 * اولویت: مقدار برگشتی سرور → مقدار محلی → پیش‌فرض استاندارد
 */
export const resolveMedicalIdentity = (profile) => {
  const stored = readStored();
  return {
    role: profile?.medical_role || stored.role,
    id: profile?.medical_id || stored.id || '',
  };
};
