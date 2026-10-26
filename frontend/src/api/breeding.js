const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(path, token, options = {}) {
  const response = await fetch(`${API_URL}/breeding-records${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(data.message || 'Breeding request failed.'); error.status = response.status; error.fields = data.errors || {}; throw error; }
  return data;
}
export function fetchBreedingRecords(token, filters) { const params = new URLSearchParams(); if (filters.search) params.set('search', filters.search); if (filters.species) params.set('species', filters.species); if (filters.pregnancyStatus) params.set('pregnancyStatus', filters.pregnancyStatus); if (filters.dateFrom) params.set('dateFrom', filters.dateFrom); if (filters.dateTo) params.set('dateTo', filters.dateTo); return request(`?${params.toString()}`, token) }
export function fetchBreedingSummary(token) { return request('/summary', token) }
export function fetchUpcomingDeliveries(token) { return request('/upcoming-deliveries?days=30', token) }
export function fetchBreedingHistory(token, animalId) { return request(`/animal/${animalId}/history`, token) }
export function createBreedingRecord(token, payload) { return request('', token, { method: 'POST', body: JSON.stringify(payload) }) }
export function updateBreedingRecord(token, id, payload) { return request(`/${id}`, token, { method: 'PATCH', body: JSON.stringify(payload) }) }
export function deleteBreedingRecord(token, id) { return request(`/${id}`, token, { method: 'DELETE' }) }
