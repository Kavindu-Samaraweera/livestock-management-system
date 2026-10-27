import { useCallback, useEffect, useState } from 'react'
import { cancelOrder, createOrder, fetchCustomerOrders, fetchListings } from '../api/marketplace'

const initialFilters = { search: '', category: '', animalType: '', sex: '', minPrice: '', maxPrice: '', sort: 'newest' }

function MarketplacePage({ token, user, onLogout }) {
  const [filters, setFilters] = useState(initialFilters)
  const [listings, setListings] = useState([])
  const [orders, setOrders] = useState([])
  const [selected, setSelected] = useState(null)
  const [quantity, setQuantity] = useState('1')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [listingData, orderData] = await Promise.all([fetchListings(token, filters), fetchCustomerOrders(token)])
      setListings(listingData.listings)
      setOrders(orderData.orders)
    } catch (requestError) {
      setError(requestError.message)
      if (requestError.status === 401 || requestError.status === 403) onLogout()
    } finally {
      setLoading(false)
    }
  }, [filters, onLogout, token])

  useEffect(() => {
    const timeout = window.setTimeout(load, 250)
    return () => window.clearTimeout(timeout)
  }, [load])

  const order = async () => {
    try {
      await createOrder(token, { listing: selected._id, quantity })
      setNotice('Order request submitted for seller confirmation.')
      setSelected(null)
      await load()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const cancel = async (id) => {
    if (!window.confirm('Cancel this pending order?')) return
    try {
      await cancelOrder(token, id)
      setNotice('Order cancelled.')
      await load()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return <main className="customer-shell">
    <header className="customer-header"><div className="mobile-brand"><span className="brand-dot">LM</span><strong>Livestock Marketplace</strong></div><div className="header-actions"><div className="avatar">{user.name.charAt(0).toUpperCase()}</div><div className="user-info"><strong>{user.name}</strong><span>Customer account</span></div><button className="logout-button" type="button" onClick={onLogout}>Log out</button></div></header>
    <section className="marketplace-page">
      <div className="animal-page-heading"><div><p className="eyebrow dashboard-eyebrow">Customer marketplace</p><h1>Find trusted farm products.</h1><p>Orders are requests for manual seller confirmation; no payment is processed here.</p></div></div>
      {notice && <div className="dashboard-notice" role="status">{notice}</div>}
      {error && <div className="dashboard-error" role="alert">{error}</div>}
      <div className="marketplace-filters"><input aria-label="Search listings" placeholder="Search products, animal IDs, or descriptions" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /><select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}><option value="">All categories</option><option value="animal">Animals</option><option value="milk">Milk</option><option value="feed">Animal feed</option></select><select value={filters.animalType} onChange={(event) => setFilters({ ...filters, animalType: event.target.value })}><option value="">All species</option><option value="cow">Cows</option><option value="goat">Goats</option></select><select value={filters.sex} onChange={(event) => setFilters({ ...filters, sex: event.target.value })}><option value="">Any sex</option><option value="male">Male</option><option value="female">Female</option></select><input type="number" min="0" placeholder="Min price" value={filters.minPrice} onChange={(event) => setFilters({ ...filters, minPrice: event.target.value })} /><input type="number" min="0" placeholder="Max price" value={filters.maxPrice} onChange={(event) => setFilters({ ...filters, maxPrice: event.target.value })} /><select value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value })}><option value="newest">Newest</option><option value="price-low">Lowest price</option><option value="price-high">Highest price</option></select></div>
      <div className="marketplace-layout"><section><h2>Available listings</h2>{loading ? <div className="animal-state">Loading marketplace...</div> : listings.length === 0 ? <div className="animal-state empty-animal"><h3>No active listings found</h3><p>Try different filters or check back when farmers add products.</p></div> : <div className="listing-grid">{listings.map((listing) => <article className="listing-card" key={listing._id}><div className="listing-image">{listing.imageUrl ? <img src={listing.imageUrl} alt="" /> : <span>{listing.category === 'animal' ? '🐄' : listing.category === 'milk' ? '🥛' : '🌾'}</span>}</div><div className="listing-card-body"><span className="listing-category">{listing.category}</span><h3>{listing.title}</h3><p>{listing.description || 'No additional description.'}</p><strong>{listing.currency} {listing.price.toFixed(2)} / {listing.unit}</strong><small>Available: {listing.availableQuantity} {listing.unit} · Seller: {listing.seller?.name || 'Farmer'}</small><button className="submit-button" type="button" onClick={() => { setSelected(listing); setQuantity('1') }}>View and order</button></div></article>)}</div>}</section><section className="customer-orders"><h2>My orders</h2>{orders.length === 0 ? <p className="report-empty">You have not placed any orders.</p> : orders.map((orderItem) => <div className="customer-order" key={orderItem._id}><div><strong>{orderItem.itemSnapshot.title}</strong><span>{orderItem.status} · {orderItem.quantity} {orderItem.itemSnapshot.unit}</span></div><strong>{orderItem.itemSnapshot.unitPrice * orderItem.quantity}</strong>{orderItem.status === 'pending' && <button className="table-delete" type="button" onClick={() => cancel(orderItem._id)}>Cancel</button>}</div>)}</section></div>
    </section>
    {selected && <div className="marketplace-modal" role="dialog" aria-modal="true"><div className="marketplace-modal-card"><button className="quiet-button modal-close" type="button" onClick={() => setSelected(null)}>Close</button>{selected.imageUrl && <img className="marketplace-modal-image" src={selected.imageUrl} alt={selected.title} />}<p className="panel-kicker">{selected.category}</p><h2>{selected.title}</h2><p>{selected.description || 'No additional description.'}</p><p><strong>{selected.currency} {selected.price.toFixed(2)} / {selected.unit}</strong></p><p>Available: {selected.availableQuantity} {selected.unit}</p>{selected.category === 'animal' && <p>{selected.animalType} · {selected.sex} · {selected.breed || 'Breed not specified'} · ID {selected.animalId}</p>}<label>Quantity<input type="number" min="1" max={selected.availableQuantity} step={selected.category === 'animal' ? '1' : '0.01'} value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label><button className="submit-button" type="button" onClick={order}>Submit order request</button><small>Payment is not processed. The seller must confirm this request.</small></div></div>}
  </main>
}

export default MarketplacePage
