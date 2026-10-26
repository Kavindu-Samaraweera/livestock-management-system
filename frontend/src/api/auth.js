const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function submitAuth(path, payload) {
  const response = await fetch(`${API_URL}/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || 'Unable to complete the request.');
    error.fields = data.errors || {};
    throw error;
  }

  return data;
}
