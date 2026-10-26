import { useCallback, useEffect, useState } from 'react'
import { fetchAnimals } from '../api/animals'
import { createWeightRecord, deleteWeightRecord, fetchWeightHistory, fetchWeightRecords, updateWeightRecord } from '../api/weights'

const today = new Date().toISOString().slice(0, 10)
const initialFilters = { search: '', animal: '', dateFrom: '', dateTo: '' }
const emptyForm = { animal: '', measurementDate: today, weightKg: '', notes: '' }

function WeightManager({ token, onLogout }) {
  const [animals, setAnimals] = useState([])
  const [records, setRecords] = useState([])
  const [histories, setHistories] = useState([])
  const [filters, setFilters] = useState(initialFilters)
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [focusedAnimal, setFocusedAnimal] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loadState, setLoadState] = useState('loading')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const loadData = useCallback(async () => {
    try {
      const [animalData, recordData] = await Promise.all([
        fetchAnimals(token, { search: '', species: '', sex: '', sort: 'tagId' }),
        fetchWeightRecords(token, filters)
      ])
      const historyData = await Promise.all(animalData.animals.map((animal) => fetchWeightHistory(token, animal._id)))
      setAnimals(animalData.animals)
      setRecords(recordData.records)
      setHistories(historyData)
      setLoadState('ready')
    } catch (requestError) {
      setError(requestError.message)
      setLoadState('error')
      if (requestError.status === 401 || requestError.status === 403) onLogout()
    }
  }, [filters, onLogout, token])

  useEffect(() => {
    const refreshId = window.setTimeout(() => { loadData() }, 0)
    return () => window.clearTimeout(refreshId)
  }, [loadData])

  const startCreate = () => { setEditing(null); setForm({ ...emptyForm, animal: animals[0]?._id || '' }); setFieldErrors({}); setError(''); setShowForm(true) }
  const startEdit = (record) => { setEditing(record); setForm({ animal: record.animal?._id || record.animal, measurementDate: record.measurementDate.slice(0, 10), weightKg: record.weightKg, notes: record.notes || '' }); setFieldErrors({}); setError(''); setShowForm(true) }
  const change = (event) => { const { name, value } = event.target; setForm((current) => ({ ...current, [name]: value })); setFieldErrors((current) => ({ ...current, [name]: '' })) }

  const save = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!form.animal) nextErrors.animal = 'Select an animal.'
    if (!form.measurementDate) nextErrors.measurementDate = 'Measurement date is required.'
    if (!form.weightKg || Number(form.weightKg) <= 0) nextErrors.weightKg = 'Enter a weight greater than zero.'
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setIsSaving(true); setError('')
    try {
      const payload = { ...form, weightKg: Number(form.weightKg) }
      const result = editing ? await updateWeightRecord(token, editing._id, payload) : await createWeightRecord(token, payload)
      setNotice(result.message); setShowForm(false); setEditing(null); loadData()
    } catch (requestError) { setFieldErrors(requestError.fields || {}); setError(requestError.message) } finally { setIsSaving(false) }
  }

  const remove = async (record) => {
    if (!window.confirm('Delete this weight record? This cannot be undone.')) return
    try { const result = await deleteWeightRecord(token, record._id); setNotice(result.message); loadData() } catch (requestError) { setError(requestError.message) }
  }

  if (showForm) return <section className="weight-page"><form className="weight-form" onSubmit={save} noValidate><div className="form-heading"><p className="eyebrow dashboard-eyebrow">Weight records</p><h2>{editing ? 'Edit weight record' : 'Add weight record'}</h2><p>Record a measured weight for one of your animals.</p></div><label>Animal<select name="animal" value={form.animal} onChange={change}><option value="">Select an animal</option>{animals.map((animal) => <option key={animal._id} value={animal._id}>{animal.name || 'Unnamed'} · {animal.tagId}</option>)}</select>{fieldErrors.animal && <span className="field-error">{fieldErrors.animal}</span>}</label><div className="form-two-column"><label>Measurement date<input type="date" name="measurementDate" value={form.measurementDate} max={today} onChange={change} />{fieldErrors.measurementDate && <span className="field-error">{fieldErrors.measurementDate}</span>}</label><label>Weight (kg)<input type="number" name="weightKg" value={form.weightKg} min="0.01" step="0.01" onChange={change} placeholder="e.g. 48.5" />{fieldErrors.weightKg && <span className="field-error">{fieldErrors.weightKg}</span>}</label></div><label>Notes <span className="optional">(optional)</span><textarea name="notes" rows="3" value={form.notes} onChange={change} placeholder="Add useful notes…" />{fieldErrors.notes && <span className="field-error">{fieldErrors.notes}</span>}</label>{error && <div className="dashboard-error" role="alert">{error}</div>}<div className="form-actions"><button type="button" className="secondary-button" onClick={() => { setShowForm(false); setEditing(null) }}>Cancel</button><button type="submit" className="submit-button" disabled={isSaving}>{isSaving ? 'Saving…' : editing ? 'Save changes' : 'Add weight'}</button></div></form></section>

  const visibleHistories = focusedAnimal ? histories.filter((item) => item.animal._id === focusedAnimal) : histories
  return <section className="weight-page"><div className="animal-page-heading"><div><p className="eyebrow dashboard-eyebrow">Growth tracking</p><h2>Weight records</h2><p>Track measured growth for every animal in your herd.</p></div><button className="add-animal-button" type="button" onClick={startCreate}>+ <span>Add weight</span></button></div>{notice && <div className="dashboard-notice" role="status">{notice}</div>}{error && <div className="dashboard-error" role="alert">{error}</div>}<div className="weight-filters"><input aria-label="Search weight records" placeholder="Search animal ID or name…" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /><select aria-label="Filter by animal" value={filters.animal} onChange={(event) => setFilters({ ...filters, animal: event.target.value })}><option value="">All animals</option>{animals.map((animal) => <option key={animal._id} value={animal._id}>{animal.name || 'Unnamed'} · {animal.tagId}</option>)}</select><label>From<input type="date" value={filters.dateFrom} onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })} /></label><label>To<input type="date" value={filters.dateTo} onChange={(event) => setFilters({ ...filters, dateTo: event.target.value })} /></label></div>{loadState === 'loading' ? <div className="animal-state">Loading weight records…</div> : records.length === 0 ? <div className="animal-state empty-animal"><span className="empty-icon">↗</span><h3>No weight records yet</h3><p>{filters.search || filters.animal || filters.dateFrom || filters.dateTo ? 'Try clearing your filters.' : 'Add measured weights to see growth over time.'}</p><button className="secondary-button" type="button" onClick={startCreate} disabled={animals.length === 0}>{animals.length ? 'Add your first weight' : 'Add an animal first'}</button></div> : <div className="animal-table-wrap"><table><thead><tr><th>Animal</th><th>Date</th><th>Weight</th><th>Actions</th></tr></thead><tbody>{records.map((record) => <tr key={record._id}><td><strong>{record.animal?.name || 'Unnamed animal'}</strong><small>{record.animal?.tagId || 'Unknown animal'}</small></td><td>{new Date(record.measurementDate).toLocaleDateString()}</td><td><strong>{record.weightKg.toFixed(2)} kg</strong></td><td><button className="table-action" type="button" onClick={() => { setFocusedAnimal(record.animal?._id || ''); document.getElementById('weight-history')?.scrollIntoView({ behavior: 'smooth' }) }}>View history</button><button className="table-action" type="button" onClick={() => startEdit(record)}>Edit</button><button className="table-delete" type="button" onClick={() => remove(record)}>Delete</button></td></tr>)}</tbody></table></div>}<section id="weight-history" className="weight-history"><div className="panel-heading"><div><p className="panel-kicker">Growth history</p><h2>Measured weight by animal</h2></div><div className="weight-history-actions">{focusedAnimal && <button className="quiet-button" type="button" onClick={() => setFocusedAnimal('')}>Show all animals</button>}<span className="panel-period">Initial animal weight is not included</span></div></div>{visibleHistories.length === 0 ? <div className="animal-state">No animals available for weight history.</div> : <div className="weight-history-grid">{visibleHistories.map((item) => <HistoryCard key={item.animal._id} item={item} />)}</div>}</section></section>
}

function HistoryCard({ item }) {
  const { animal, records, summary } = item
  const latest = summary.latest?.weightKg
  const previous = summary.previous?.weightKg
  const difference = summary.differenceKg
  return <article className="weight-history-card"><div className="weight-history-heading"><div><p className="panel-kicker">{animal.species}</p><h3>{animal.name || animal.tagId}</h3><small>{animal.tagId}</small></div>{latest !== undefined && <strong>{latest.toFixed(2)} kg</strong>}</div>{summary.meaningfulChart ? <WeightChart records={records} /> : <div className="chart-empty">Add a second measurement to see a growth chart.</div>}<div className="weight-stats"><span><small>Latest</small><strong>{latest === undefined ? '—' : `${latest.toFixed(2)} kg`}</strong></span><span><small>Previous</small><strong>{previous === undefined ? '—' : `${previous.toFixed(2)} kg`}</strong></span><span><small>Change</small><strong className={difference > 0 ? 'positive-change' : difference < 0 ? 'negative-change' : ''}>{difference === null ? '—' : `${difference >= 0 ? '+' : ''}${difference.toFixed(2)} kg`}</strong></span><span><small>Change %</small><strong>{summary.percentageChange === null ? '—' : `${summary.percentageChange >= 0 ? '+' : ''}${summary.percentageChange.toFixed(1)}%`}</strong></span></div></article>
}

function WeightChart({ records }) {
  const width = 520; const height = 170; const padding = 24; const values = records.map((record) => record.weightKg); const min = Math.min(...values); const max = Math.max(...values); const range = max - min || 1
  const points = records.map((record, index) => { const x = padding + (index * (width - padding * 2)) / Math.max(records.length - 1, 1); const y = height - padding - ((record.weightKg - min) / range) * (height - padding * 2); return `${x},${y}` })
  return <svg className="weight-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Weight history line chart"><line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="chart-axis" /><polyline points={points.join(' ')} className="chart-line" />{points.map((point, index) => { const [x, y] = point.split(','); return <circle key={point} cx={x} cy={y} r="4" className="chart-point"><title>{`${records[index].weightKg.toFixed(2)} kg on ${new Date(records[index].measurementDate).toLocaleDateString()}`}</title></circle> })}</svg>
}

export default WeightManager
