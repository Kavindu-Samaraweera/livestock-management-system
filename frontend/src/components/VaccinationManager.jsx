import { useCallback, useEffect, useState } from 'react'
import { fetchAnimals } from '../api/animals'
import { createVaccination, deleteVaccination, fetchVaccinations, fetchVaccinationSummary, updateVaccination } from '../api/vaccinations'

const today = new Date().toISOString().slice(0, 10)
const initialFilters = { search: '', dateFrom: '', dateTo: '' }
const emptySummary = { total: 0, dueToday: 0, upcoming: 0, overdue: 0, reminders: [] }
const emptyForm = { animal: '', vaccineName: '', vaccinationDate: today, nextDueDate: '', dose: '', administeredBy: '', notes: '' }

function VaccinationManager({ token, onLogout }) {
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
    Promise.all([
      fetchAnimals(token, { search: '', species: '', sex: '', sort: 'tagId' }),
      fetchVaccinations(token, filters),
      fetchVaccinationSummary(token)
    ]).then(([animalData, recordData, summaryData]) => {
      setAnimals(animalData.animals)
      setRecords(recordData.records)
      setSummary(summaryData.summary)
      setLoadState('ready')
    }).catch((requestError) => {
      setError(requestError.message)
      setLoadState('error')
      if (requestError.status === 401 || requestError.status === 403) onLogout()
    })
  }, [filters, onLogout, token])

  useEffect(() => { loadData() }, [loadData])

  const startCreate = () => { setEditing(null); setForm({ ...emptyForm, animal: animals[0]?._id || '' }); setFieldErrors({}); setError(''); setShowForm(true) }
  const startEdit = (record) => { setEditing(record); setForm({ animal: record.animal?._id || record.animal, vaccineName: record.vaccineName, vaccinationDate: record.vaccinationDate.slice(0, 10), nextDueDate: record.nextDueDate ? record.nextDueDate.slice(0, 10) : '', dose: record.dose || '', administeredBy: record.administeredBy || '', notes: record.notes || '' }); setFieldErrors({}); setError(''); setShowForm(true) }
  const change = (event) => { const { name, value } = event.target; setForm((current) => ({ ...current, [name]: value })); setFieldErrors((current) => ({ ...current, [name]: '' })) }

  const save = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!form.animal) nextErrors.animal = 'Select an animal.'
    if (!form.vaccineName.trim()) nextErrors.vaccineName = 'Vaccine name is required.'
    if (!form.vaccinationDate) nextErrors.vaccinationDate = 'Vaccination date is required.'
    if (form.nextDueDate && form.vaccinationDate && form.nextDueDate < form.vaccinationDate) nextErrors.nextDueDate = 'Next due date cannot be before vaccination date.'
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setIsSaving(true); setError('')
    try {
      const result = editing ? await updateVaccination(token, editing._id, form) : await createVaccination(token, form)
      setNotice(result.message); setShowForm(false); setEditing(null); loadData()
    } catch (requestError) { setFieldErrors(requestError.fields || {}); setError(requestError.message) } finally { setIsSaving(false) }
  }

  const remove = async (record) => {
    if (!window.confirm(`Delete ${record.vaccineName} vaccination? This cannot be undone.`)) return
    try { const result = await deleteVaccination(token, record._id); setNotice(result.message); loadData() } catch (requestError) { setError(requestError.message) }
  }

  if (showForm) return <section className="vaccination-page"><form className="vaccination-form" onSubmit={save} noValidate><div className="form-heading"><p className="eyebrow dashboard-eyebrow">Vaccination records</p><h2>{editing ? 'Edit vaccination' : 'Add vaccination'}</h2><p>Keep your herd’s preventive care schedule up to date.</p></div><label>Animal<select name="animal" value={form.animal} onChange={change}><option value="">Select an animal</option>{animals.map((animal) => <option key={animal._id} value={animal._id}>{animal.name || 'Unnamed'} · {animal.tagId}</option>)}</select>{fieldErrors.animal && <span className="field-error">{fieldErrors.animal}</span>}</label><label>Vaccine name<input name="vaccineName" value={form.vaccineName} onChange={change} placeholder="e.g. Foot and mouth" />{fieldErrors.vaccineName && <span className="field-error">{fieldErrors.vaccineName}</span>}</label><div className="form-two-column"><label>Vaccination date<input type="date" name="vaccinationDate" value={form.vaccinationDate} max={today} onChange={change} />{fieldErrors.vaccinationDate && <span className="field-error">{fieldErrors.vaccinationDate}</span>}</label><label>Next due date <span className="optional">(optional)</span><input type="date" name="nextDueDate" value={form.nextDueDate} min={form.vaccinationDate} onChange={change} />{fieldErrors.nextDueDate && <span className="field-error">{fieldErrors.nextDueDate}</span>}</label></div><div className="form-two-column"><label>Dose <span className="optional">(optional)</span><input name="dose" value={form.dose} onChange={change} placeholder="e.g. 2 ml" />{fieldErrors.dose && <span className="field-error">{fieldErrors.dose}</span>}</label><label>Administered by <span className="optional">(optional)</span><input name="administeredBy" value={form.administeredBy} onChange={change} placeholder="e.g. Dr. Perera" />{fieldErrors.administeredBy && <span className="field-error">{fieldErrors.administeredBy}</span>}</label></div><label>Notes <span className="optional">(optional)</span><textarea name="notes" rows="3" value={form.notes} onChange={change} placeholder="Add useful notes…" />{fieldErrors.notes && <span className="field-error">{fieldErrors.notes}</span>}</label>{error && <div className="dashboard-error" role="alert">{error}</div>}<div className="form-actions"><button type="button" className="secondary-button" onClick={() => { setShowForm(false); setEditing(null) }}>Cancel</button><button type="submit" className="submit-button" disabled={isSaving}>{isSaving ? 'Saving…' : editing ? 'Save changes' : 'Add vaccination'}</button></div></form></section>

  return <section className="vaccination-page"><div className="animal-page-heading"><div><p className="eyebrow dashboard-eyebrow">Preventive care</p><h2>Vaccinations</h2><p>Track vaccinations and upcoming care for your herd.</p></div><button className="add-animal-button" type="button" onClick={startCreate}>+ <span>Add vaccination</span></button></div>{notice && <div className="dashboard-notice" role="status">{notice}</div>}{error && <div className="dashboard-error" role="alert">{error}</div>}<div className="vaccination-summary-grid"><SummaryCard label="Total records" value={summary.total} /><SummaryCard label="Due today" value={summary.dueToday} accent="due" /><SummaryCard label="Upcoming" value={summary.upcoming} accent="upcoming" /><SummaryCard label="Overdue" value={summary.overdue} accent="overdue" /></div>{summary.reminders.length > 0 && <div className="vaccination-reminder" role="status"><strong>Vaccination reminder</strong><span>{summary.reminders.map((record) => `${record.vaccineName} for ${record.animal?.name || record.animal?.tagId || 'your animal'} is due on ${new Date(record.nextDueDate).toLocaleDateString()}.`).join(' ')}</span></div>}<div className="vaccination-filters"><input aria-label="Search vaccinations" placeholder="Search animal or vaccine…" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /><label>From<input type="date" value={filters.dateFrom} onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })} /></label><label>To<input type="date" value={filters.dateTo} onChange={(event) => setFilters({ ...filters, dateTo: event.target.value })} /></label></div>{loadState === 'loading' ? <div className="animal-state">Loading vaccination records…</div> : records.length === 0 ? <div className="animal-state empty-animal"><span className="empty-icon">✚</span><h3>No vaccination records yet</h3><p>{filters.search || filters.dateFrom || filters.dateTo ? 'Try clearing your filters.' : 'Add your first vaccination to start tracking herd care.'}</p><button className="secondary-button" type="button" onClick={startCreate} disabled={animals.length === 0}>{animals.length ? 'Add your first record' : 'Add an animal first'}</button></div> : <div className="animal-table-wrap"><table><thead><tr><th>Animal</th><th>Vaccine</th><th>Vaccinated</th><th>Next due</th><th>Status</th><th aria-label="Actions" /></tr></thead><tbody>{records.map((record) => <tr key={record._id}><td><strong>{record.animal?.name || 'Unnamed animal'}</strong><small>{record.animal?.tagId || 'Unknown animal'}</small></td><td>{record.vaccineName}</td><td>{new Date(record.vaccinationDate).toLocaleDateString()}</td><td>{record.nextDueDate ? new Date(record.nextDueDate).toLocaleDateString() : '—'}</td><td><span className={`vaccination-status ${record.status}`}>{record.status === 'due-today' ? 'Due today' : record.status === 'no-due-date' ? 'No due date' : record.status}</span></td><td><button className="table-action" type="button" onClick={() => startEdit(record)}>Edit</button><button className="table-delete" type="button" onClick={() => remove(record)}>Delete</button></td></tr>)}</tbody></table></div>}</section>
}

function SummaryCard({ label, value, accent = '' }) { return <article className={`vaccination-summary-card ${accent}`}><span className="milk-summary-mark">✚</span><div><p>{label}</p><strong>{value}</strong></div></article> }

export default VaccinationManager
