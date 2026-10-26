const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(path, token, options = {}) {
  const response = await fetch(`${API_URL}/animals${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Animal request failed.');
    error.status = response.status;
    error.fields = data.errors || {};
    throw error;
  }
  return data;
}

export function fetchAnimals(token, filters) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.species) params.set('species', filters.species);
  if (filters.sex) params.set('sex', filters.sex);
  if (filters.sort) params.set('sort', filters.sort);
  return request(`?${params.toString()}`, token);
}

export function fetchAnimal(token, id) { return request(`/${id}`, token); }
export function createAnimal(token, payload) { return request('', token, { method: 'POST', body: JSON.stringify(payload) }); }
export function updateAnimal(token, id, payload) { return request(`/${id}`, token, { method: 'PATCH', body: JSON.stringify(payload) }); }
export function deleteAnimal(token, id) { return request(`/${id}`, token, { method: 'DELETE' }); }
