import { useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

function SettingsManager({ user, token, onUserUpdated }) {
  const [form, setForm] = useState({ name: user.name, email: user.email, currentPassword: '', newPassword: '' })
  const [state, setState] = useState({ saving: false, error: '', success: '', fields: {} })

  const change = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setState((current) => ({ ...current, error: '', success: '', fields: { ...current.fields, [name]: '' } }))
  }

  const save = async (event) => {
    event.preventDefault()
    setState({ saving: true, error: '', success: '', fields: {} })
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const error = new Error(data.message || 'Unable to save profile settings.')
        error.fields = data.errors || {}
        throw error
      }
      onUserUpdated(data.user)
      setForm((current) => ({ ...current, currentPassword: '', newPassword: '' }))
      setState({ saving: false, error: '', success: data.message, fields: {} })
    } catch (error) {
      setState({ saving: false, error: error.message, success: '', fields: error.fields || {} })
    }
  }

  return (
    <section className="settings-page">
      <div className="page-heading">
        <div><p className="eyebrow dashboard-eyebrow">Account preferences</p><h2>Settings</h2><p>Manage your profile details and account password.</p></div>
      </div>
      <form className="settings-form" onSubmit={save} noValidate>
        <div className="settings-section"><h3>Profile settings</h3><p>These details are shown in your account area.</p>
          <label>Full name<input name="name" value={form.name} onChange={change} autoComplete="name" />{state.fields.name && <span className="field-error">{state.fields.name}</span>}</label>
          <label>Email address<input type="email" name="email" value={form.email} onChange={change} autoComplete="email" />{state.fields.email && <span className="field-error">{state.fields.email}</span>}</label>
        </div>
        <div className="settings-section"><h3>Change password</h3><p>Leave these fields blank if you do not want to change your password.</p>
          <label>Current password<input type="password" name="currentPassword" value={form.currentPassword} onChange={change} autoComplete="current-password" />{state.fields.currentPassword && <span className="field-error">{state.fields.currentPassword}</span>}</label>
          <label>New password<input type="password" name="newPassword" value={form.newPassword} onChange={change} autoComplete="new-password" placeholder="At least 8 characters" />{state.fields.newPassword && <span className="field-error">{state.fields.newPassword}</span>}</label>
        </div>
        {state.error && <div className="dashboard-error" role="alert">{state.error}</div>}
        {state.success && <div className="dashboard-notice" role="status">{state.success}</div>}
        <div className="form-actions"><button className="submit-button" type="submit" disabled={state.saving}>{state.saving ? 'Saving…' : 'Save settings'}</button></div>
      </form>
    </section>
  )
}

export default SettingsManager
