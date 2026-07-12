import axios from 'axios';

const getBaseURL = () => {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) {
    return envUrl;
  }
  const host = window.location.hostname;
  if (host.includes('devtunnels.ms') || host.includes('gitpod.io') || host.includes('github.dev')) {
    const protocol = window.location.protocol;
    const tunnelBackendHost = host.replace('-5173', '-5001');
    return `${protocol}//${tunnelBackendHost}/api`;
  }
  return 'http://localhost:5001/api';
};

const API = axios.create({
  baseURL: getBaseURL(),
});

// Add a request interceptor to attach the JWT token to all API calls
API.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default API;
