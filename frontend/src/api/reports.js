const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

async function request(path, token) {
  const response = await fetch(`${API_URL}/reports${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(data.message || 'Report request failed.'); error.status = response.status; throw error; }
  return data;
}
const query = (filters, animal) => { const params = new URLSearchParams(); if (filters.dateFrom) params.set('dateFrom', filters.dateFrom); if (filters.dateTo) params.set('dateTo', filters.dateTo); if (animal) params.set('animal', animal); return params.toString() ? `?${params.toString()}` : '' };
export function fetchReportOverview(token, filters, animal) { return request(`/overview${query(filters, animal)}`, token) }
