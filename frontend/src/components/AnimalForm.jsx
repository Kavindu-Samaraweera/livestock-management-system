import { useState } from 'react'

const blankAnimal = { species: 'goat', tagId: '', name: '', sex: 'female', dateOfBirth: '', breed: '', initialWeightKg: '', notes: '' }

function AnimalForm({ animal, onSubmit, onCancel, isSaving, serverErrors }) {
  const [form, setForm] = useState(animal ? toForm(animal) : blankAnimal)
  const [errors, setErrors] = useState({})

  const change = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
  }

  const submit = (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!form.tagId.trim()) nextErrors.tagId = 'Animal ID is required.'
    if (!form.breed.trim()) nextErrors.breed = 'Breed is required.'
    if (!form.dateOfBirth) nextErrors.dateOfBirth = 'Date of birth is required.'
    if (form.initialWeightKg === '' || Number(form.initialWeightKg) < 0) nextErrors.initialWeightKg = 'Enter a non-negative weight.'
    setErrors(nextErrors)
    if (!Object.keys(nextErrors).length) onSubmit({ ...form, initialWeightKg: Number(form.initialWeightKg) })
  }

  const fieldError = (name) => errors[name] || serverErrors[name]

  return <form className="animal-form" onSubmit={submit} noValidate>
    <div className="form-heading"><p className="eyebrow dashboard-eyebrow">Animal records</p><h2>{animal ? 'Edit animal' : 'Add an animal'}</h2><p>Keep a clear, private record for every animal on your farm.</p></div>
    <div className="form-two-column">
      <label>Animal type<select name="species" value={form.species} onChange={change}><option value="goat">Goat</option><option value="cow">Cow</option></select></label>
      <label>Sex<select name="sex" value={form.sex} onChange={change}><option value="female">Female</option><option value="male">Male</option></select></label>
    </div>
    <div className="form-two-column">
      <label>Animal ID / tag number<input name="tagId" value={form.tagId} onChange={change} placeholder="e.g. GOAT-001" />{fieldError('tagId') && <span className="field-error">{fieldError('tagId')}</span>}</label>
      <label>Name or nickname <span className="optional">(optional)</span><input name="name" value={form.name} onChange={change} placeholder="e.g. Daisy" />{fieldError('name') && <span className="field-error">{fieldError('name')}</span>}</label>
    </div>
    <div className="form-two-column">
      <label>Date of birth<input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={change} />{fieldError('dateOfBirth') && <span className="field-error">{fieldError('dateOfBirth')}</span>}</label>
      <label>Breed<input name="breed" value={form.breed} onChange={change} placeholder="e.g. Boer" />{fieldError('breed') && <span className="field-error">{fieldError('breed')}</span>}</label>
    </div>
    <label>Initial weight (kg)<input type="number" min="0" step="0.1" name="initialWeightKg" value={form.initialWeightKg} onChange={change} placeholder="e.g. 28.5" />{fieldError('initialWeightKg') && <span className="field-error">{fieldError('initialWeightKg')}</span>}</label>
    <label>Description or notes <span className="optional">(optional)</span><textarea name="notes" rows="3" value={form.notes} onChange={change} placeholder="Add any useful notes…" />{fieldError('notes') && <span className="field-error">{fieldError('notes')}</span>}</label>
    <div className="form-actions"><button type="button" className="secondary-button" onClick={onCancel}>Cancel</button><button type="submit" className="submit-button" disabled={isSaving}>{isSaving ? 'Saving…' : animal ? 'Save changes' : 'Add animal'}</button></div>
  </form>
}

function toForm(animal) {
  return { species: animal.species, tagId: animal.tagId, name: animal.name || '', sex: animal.sex, dateOfBirth: animal.dateOfBirth ? animal.dateOfBirth.slice(0, 10) : '', breed: animal.breed, initialWeightKg: animal.initialWeightKg, notes: animal.notes || '' }
}

export default AnimalForm
