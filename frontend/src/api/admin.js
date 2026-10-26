const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

async function request(path, token, options = {}) {
  const response = await fetch(`${API_URL}/admin${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) { const error = new Error(data.message || 'Administration request failed.'); error.status = response.status; throw error }
  return data
}

export const fetchAdminOverview = (token) => request('/overview', token)
export const fetchAdminUsers = (token, filters = {}) => { const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value)); return request(`/users?${params.toString()}`, token) }
export const createAdminUser = (token, payload) => request('/users', token, { method: 'POST', body: JSON.stringify(payload) })
export const fetchAdminUserDetails = (token, id) => request(`/users/${id}`, token)
export const fetchAdminResource = (token, resource) => request(`/data/${resource}`, token)
export const createAdminResource = (token, resource, payload) => request(`/data/${resource}`, token, { method: 'POST', body: JSON.stringify(payload) })
export const updateAdminResource = (token, resource, id, payload) => request(`/data/${resource}/${id}`, token, { method: 'PATCH', body: JSON.stringify(payload) })
export const deleteAdminResource = (token, resource, id) => request(`/data/${resource}/${id}`, token, { method: 'DELETE' })
export const changeAdminUserStatus = (token, id, status) => request(`/users/${id}/status`, token, { method: 'PATCH', body: JSON.stringify({ status }) })
export const updateAdminUser = (token, id, payload) => request(`/users/${id}`, token, { method: 'PATCH', body: JSON.stringify(payload) })
export const deleteAdminUser = (token, id) => request(`/users/${id}`, token, { method: 'DELETE' })
export const fetchAdminListings = (token, filters = {}) => { const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value)); return request(`/listings?${params.toString()}`, token) }
export const moderateAdminListing = (token, id, action) => request(`/listings/${id}/moderate`, token, { method: 'PATCH', body: JSON.stringify({ action }) })
export const updateAdminListing = (token, id, payload) => request(`/listings/${id}`, token, { method: 'PATCH', body: JSON.stringify(payload) })
export const deleteAdminListing = (token, id) => request(`/listings/${id}`, token, { method: 'DELETE' })
export const createAdminListing = (token, payload) => request('/data/listings', token, { method: 'POST', body: JSON.stringify(payload) })
export const fetchAdminOrders = (token, status = '') => request(`/orders${status ? `?status=${encodeURIComponent(status)}` : ''}`, token)
export const fetchAdminLogs = (token) => request('/logs', token)
