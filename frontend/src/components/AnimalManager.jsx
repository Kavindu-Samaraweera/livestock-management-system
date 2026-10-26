import { useCallback, useEffect, useState } from 'react'
import AnimalForm from './AnimalForm'
import { createAnimal, deleteAnimal, fetchAnimal, fetchAnimals, updateAnimal } from '../api/animals'

const initialFilters = { search: '', species: '', sex: '', sort: '-createdAt' }

function AnimalManager({ token, onChanged, onLogout }) {
  const [animals, setAnimals] = useState([])
  const [filters, setFilters] = useState(initialFilters)
  const [loadState, setLoadState] = useState('loading')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [selected, setSelected] = useState(null)
  const [serverErrors, setServerErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)

  const loadAnimals = useCallback(() => {
    fetchAnimals(token, filters).then((data) => { setAnimals(data.animals); setLoadState('ready') }).catch((requestError) => {
      setError(requestError.message); setLoadState('error'); if (requestError.status === 401 || requestError.status === 403) onLogout()
    })
  }, [filters, onLogout, token])

  useEffect(() => { loadAnimals() }, [loadAnimals])

  const save = async (payload) => {
    setIsSaving(true); setServerErrors({}); setError('')
    try {
      const result = editing ? await updateAnimal(token, editing._id, payload) : await createAnimal(token, payload)
      setNotice(result.message); setShowForm(false); setEditing(null); setSelected(null); loadAnimals(); onChanged()
    } catch (requestError) { setServerErrors(requestError.fields || {}); setError(requestError.message) } finally { setIsSaving(false) }
  }

  const remove = async (animal) => {
    if (!window.confirm(`Delete ${animal.name || animal.tagId}? This cannot be undone.`)) return
    try { const result = await deleteAnimal(token, animal._id); setNotice(result.message); setSelected(null); loadAnimals(); onChanged() } catch (requestError) { setError(requestError.message) }
  }

  const viewDetails = async (animal) => {
    try { const result = await fetchAnimal(token, animal._id); setSelected(result.animal) } catch (requestError) { setError(requestError.message) }
  }

  if (showForm) return <section className="animal-page"><AnimalForm key={editing?._id || 'new'} animal={editing} onSubmit={save} onCancel={() => { setShowForm(false); setEditing(null) }} isSaving={isSaving} serverErrors={serverErrors} /></section>

  return <section className="animal-page">
    <div className="animal-page-heading"><div><p className="eyebrow dashboard-eyebrow">Farm records</p><h2>My animals</h2><p>Search and manage the animals belonging to your farm.</p></div><button className="add-animal-button" type="button" onClick={() => { setNotice(''); setShowForm(true) }}>+ <span>Add Animal</span></button></div>
    {notice && <div className="dashboard-notice" role="status">{notice}</div>}
    {error && <div className="dashboard-error" role="alert">{error}</div>}
    <div className="animal-filters"><input aria-label="Search animals" placeholder="Search ID or name…" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /><select aria-label="Filter by type" value={filters.species} onChange={(event) => setFilters({ ...filters, species: event.target.value })}><option value="">All types</option><option value="cow">Cows</option><option value="goat">Goats</option></select><select aria-label="Filter by sex" value={filters.sex} onChange={(event) => setFilters({ ...filters, sex: event.target.value })}><option value="">All sexes</option><option value="female">Female</option><option value="male">Male</option></select><select aria-label="Sort animals" value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value })}><option value="-createdAt">Newest first</option><option value="tagId">Animal ID</option><option value="name">Name</option><option value="dateOfBirth">Date of birth</option><option value="initialWeightKg">Weight</option></select></div>
    {loadState === 'loading' ? <div className="animal-state">Loading animal records…</div> : animals.length === 0 ? <div className="animal-state empty-animal"><span className="empty-icon">⌁</span><h3>No animals found</h3><p>{filters.search || filters.species || filters.sex ? 'Try clearing your filters or search.' : 'Add your first animal to begin your farm records.'}</p><button className="secondary-button" type="button" onClick={() => setShowForm(true)}>Add your first animal</button></div> : <div className="animal-table-wrap"><table><thead><tr><th>Animal</th><th>Type</th><th>Sex</th><th>Breed</th><th>Weight</th><th aria-label="Actions" /></tr></thead><tbody>{animals.map((animal) => <tr key={animal._id} onClick={() => viewDetails(animal)}><td><strong>{animal.name || 'Unnamed animal'}</strong><small>{animal.tagId}</small></td><td><span className="table-pill">{animal.species}</span></td><td>{animal.sex}</td><td>{animal.breed}</td><td>{animal.initialWeightKg} kg</td><td><button className="table-action" type="button" onClick={(event) => { event.stopPropagation(); setEditing(animal); setShowForm(true) }}>Edit</button><button className="table-delete" type="button" onClick={(event) => { event.stopPropagation(); remove(animal) }}>Delete</button></td></tr>)}</tbody></table></div>}
    {selected && <div className="animal-detail"><div><p className="panel-kicker">Animal details</p><h3>{selected.name || selected.tagId}</h3><p>{selected.breed} · {selected.species} · {selected.sex}</p></div><div className="detail-grid"><span><small>Tag ID</small><strong>{selected.tagId}</strong></span><span><small>Born</small><strong>{new Date(selected.dateOfBirth).toLocaleDateString()}</strong></span><span><small>Initial weight</small><strong>{selected.initialWeightKg} kg</strong></span></div><div className="detail-actions"><button className="secondary-button" type="button" onClick={() => { setEditing(selected); setShowForm(true) }}>Edit animal</button><button className="table-delete" type="button" onClick={() => remove(selected)}>Delete</button><button className="quiet-button" type="button" onClick={() => setSelected(null)}>Close</button></div></div>}
  </section>
}

export default AnimalManager
