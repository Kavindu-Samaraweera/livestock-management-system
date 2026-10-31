const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

async function request(path, token, options = {}) {
  const response = await fetch(`${API_URL}/weight-records${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Weight record request failed.');
    error.status = response.status;
    error.fields = data.errors || {};
    throw error;
  }
  return data;
}

export function fetchWeightRecords(token, filters) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.animal) params.set('animal', filters.animal);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  return request(`?${params.toString()}`, token);
}

export function fetchWeightHistory(token, animalId) { return request(`/animal/${animalId}/history`, token); }
export function createWeightRecord(token, payload) { return request('', token, { method: 'POST', body: JSON.stringify(payload) }); }
export function updateWeightRecord(token, id, payload) { return request(`/${id}`, token, { method: 'PATCH', body: JSON.stringify(payload) }); }
export function deleteWeightRecord(token, id) { return request(`/${id}`, token, { method: 'DELETE' }); }
