const API = import.meta.env.VITE_API_URL || '/api';

export async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = localStorage.getItem('mh_token');
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const setSession = (token, user) => {
  localStorage.setItem('mh_token', token);
  localStorage.setItem('mh_user', JSON.stringify(user));
};
export const clearSession = () => {
  localStorage.removeItem('mh_token');
  localStorage.removeItem('mh_user');
};
export const getUser = () => {
  try { return JSON.parse(localStorage.getItem('mh_user') || 'null'); } catch { return null; }
};
