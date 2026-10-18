/**
 * API client methods for the Lab Tests module.
 * Communicates with Django REST Framework backend at /api/.
 *
 * Privacy rule: Never log raw patient data or upload payloads.
 */
import API from '../api';

/**
 * Fetch catalog of predefined test types.
 *
 * @returns {Promise<Array>} List of TestType objects
 */
export const fetchTestTypes = async () => {
  const response = await API.get('test-types/');
  return response.data;
};

/**
 * Fetch patient profiles accessible to the authenticated user.
 *
 * @returns {Promise<Array>} List of Patient objects
 */
export const fetchPatients = async () => {
  const response = await API.get('patients/');
  return response.data;
};

/**
 * Send an image to AI for extracting draft lab test values WITHOUT saving to DB.
 *
 * @param {File} file - Image file (JPEG, PNG, WebP)
 * @returns {Promise<object>} Draft test object
 */
export const extractDraftFromTestImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await API.post('test-results/extract-draft/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

/**
 * Create a new test result.
 *
 * @param {object} payload - Test result payload
 * @returns {Promise<object>} Created TestResult
 */
export const createTestResult = async (payload) => {
  const response = await API.post('test-results/', payload);
  return response.data;
};

/**
 * Upload a document or image attachment for a test result.
 *
 * @param {number|string} testResultId - ID of parent TestResult
 * @param {File} file - Attached file
 * @returns {Promise<object>} Created Attachment
 */
export const uploadTestAttachment = async (testResultId, file) => {
  const formData = new FormData();
  formData.append('test_result', testResultId);
  formData.append('file_path', file);
  formData.append('file_name', file.name);
  if (file.type) {
    formData.append('mime_type', file.type);
  }
  const response = await API.post('attachments/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
