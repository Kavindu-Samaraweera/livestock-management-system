import { useCallback, useState } from 'react'
import { submitAuth } from './api/auth'
import CustomerLanding from './components/CustomerLanding'
import FarmerDashboard from './components/FarmerDashboard'
import AdminDashboard from './components/AdminDashboard'
import HomePage from './components/HomePage'
import './App.css'

const initialForm = { name: '', email: '', password: '', role: 'farmer' }

function App() {
  const [session, setSession] = useState(() => readSession())
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState('login')

  const logout = useCallback(() => {
    localStorage.removeItem('livestockAuthToken')
    localStorage.removeItem('livestockAuthUser')
    setSession(null)
  }, [])

  const updateUser = useCallback((user) => {
    setSession((current) => {
      const updated = { ...current, user }
      localStorage.setItem('livestockAuthUser', JSON.stringify(user))
      return updated
    })
  }, [])

  if (session?.user?.role === 'farmer') {
    return <FarmerDashboard user={session.user} token={session.token} onLogout={logout} onUserUpdated={updateUser} />
  }

  if (session?.user?.role === 'superadmin') {
    return <AdminDashboard user={session.user} token={session.token} onLogout={logout} />
  }

  if (session?.user?.role === 'customer') {
    return <CustomerLanding user={session.user} token={session.token} onLogout={logout} />
  }

  if (!showAuth) return <HomePage onOpenAuth={(mode) => { setAuthMode(mode); setShowAuth(true) }} />

  return <AuthScreen initialMode={authMode} onBack={() => setShowAuth(false)} onAuthenticated={setSession} />
}

function AuthScreen({ initialMode = 'login', onBack, onAuthenticated }) {
  const [mode, setMode] = useState(initialMode)
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isRegistering = mode === 'register'

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: '' }))
    setStatus({ type: '', message: '' })
  }

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setForm(initialForm)
    setFieldErrors({})
    setStatus({ type: '', message: '' })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setStatus({ type: '', message: '' })
    setFieldErrors({})

    try {
      const payload = isRegistering ? form : { email: form.email, password: form.password }
      const result = await submitAuth(isRegistering ? 'register' : 'login', payload)
      const nextSession = { token: result.token, user: result.user }
      localStorage.setItem('livestockAuthToken', result.token)
      localStorage.setItem('livestockAuthUser', JSON.stringify(result.user))
      onAuthenticated(nextSession)
    } catch (error) {
      setFieldErrors(error.fields || {})
      setStatus({ type: 'error', message: error.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="brand-panel"><p className="eyebrow">Livestock Management System</p><h1>Grow your livestock business with confidence.</h1><p className="brand-copy">A secure space for farmers and customers to connect as your livestock journey grows.</p><div className="brand-mark" aria-hidden="true">LM</div></section>
      <section className="auth-panel" aria-labelledby="auth-title"><div className="auth-card">
        {onBack && <button className="back-home-button" type="button" onClick={onBack}>← Back to home</button>}
        <div className="mode-switch" role="tablist" aria-label="Authentication mode"><button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Sign in</button><button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')}>Create account</button></div>
        <div className="form-heading"><p className="eyebrow">Secure access</p><h2 id="auth-title">{isRegistering ? 'Join the community' : 'Welcome back'}</h2><p>{isRegistering ? 'Choose your account type to get started.' : 'Sign in to continue to your dashboard.'}</p></div>
        {status.message && <div className={`status ${status.type}`} role="alert">{status.message}</div>}
        <form onSubmit={handleSubmit} noValidate>
          {isRegistering && <label>Full name<input name="name" value={form.name} onChange={handleChange} autoComplete="name" placeholder="Your name" />{fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}</label>}
          <label>Email address<input type="email" name="email" value={form.email} onChange={handleChange} autoComplete="email" placeholder="you@example.com" />{fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}</label>
          <label>Password<input type="password" name="password" value={form.password} onChange={handleChange} autoComplete={isRegistering ? 'new-password' : 'current-password'} placeholder="At least 8 characters" />{fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}</label>
          {isRegistering && <fieldset><legend>Account type</legend><div className="role-options"><label className="role-option"><input type="radio" name="role" value="farmer" checked={form.role === 'farmer'} onChange={handleChange} /><span><strong>Farmer</strong><small>Manage your farm profile</small></span></label><label className="role-option"><input type="radio" name="role" value="customer" checked={form.role === 'customer'} onChange={handleChange} /><span><strong>Customer</strong><small>Discover trusted producers</small></span></label></div>{fieldErrors.role && <span className="field-error">{fieldErrors.role}</span>}</fieldset>}
          <button className="submit-button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Please wait…' : isRegistering ? 'Create account' : 'Sign in'}</button>
        </form>
        <p className="switch-prompt">{isRegistering ? 'Already have an account?' : 'New to the platform?'}{' '}<button type="button" onClick={() => switchMode(isRegistering ? 'login' : 'register')}>{isRegistering ? 'Sign in' : 'Create an account'}</button></p>
      </div></section>
    </main>
  )
}

function readSession() {
  try {
    const token = localStorage.getItem('livestockAuthToken')
    const user = JSON.parse(localStorage.getItem('livestockAuthUser') || 'null')
    return token && user ? { token, user } : null
  } catch {
    return null
  }
}

export default App
