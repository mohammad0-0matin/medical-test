/**
 * Medical role & identity helpers.
 *
 * Values are submitted with the profile payload as `medical_role` /
 * `medical_id`. When the backend persists them, server values take priority;
 * otherwise a localStorage snapshot keeps badges working without any
 * backend schema migration.
 *
 * @module utils/medicalIdentity
 */

/** localStorage key holding the identity snapshot. */
const STORAGE_KEY = 'salamatyar_medical_identity';

/** Supported role values. */
export const MEDICAL_ROLES = {
  STANDARD: 'standard',
  DOCTOR: 'doctor',
  STAFF: 'staff',
};

/** Persian display labels per role. */
export const ROLE_LABELS = {
  standard: 'کاربر عادی / بیمار',
  doctor: 'پزشک متخصص / عمومی',
  staff: 'کادر درمان / پرستار',
};

/** Reads and validates the locally stored identity. */
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

/**
 * Returns the locally stored identity, defaulting to the standard role.
 *
 * @returns {{role:string,id:string}}
 */
export const getStoredIdentity = () => readStored();

/**
 * Persists an identity snapshot after validating the role value.
 *
 * @param {{role:string,id:string}} identity - Identity to store.
 * @returns {void}
 */
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
 * Resolves the effective identity with precedence:
 * server profile values → local snapshot → `standard` user.
 *
 * @param {object|null} profile - Patient profile from `/patients/me/`.
 * @returns {{role:string,id:string}} Effective identity.
 */
export const resolveMedicalIdentity = (profile) => {
  const stored = readStored();
  return {
    role: profile?.medical_role || stored.role,
    id: profile?.medical_id || stored.id || '',
  };
};
