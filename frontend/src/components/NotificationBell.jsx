import { useCallback, useEffect, useState } from 'react'
import { fetchVaccinationSummary } from '../api/vaccinations'
import { fetchUpcomingDeliveries } from '../api/breeding'

function NotificationBell({ token, onLogout }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [readNotifications, setReadNotifications] = useState(() => new Set())
  const [loading, setLoading] = useState(true)

  const loadNotifications = useCallback(async () => {
    try {
      const [{ summary: vaccinationSummary }, { deliveries }] = await Promise.all([fetchVaccinationSummary(token), fetchUpcomingDeliveries(token)])
      const next = []
      if (vaccinationSummary.overdue > 0) next.push({ id: 'vaccinations-overdue', type: 'urgent', text: `${vaccinationSummary.overdue} vaccination${vaccinationSummary.overdue === 1 ? '' : 's'} overdue.` })
      if (vaccinationSummary.dueToday > 0) next.push({ id: 'vaccinations-today', type: 'warning', text: `${vaccinationSummary.dueToday} vaccination${vaccinationSummary.dueToday === 1 ? '' : 's'} due today.` })
      vaccinationSummary.reminders.forEach((record) => next.push({ id: `vaccination-${record._id}`, type: 'reminder', text: `${record.vaccineName} for ${record.animal?.name || record.animal?.tagId || 'your animal'} is due ${new Date(record.nextDueDate).toLocaleDateString()}.` }))
      deliveries.slice(0, 5).forEach((record) => next.push({ id: `delivery-${record._id}`, type: 'reminder', text: `${record.mother?.name || record.mother?.tagId || 'Animal'} has an expected delivery on ${new Date(record.expectedDeliveryDate).toLocaleDateString()}.` }))
      setNotifications(next)
    } catch (error) {
      if (error.status === 401 || error.status === 403) onLogout()
    } finally {
      setLoading(false)
    }
  }, [onLogout, token])

  useEffect(() => {
    const initialLoad = window.setTimeout(loadNotifications, 0)
    const interval = window.setInterval(loadNotifications, 5 * 60 * 1000)
    return () => { window.clearTimeout(initialLoad); window.clearInterval(interval) }
  }, [loadNotifications])

  const markAsRead = (id) => setReadNotifications((current) => new Set(current).add(id))
  const unreadCount = notifications.filter((notification) => !readNotifications.has(notification.id)).length

  return (
    <div className="notification-wrap">
      <button className="notification-button" type="button" aria-label="View notifications" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <svg className="notification-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
        {unreadCount > 0 && <span className="notification-count">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>
      {open && <div className="notification-panel" role="dialog" aria-label="Notifications">
        <div className="notification-heading"><strong>Notifications</strong><button type="button" onClick={() => setOpen(false)}>Close</button></div>
        {loading ? <p className="notification-empty">Checking reminders…</p> : notifications.length === 0 ? <p className="notification-empty">You have no new reminders.</p> : <div className="notification-list">{notifications.map((notification) => <button className={`notification-item ${notification.type} ${readNotifications.has(notification.id) ? 'read' : ''}`} type="button" key={notification.id} onClick={() => markAsRead(notification.id)}><span className="notification-dot" /><span>{notification.text}</span></button>)}</div>}
      </div>}
    </div>
  )
}

export default NotificationBell
