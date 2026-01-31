import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', // Your backend URL
  headers: { 'Content-Type': 'application/json' }
});

// Attach token if it exists (for protected routes later)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers['x-auth-token'] = token;
  return config;
});

export default api;