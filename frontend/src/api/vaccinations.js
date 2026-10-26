const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(path, token, options = {}) {
  const response = await fetch(`${API_URL}/vaccinations${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Vaccination request failed.');
    error.status = response.status;
    error.fields = data.errors || {};
    throw error;
  }
  return data;
}

export function fetchVaccinations(token, filters) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  return request(`?${params.toString()}`, token);
}

export function fetchVaccinationSummary(token) { return request('/summary', token); }
export function createVaccination(token, payload) { return request('', token, { method: 'POST', body: JSON.stringify(payload) }); }
export function updateVaccination(token, id, payload) { return request(`/${id}`, token, { method: 'PATCH', body: JSON.stringify(payload) }); }
export function deleteVaccination(token, id) { return request(`/${id}`, token, { method: 'DELETE' }); }
