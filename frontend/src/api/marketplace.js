const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

async function request(path, token, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(`${API_URL}/marketplace${path}`, { ...options, headers })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) { const error = new Error(data.message || 'Marketplace request failed.'); error.status = response.status; error.fields = data.errors || {}; throw error }
  return data
}

export const fetchListings = (token, filters = {}) => { const params = new URLSearchParams(); Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value) }); return request(`/listings?${params.toString()}`, token) }
export const fetchMyListings = (token) => request('/listings/mine', token)
export const createListing = (token, payload) => request('/listings', token, { method: 'POST', body: JSON.stringify(payload) })
export const updateListing = (token, id, payload) => request(`/listings/${id}`, token, { method: 'PATCH', body: JSON.stringify(payload) })
export const deleteListing = (token, id) => request(`/listings/${id}`, token, { method: 'DELETE' })
export const createOrder = (token, payload) => request('/orders', token, { method: 'POST', body: JSON.stringify(payload) })
export const fetchCustomerOrders = (token) => request('/orders', token)
export const cancelOrder = (token, id) => request(`/orders/${id}/cancel`, token, { method: 'PATCH' })
export const fetchSellerOrders = (token) => request('/seller/orders', token)
export const updateSellerOrder = (token, id, action) => request(`/seller/orders/${id}/status`, token, { method: 'PATCH', body: JSON.stringify({ action }) })
