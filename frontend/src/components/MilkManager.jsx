import { useCallback, useEffect, useState } from 'react'
import { fetchAnimals } from '../api/animals'
import { createMilkRecord, deleteMilkRecord, fetchMilkRecords, fetchMilkSummary, updateMilkRecord } from '../api/milk'

const today = new Date().toISOString().slice(0, 10)
const initialFilters = { search: '', dateFrom: '', dateTo: '', session: '' }
const emptySummary = { todayLiters: 0, weekLiters: 0, todayCowLiters: 0, todayGoatLiters: 0, weekCowLiters: 0, weekGoatLiters: 0, recordCount: 0, byAnimal: [] }
const emptyForm = { animal: '', date: today, session: 'morning', quantityLiters: '', notes: '' }

function MilkManager({ token, onLogout }) {
  const [animals, setAnimals] = useState([])
  const [records, setRecords] = useState([])
  const [summary, setSummary] = useState(emptySummary)
  const [filters, setFilters] = useState(initialFilters)
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [loadState, setLoadState] = useState('loading')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const loadData = useCallback(() => {
    Promise.all([fetchAnimals(token, { search: '', species: '', sex: '', sort: 'tagId' }), fetchMilkRecords(token, filters), fetchMilkSummary(token)])
      .then(([animalData, recordData, summaryData]) => {
        setAnimals(animalData.animals)
        setRecords(recordData.records)
        setSummary(summaryData.summary)
        setLoadState('ready')
      })
      .catch((requestError) => {
        setError(requestError.message)
        setLoadState('error')
        if (requestError.status === 401 || requestError.status === 403) onLogout()
      })
  }, [filters, onLogout, token])

  useEffect(() => { loadData() }, [loadData])

  const startCreate = () => { setEditing(null); setForm({ ...emptyForm, animal: animals[0]?._id || '' }); setFieldErrors({}); setError(''); setShowForm(true) }
  const startEdit = (record) => { setEditing(record); setForm({ animal: record.animal?._id || record.animal, date: record.date.slice(0, 10), session: record.session, quantityLiters: record.quantityLiters, notes: record.notes || '' }); setFieldErrors({}); setError(''); setShowForm(true) }
  const change = (event) => { const { name, value } = event.target; setForm((current) => ({ ...current, [name]: value })); setFieldErrors((current) => ({ ...current, [name]: '' })) }

  const save = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!form.animal) nextErrors.animal = 'Select an animal.'
    if (!form.date) nextErrors.date = 'Date is required.'
    if (!form.quantityLiters || Number(form.quantityLiters) <= 0) nextErrors.quantityLiters = 'Enter a quantity greater than zero.'
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setIsSaving(true); setError('')
    try {
      const result = editing ? await updateMilkRecord(token, editing._id, { ...form, quantityLiters: Number(form.quantityLiters) }) : await createMilkRecord(token, { ...form, quantityLiters: Number(form.quantityLiters) })
      setNotice(result.message); setShowForm(false); setEditing(null); loadData()
    } catch (requestError) { setFieldErrors(requestError.fields || {}); setError(requestError.message) } finally { setIsSaving(false) }
  }

  const remove = async (record) => {
    if (!window.confirm('Delete this milk record? This cannot be undone.')) return
    try { const result = await deleteMilkRecord(token, record._id); setNotice(result.message); loadData() } catch (requestError) { setError(requestError.message) }
  }

  if (showForm) return <section className="milk-page"><form className="milk-form" onSubmit={save} noValidate><div className="form-heading"><p className="eyebrow dashboard-eyebrow">Milk records</p><h2>{editing ? 'Edit milk record' : 'Add milk record'}</h2><p>Record a single milking session for one of your animals.</p></div><label>Animal<select name="animal" value={form.animal} onChange={change}><option value="">Select an animal</option>{animals.map((animal) => <option key={animal._id} value={animal._id}>{animal.name || 'Unnamed'} · {animal.tagId}</option>)}</select>{fieldErrors.animal && <span className="field-error">{fieldErrors.animal}</span>}</label><div className="form-two-column"><label>Date<input type="date" name="date" value={form.date} max={today} onChange={change} />{fieldErrors.date && <span className="field-error">{fieldErrors.date}</span>}</label><label>Session<select name="session" value={form.session} onChange={change}><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option></select>{fieldErrors.session && <span className="field-error">{fieldErrors.session}</span>}</label></div><label>Milk quantity (litres)<input type="number" name="quantityLiters" min="0.01" step="0.01" value={form.quantityLiters} onChange={change} placeholder="e.g. 4.5" />{fieldErrors.quantityLiters && <span className="field-error">{fieldErrors.quantityLiters}</span>}</label><label>Notes <span className="optional">(optional)</span><textarea name="notes" rows="3" value={form.notes} onChange={change} placeholder="Add any useful notes…" />{fieldErrors.notes && <span className="field-error">{fieldErrors.notes}</span>}</label>{error && <div className="dashboard-error" role="alert">{error}</div>}<div className="form-actions"><button type="button" className="secondary-button" onClick={() => { setShowForm(false); setEditing(null) }}>Cancel</button><button type="submit" className="submit-button" disabled={isSaving}>{isSaving ? 'Saving…' : editing ? 'Save changes' : 'Add record'}</button></div></form></section>

  return <section className="milk-page"><div className="animal-page-heading"><div><p className="eyebrow dashboard-eyebrow">Production records</p><h2>Milk records</h2><p>Track daily production across your herd.</p></div><button className="add-animal-button" type="button" onClick={startCreate}>+ <span>Add record</span></button></div>{notice && <div className="dashboard-notice" role="status">{notice}</div>}{error && <div className="dashboard-error" role="alert">{error}</div>}
    <div className="milk-summary-grid"><SummaryCard label="Total milk today" value={`${summary.todayLiters.toFixed(2)} L`} /><SummaryCard label="Cow milk today" value={`${summary.todayCowLiters.toFixed(2)} L`} meta={`This week: ${summary.weekCowLiters.toFixed(2)} L`} accent="cow" /><SummaryCard label="Goat milk today" value={`${summary.todayGoatLiters.toFixed(2)} L`} meta={`This week: ${summary.weekGoatLiters.toFixed(2)} L`} accent="goat" /><SummaryCard label="Total records" value={summary.recordCount} /><SummaryCard label="Animals producing" value={summary.byAnimal.length} /></div>
    <div className="milk-filters"><input aria-label="Search milk records" placeholder="Search animal ID or name…" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /><label>From<input type="date" value={filters.dateFrom} onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })} /></label><label>To<input type="date" value={filters.dateTo} onChange={(event) => setFilters({ ...filters, dateTo: event.target.value })} /></label><select aria-label="Filter by session" value={filters.session} onChange={(event) => setFilters({ ...filters, session: event.target.value })}><option value="">All sessions</option><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option></select></div>
    {loadState === 'loading' ? <div className="animal-state">Loading milk records…</div> : records.length === 0 ? <div className="animal-state empty-animal"><span className="empty-icon">⌁</span><h3>No milk records yet</h3><p>{filters.search || filters.dateFrom || filters.dateTo || filters.session ? 'Try clearing your filters.' : 'Add your first session to start tracking production.'}</p><button className="secondary-button" type="button" onClick={startCreate} disabled={animals.length === 0}>{animals.length ? 'Add your first record' : 'Add an animal first'}</button></div> : <div className="animal-table-wrap"><table><thead><tr><th>Animal</th><th>Type</th><th>Date</th><th>Session</th><th>Quantity</th><th aria-label="Actions" /></tr></thead><tbody>{records.map((record) => <tr key={record._id}><td><strong>{record.animal?.name || 'Unnamed animal'}</strong><small>{record.animal?.tagId || 'Unknown animal'}</small></td><td><span className="table-pill">{record.animal?.species || '—'}</span></td><td>{new Date(record.date).toLocaleDateString()}</td><td><span className={`session-pill ${record.session}`}>{record.session}</span></td><td><strong>{record.quantityLiters.toFixed(2)} L</strong></td><td><button className="table-action" type="button" onClick={() => startEdit(record)}>Edit</button><button className="table-delete" type="button" onClick={() => remove(record)}>Delete</button></td></tr>)}</tbody></table></div>}
  </section>
}

function SummaryCard({ label, value, meta, accent = 'default' }) { return <article className={`milk-summary-card ${accent}`}><span className="milk-summary-mark">◒</span><div><p>{label}</p><strong>{value}</strong>{meta && <small>{meta}</small>}</div></article> }

export default MilkManager
