import axios from 'axios';

const API = axios.create({
  // Use relative /api — Vite dev proxy forwards to backend:5001.
  baseURL: '/api',
});

API.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error),
);

API.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
    }
    return Promise.reject(error);
  },
);

// Faculty timetable API methods (for HOD/Dean/Principal)
export const getAnyFacultyTimetable = async (teacherId: string, semesterId?: string) => {
  const params = semesterId ? { semesterId } : {};
  const response = await API.get(`/timetable/faculty/${teacherId}`, { params });
  return response.data;
};

// Faculty status API method (for HOD/Dean/Principal)
export const getCurrentFacultyStatus = async () => {
  const response = await API.get('/timetable/faculty-status');
  return response.data;
};

export default API;
