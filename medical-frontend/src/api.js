/**
 * Central axios instance for every API call in the app.
 *
 * A request interceptor attaches the stored JWT as `Authorization: Bearer …`
 * to all requests except token endpoints, which must stay anonymous so they
 * can be reached before/outside an authenticated session.
 *
 * @module api
 */
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/',
});

API.interceptors.request.use((config) => {
  // Token endpoints must be requested without the Authorization header.
  if (config.url.includes('token')) {
    return config;
  }

  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;