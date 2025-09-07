import { API_BASE_URL } from '../config';

export const fetchWithAuth = async (endpoint, options = {}) => {
  const token = localStorage.getItem('chat-token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

  return response;
};