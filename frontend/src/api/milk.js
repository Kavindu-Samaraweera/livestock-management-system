const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(path, token, options = {}) {
  const response = await fetch(`${API_URL}/milk-records${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Milk record request failed.');
    error.status = response.status;
    error.fields = data.errors || {};
    throw error;
  }
  return data;
}

export function fetchMilkRecords(token, filters) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.session) params.set('session', filters.session);
  return request(`?${params.toString()}`, token);
}

export function fetchMilkSummary(token) { return request('/summary', token); }
export function createMilkRecord(token, payload) { return request('', token, { method: 'POST', body: JSON.stringify(payload) }); }
export function updateMilkRecord(token, id, payload) { return request(`/${id}`, token, { method: 'PATCH', body: JSON.stringify(payload) }); }
export function deleteMilkRecord(token, id) { return request(`/${id}`, token, { method: 'DELETE' }); }
