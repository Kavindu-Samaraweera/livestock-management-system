const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function getDashboardSummary(token) {
  const response = await fetch(`${API_URL}/dashboard/summary`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || 'Unable to load dashboard data.');
    error.status = response.status;
    throw error;
  }

  return data.summary;
}
