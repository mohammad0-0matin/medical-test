/**
 * API client methods for the Doctor's Prescription (نسخه پزشک) module.
 * Communicates with Django REST Framework backend at /api/prescriptions/.
 *
 * Privacy rule: Never log raw patient data or upload payloads.
 */
import API from '../api';

/**
 * Fetch paginated prescriptions for the authenticated user.
 *
 * @param {object} params - Query params (page, page_size, search, etc.)
 * @returns {Promise<object>} DRF paginated response { count, next, previous, results }
 */
export const fetchPrescriptions = async (params = {}) => {
  const response = await API.get('prescriptions/', { params });
  return response.data;
};

/**
 * Fetch a single prescription by its public UUID.
 *
 * @param {string} uuid - UUID of the prescription
 * @returns {Promise<object>} Prescription object
 */
export const fetchPrescriptionByUuid = async (uuid) => {
  const response = await API.get(`prescriptions/${uuid}/`);
  return response.data;
};

/**
 * Create a new prescription.
 * Automatically wraps in FormData if a file upload (scan_file) is present.
 *
 * @param {object} data - Prescription payload
 * @returns {Promise<object>} Created prescription object
 */
export const createPrescription = async (data) => {
  if (data.scan_file instanceof File) {
    const formData = new FormData();
    Object.keys(data).forEach((key) => {
      if (key === 'items') {
        formData.append('items', JSON.stringify(data.items));
      } else if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key]);
      } else if (key === 'registered_doctor') {
        formData.append('registered_doctor', '');
      }
    });
    const response = await API.post('prescriptions/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  const response = await API.post('prescriptions/', data);
  return response.data;
};

/**
 * Update an existing prescription by UUID.
 *
 * @param {string} uuid - UUID of the prescription
 * @param {object} data - Updated prescription payload
 * @returns {Promise<object>} Updated prescription object
 */
export const updatePrescription = async (uuid, data) => {
  if (data.scan_file instanceof File) {
    const formData = new FormData();
    Object.keys(data).forEach((key) => {
      if (key === 'items') {
        formData.append('items', JSON.stringify(data.items));
      } else if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key]);
      } else if (key === 'registered_doctor') {
        formData.append('registered_doctor', '');
      }
    });
    const response = await API.patch(`prescriptions/${uuid}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  const response = await API.patch(`prescriptions/${uuid}/`, data);
  return response.data;
};

/**
 * Soft delete a prescription by UUID.
 *
 * @param {string} uuid - UUID of the prescription
 * @returns {Promise<void>}
 */
export const deletePrescription = async (uuid) => {
  await API.delete(`prescriptions/${uuid}/`);
};

/**
 * Extract an unsaved draft from a prescription scan/document via AI.
 * Note: Never auto-saves on backend.
 *
 * @param {File} file - Prescription scan image or PDF
 * @returns {Promise<object>} Unsaved draft data { draft: { ... } }
 */
export const extractDraftFromPrescription = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await API.post('prescriptions/extract-draft/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

/**
 * Download or retrieve blob URL for an authenticated prescription scan.
 *
 * @param {string} uuid - UUID of the prescription
 * @returns {Promise<Blob>}
 */
export const fetchPrescriptionScanBlob = async (uuid) => {
  const response = await API.get(`prescriptions/${uuid}/scan/`, {
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Fetch doctors with approved access to the patient profile.
 *
 * @returns {Promise<Array>} List of granted doctor accesses
 */
export const fetchApprovedDoctors = async () => {
  try {
    const response = await API.get('access/granted/');
    return response.data || [];
  } catch {
    return [];
  }
};

/**
 * Create a reminder for a prescribed medication in the reminders database.
 *
 * @param {string} drugName - Name of the drug
 * @param {string} instructions - Dosage or instructions
 * @param {string} prescribedDate - Date to begin or schedule
 * @returns {Promise<object>} Created reminder object
 */
export const createMedicationReminder = async (drugName, instructions = '', prescribedDate = '') => {
  const targetDate = prescribedDate || new Date().toISOString().split('T')[0];
  const body = {
    title: `مصرف داروی ${drugName}`,
    due_date: targetDate,
    frequency: 'once',
    notes: instructions || 'طبق دستور پزشک معالج مصرف شود.',
  };
  const res = await API.post('reminders/', body);
  return res.data;
};
