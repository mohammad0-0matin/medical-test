import axios from 'axios';

const API = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/',
});

API.interceptors.request.use((config) => {
  // 👈 اگر مسیر مربوط به دریافت توکن (لاگین) است، بدون هیچ توکنی درخواست رو بفرست
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