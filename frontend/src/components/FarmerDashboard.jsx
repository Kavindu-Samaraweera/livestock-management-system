import { useEffect, useState } from 'react'
import { getDashboardSummary } from '../api/dashboard'
import AnimalManager from './AnimalManager'
import MilkManager from './MilkManager'
import VaccinationManager from './VaccinationManager'
import WeightManager from './WeightManager'
import BreedingManager from './BreedingManager'
import ReportsManager from './ReportsManager'
import MarketplaceManager from './MarketplaceManager'
import MarketplaceBrowse from './MarketplaceBrowse'
import SettingsManager from './SettingsManager'

const menuItems = [
  ['marketplace', '→', 'Marketplace'],
  ['marketplace-browse', '◇', 'Browse Marketplace'],
  ['dashboard', '⌂', 'Dashboard'],
  ['animals', '◌', 'My Animals'],
  ['milk', '◒', 'Milk Records'],
  ['vaccinations', '✚', 'Vaccinations'],
  ['weight', '↗', 'Weight Records'],
  ['breeding', '♡', 'Breeding'],
  ['reports', '▥', 'Reports'],
  ['settings', '⚙', 'Settings']
]

const workspaceOrder = ['dashboard', 'animals', 'milk', 'vaccinations', 'weight', 'breeding', 'reports', 'settings', 'marketplace', 'marketplace-browse']
const orderedMenuItems = workspaceOrder.map((key) => menuItems.find(([itemKey]) => itemKey === key))

const emptySummary = {
  totalAnimals: 0,
  cows: 0,
  goats: 0,
  maleAnimals: 0,
  femaleAnimals: 0,
  overview: [],
  recentActivity: []
}

function FarmerDashboard({ user, token, onLogout, onUserUpdated }) {
  const [summary, setSummary] = useState(emptySummary)
  const [activeSection, setActiveSection] = useState('dashboard')
  const [loadState, setLoadState] = useState('loading')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [summaryVersion, setSummaryVersion] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    let isMounted = true
    getDashboardSummary(token)
      .then((data) => {
        if (isMounted) {
          setSummary(data)
          setLoadState('ready')
        }
      })
      .catch((requestError) => {
        if (!isMounted) return
        setError(requestError.message)
        setLoadState('error')
        if (requestError.status === 401 || requestError.status === 403) onLogout()
      })

    return () => { isMounted = false }
  }, [onLogout, summaryVersion, token])

  const handleSectionChange = (section) => {
    setActiveSection(section)
    setSidebarOpen(false)
    setNotice(section === 'dashboard' || section === 'animals' || section === 'milk' || section === 'vaccinations' || section === 'weight' || section === 'breeding' || section === 'reports' || section === 'settings' || section === 'marketplace' || section === 'marketplace-browse' ? '' : 'This section is prepared for the next development phase.')
  }

  const maxOverview = Math.max(...summary.overview.map((item) => item.value), 1)

  return (
    <div className="dashboard-shell">
      <aside className={sidebarOpen ? 'dashboard-sidebar mobile-sidebar-open' : 'dashboard-sidebar'}>
        <div className="sidebar-brand"><span className="brand-dot">LM</span><span>Livestock<br /><strong>Manager</strong></span></div>
        <p className="sidebar-label">Workspace</p>
        <nav aria-label="Farmer dashboard navigation">
          {orderedMenuItems.map(([key, icon, label]) => (
            <button key={key} type="button" className={activeSection === key ? 'nav-item active' : 'nav-item'} onClick={() => handleSectionChange(key)}>
              <span className="nav-icon" aria-hidden="true">{icon}</span>{label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div><span className="pulse-dot" /> Data stays private to your farm</div>
          <button className="sidebar-logout-button" type="button" onClick={onLogout}>Log out</button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <button className="mobile-menu-button" type="button" aria-label="Open dashboard navigation" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen((open) => !open)}><span /><span /><span /></button>
          <div className="mobile-brand"><span className="brand-dot">LM</span><strong>Livestock Manager</strong></div>
          <div className="header-actions"><div className="avatar">{user.name.charAt(0).toUpperCase()}</div><div className="user-info"><strong>{user.name}</strong><span>Farmer account</span></div><button className="logout-button header-logout-button" type="button" onClick={onLogout}>Log out</button></div>
        </header>
        {sidebarOpen && <button className="mobile-sidebar-backdrop" type="button" aria-label="Close dashboard navigation" onClick={() => setSidebarOpen(false)} />}

        <div className="dashboard-content">
          {activeSection === 'dashboard' && <div className="dashboard-intro">
            <div><p className="eyebrow dashboard-eyebrow">Farmer dashboard</p><h1>Welcome, {user.name.split(' ')[0]}.</h1><p>Here is what is happening across your farm today.</p></div>
          </div>}

          {notice && <div className="dashboard-notice" role="status">{notice}</div>}
          {loadState === 'error' && <div className="dashboard-error" role="alert">{error}</div>}

          {activeSection === 'animals' ? <AnimalManager token={token} onChanged={() => setSummaryVersion((current) => current + 1)} onLogout={onLogout} /> : activeSection === 'milk' ? <MilkManager token={token} onLogout={onLogout} /> : activeSection === 'vaccinations' ? <VaccinationManager token={token} onLogout={onLogout} /> : activeSection === 'weight' ? <WeightManager token={token} onLogout={onLogout} /> : activeSection === 'breeding' ? <BreedingManager token={token} onLogout={onLogout} /> : activeSection === 'reports' ? <ReportsManager token={token} onLogout={onLogout} /> : activeSection === 'marketplace' ? <MarketplaceManager token={token} onLogout={onLogout} /> : activeSection === 'marketplace-browse' ? <MarketplaceBrowse token={token} onLogout={onLogout} /> : activeSection === 'settings' ? <SettingsManager user={user} token={token} onUserUpdated={onUserUpdated} /> : activeSection !== 'dashboard' ? (
            <section className="section-placeholder"><span className="placeholder-icon">◌</span><h2>{menuItems.find(([key]) => key === activeSection)?.[2]}</h2><p>{notice}</p></section>
          ) : (
            <>
              <section className="summary-grid" aria-label="Farm summary">
                <SummaryCard label="Total Animals" value={loadState === 'loading' ? '—' : summary.totalAnimals} icon="✦" accent="deep" />
                <SummaryCard label="Cows" value={loadState === 'loading' ? '—' : summary.cows} icon="◒" accent="green" />
                <SummaryCard label="Goats" value={loadState === 'loading' ? '—' : summary.goats} icon="◇" accent="gold" />
                <SummaryCard label="Male Animals" value={loadState === 'loading' ? '—' : summary.maleAnimals} icon="♂" accent="blue" />
                <SummaryCard label="Female Animals" value={loadState === 'loading' ? '—' : summary.femaleAnimals} icon="♀" accent="rose" />
              </section>

              <section className="dashboard-grid">
                <div className="dashboard-panel overview-panel"><div className="panel-heading"><div><p className="panel-kicker">Livestock overview</p><h2>Animal population</h2></div><span className="panel-period">All time</span></div>
                  {loadState === 'loading' ? <div className="loading-state">Loading your farm data…</div> : summary.totalAnimals === 0 ? <EmptyState title="Your herd is ready to grow" body="Add your first animal to see population trends and species breakdowns here." /> : <div className="bar-chart">{summary.overview.map((item) => <div className="bar-column" key={item.label}><strong>{item.value}</strong><div className={`bar ${item.color}`} style={{ height: `${Math.max((item.value / maxOverview) * 150, 14)}px` }} /><span>{item.label}</span></div>)}</div>}
                </div>
                <div className="dashboard-panel activity-panel"><div className="panel-heading"><div><p className="panel-kicker">Activity</p><h2>Recent activity</h2></div><button className="quiet-button" type="button">View all</button></div>{summary.recentActivity.length === 0 ? <EmptyState title="No activity yet" body="Your farm updates will appear here as you add records." compact /> : summary.recentActivity.map((item) => <div key={item.id}>{item.label}</div>)}</div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function SummaryCard({ label, value, icon, accent }) {
  return <article className="summary-card"><div className={`summary-icon ${accent}`}>{icon}</div><div><p>{label}</p><strong>{value}</strong></div><span className="card-arrow">↗</span></article>
}

function EmptyState({ title, body, compact = false }) {
  return <div className={compact ? 'empty-state compact' : 'empty-state'}><span className="empty-icon">⌁</span><h3>{title}</h3><p>{body}</p></div>
}

export default FarmerDashboard
