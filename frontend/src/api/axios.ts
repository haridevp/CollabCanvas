import axios from 'axios';

const api = axios.create({
<<<<<<< HEAD
  baseURL: 'http://localhost:5000/api', 
=======
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
>>>>>>> e9484dbdb44f390182806f8e483ae41c1d1ade9d
  headers: { 'Content-Type': 'application/json' }
});

// Attach token using the Bearer scheme
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    // FIX: Match the backend 'Authorization' header requirement
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export default api;