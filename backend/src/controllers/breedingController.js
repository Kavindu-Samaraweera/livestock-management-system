const mongoose = require('mongoose');
const Animal = require('../models/Animal');
const BreedingRecord = require('../models/BreedingRecord');

const methods = new Set(['natural-mating', 'artificial-insemination']);
const statuses = new Set(['planned', 'mated', 'pregnancy-confirmed', 'delivered', 'unsuccessful']);
const postpartumStatuses = new Set(['not-applicable', 'monitoring', 'recovered', 'requires-attention']);
const outcomes = new Set(['live-birth', 'stillbirth', 'not-applicable']);
const animalFields = 'tagId name species sex';

const parseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dateOnly = (date) => date ? date.toISOString().slice(0, 10) : '';
const isValidId = (id) => mongoose.isValidObjectId(id);
const findOwnedAnimal = (id, farmerId, sex) => Animal.findOne({ _id: id, farmer: farmerId, ...(sex ? { sex } : {}) }).select(animalFields);

const validateRecord = (body) => {
  const errors = {};
  const matingDate = parseDate(body.matingDate);
  const confirmationDate = parseDate(body.pregnancyConfirmationDate);
  const expectedDate = parseDate(body.expectedDeliveryDate);
  const actualDate = parseDate(body.actualDeliveryDate);
  const method = String(body.breedingMethod || '').trim().toLowerCase();
  const pregnancyStatus = String(body.pregnancyStatus || '').trim().toLowerCase();
  const birthOutcome = String(body.birthOutcome || 'not-applicable').trim().toLowerCase();
  const postpartumStatus = String(body.postpartumStatus || 'not-applicable').trim().toLowerCase();
  const offspringCount = body.offspringCount === '' || body.offspringCount === undefined ? 0 : Number(body.offspringCount);

  if (!isValidId(body.mother)) errors.mother = 'Select a valid female mother.';
  if (body.father && !isValidId(body.father)) errors.father = 'Select a valid father.';
  if (!matingDate || matingDate > new Date()) errors.matingDate = 'Enter a valid mating date that is not in the future.';
  if (!methods.has(method)) errors.breedingMethod = 'Choose natural mating or artificial insemination.';
  if (!statuses.has(pregnancyStatus)) errors.pregnancyStatus = 'Choose a valid pregnancy status.';
  if (body.pregnancyConfirmationDate && !confirmationDate) errors.pregnancyConfirmationDate = 'Enter a valid confirmation date.';
  if (body.expectedDeliveryDate && !expectedDate) errors.expectedDeliveryDate = 'Enter a valid expected delivery date.';
  if (body.actualDeliveryDate && !actualDate) errors.actualDeliveryDate = 'Enter a valid actual delivery date.';
  if (!outcomes.has(birthOutcome)) errors.birthOutcome = 'Choose a valid birth outcome.';
  if (!postpartumStatuses.has(postpartumStatus)) errors.postpartumStatus = 'Choose a valid postpartum status.';
  if (!Number.isInteger(offspringCount) || offspringCount < 0) errors.offspringCount = 'Offspring count must be a non-negative whole number.';
  if (matingDate && confirmationDate && confirmationDate < matingDate) errors.pregnancyConfirmationDate = 'Confirmation cannot be before mating.';
  if (matingDate && expectedDate && expectedDate < matingDate) errors.expectedDeliveryDate = 'Expected delivery cannot be before mating.';
  if (matingDate && actualDate && actualDate < matingDate) errors.actualDeliveryDate = 'Actual delivery cannot be before mating.';
  if (confirmationDate && actualDate && actualDate < confirmationDate) errors.actualDeliveryDate = 'Actual delivery cannot be before pregnancy confirmation.';
  if (confirmationDate && confirmationDate > new Date()) errors.pregnancyConfirmationDate = 'Confirmation date cannot be in the future.';
  if (actualDate && actualDate > new Date()) errors.actualDeliveryDate = 'Actual delivery cannot be in the future.';
  if (pregnancyStatus === 'pregnancy-confirmed' && !confirmationDate) errors.pregnancyConfirmationDate = 'Confirmation date is required for a confirmed pregnancy.';
  if (pregnancyStatus === 'delivered' && (!actualDate || birthOutcome === 'not-applicable')) errors.actualDeliveryDate = 'Actual delivery date and birth outcome are required when delivered.';
  if (pregnancyStatus === 'delivered' && birthOutcome === 'live-birth' && offspringCount < 1) errors.offspringCount = 'Live birth requires at least one offspring.';
  if (pregnancyStatus !== 'delivered' && (actualDate || birthOutcome !== 'not-applicable')) errors.birthOutcome = 'Delivery details require Delivered status.';
  if (pregnancyStatus !== 'delivered' && postpartumStatus !== 'not-applicable') errors.postpartumStatus = 'Postpartum status applies after delivery.';
  if (body.notes && String(body.notes).trim().length > 1000) errors.notes = 'Notes must be 1000 characters or fewer.';

  return { errors, values: { mother: body.mother, father: body.father || null, matingDate, breedingMethod: method, pregnancyStatus, pregnancyConfirmationDate: confirmationDate, expectedDeliveryDate: expectedDate, actualDeliveryDate: actualDate, birthOutcome, offspringCount, postpartumStatus, notes: String(body.notes || '').trim() } };
};

const populateRecord = (query) => query.populate('mother', animalFields).populate('father', animalFields);

const listRecords = async (req, res, next) => {
  try {
    const { search = '', species, pregnancyStatus, dateFrom, dateTo } = req.query;
    const filter = { farmer: req.user.id };
    if (statuses.has(String(pregnancyStatus).toLowerCase())) filter.pregnancyStatus = String(pregnancyStatus).toLowerCase();
    if (dateFrom || dateTo) {
      filter.matingDate = {};
      const from = parseDate(dateFrom); const to = parseDate(dateTo);
      if (from) filter.matingDate.$gte = from;
      if (to) { to.setUTCDate(to.getUTCDate() + 1); filter.matingDate.$lt = to; }
    }
    const animalFilter = { farmer: req.user.id, ...(species && ['cow', 'goat'].includes(String(species).toLowerCase()) ? { species: String(species).toLowerCase() } : {}) };
    const searchText = String(search).trim();
    if (searchText) animalFilter.$or = [{ tagId: { $regex: searchText, $options: 'i' } }, { name: { $regex: searchText, $options: 'i' } }];
    if (searchText || species) {
      const animals = await Animal.find(animalFilter).select('_id');
      filter.$or = [{ mother: { $in: animals.map((animal) => animal._id) } }, { father: { $in: animals.map((animal) => animal._id) } }];
    }
    const records = await populateRecord(BreedingRecord.find(filter).sort({ matingDate: -1, createdAt: -1 })).lean();
    return res.status(200).json({ records });
  } catch (error) { return next(error); }
};

const getRecord = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ message: 'Breeding record not found.' });
    const record = await populateRecord(BreedingRecord.findOne({ _id: req.params.id, farmer: req.user.id })).lean();
    if (!record) return res.status(404).json({ message: 'Breeding record not found.' });
    return res.status(200).json({ record });
  } catch (error) { return next(error); }
};

const createRecord = async (req, res, next) => {
  try {
    const { errors, values } = validateRecord(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ message: 'Please correct the highlighted fields.', errors });
    const mother = await findOwnedAnimal(values.mother, req.user.id, 'female');
    if (!mother) return res.status(404).json({ message: 'Mother must be a female animal owned by you.' });
    if (values.father) {
      const father = await findOwnedAnimal(values.father, req.user.id, 'male');
      if (!father) return res.status(404).json({ message: 'Father must be a male animal owned by you.' });
    }
    const record = await BreedingRecord.create({ ...values, farmer: req.user.id });
    const populated = await populateRecord(BreedingRecord.findById(record._id)).lean();
    return res.status(201).json({ message: 'Breeding record added successfully.', record: populated });
  } catch (error) { return next(error); }
};

const updateRecord = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ message: 'Breeding record not found.' });
    const existing = await BreedingRecord.findOne({ _id: req.params.id, farmer: req.user.id });
    if (!existing) return res.status(404).json({ message: 'Breeding record not found.' });
    const body = { ...existing.toObject(), ...req.body, matingDate: req.body.matingDate || dateOnly(existing.matingDate), pregnancyConfirmationDate: req.body.pregnancyConfirmationDate === undefined ? dateOnly(existing.pregnancyConfirmationDate) : req.body.pregnancyConfirmationDate, expectedDeliveryDate: req.body.expectedDeliveryDate === undefined ? dateOnly(existing.expectedDeliveryDate) : req.body.expectedDeliveryDate, actualDeliveryDate: req.body.actualDeliveryDate === undefined ? dateOnly(existing.actualDeliveryDate) : req.body.actualDeliveryDate };
    const { errors, values } = validateRecord(body);
    if (Object.keys(errors).length) return res.status(400).json({ message: 'Please correct the highlighted fields.', errors });
    const mother = await findOwnedAnimal(values.mother, req.user.id, 'female');
    if (!mother) return res.status(404).json({ message: 'Mother must be a female animal owned by you.' });
    if (values.father && !(await findOwnedAnimal(values.father, req.user.id, 'male'))) return res.status(404).json({ message: 'Father must be a male animal owned by you.' });
    Object.assign(existing, values); await existing.save();
    const record = await populateRecord(BreedingRecord.findById(existing._id)).lean();
    return res.status(200).json({ message: 'Breeding record updated successfully.', record });
  } catch (error) { return next(error); }
};

const deleteRecord = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ message: 'Breeding record not found.' });
    const result = await BreedingRecord.deleteOne({ _id: req.params.id, farmer: req.user.id });
    if (!result.deletedCount) return res.status(404).json({ message: 'Breeding record not found.' });
    return res.status(200).json({ message: 'Breeding record deleted successfully.' });
  } catch (error) { return next(error); }
};

const history = async (req, res, next) => {
  try {
    if (!isValidId(req.params.animalId)) return res.status(404).json({ message: 'Animal not found.' });
    const animal = await findOwnedAnimal(req.params.animalId, req.user.id);
    if (!animal) return res.status(404).json({ message: 'Animal not found.' });
    const records = await populateRecord(BreedingRecord.find({ farmer: req.user.id, $or: [{ mother: animal._id }, { father: animal._id }] }).sort({ matingDate: -1 })).lean();
    return res.status(200).json({ animal, records });
  } catch (error) { return next(error); }
};

const upcomingDeliveries = async (req, res, next) => {
  try {
    const now = new Date(); const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const end = new Date(today); end.setUTCDate(end.getUTCDate() + Math.min(Math.max(Number(req.query.days) || 30, 1), 365) + 1);
    const records = await populateRecord(BreedingRecord.find({ farmer: req.user.id, expectedDeliveryDate: { $ne: null, $lt: end }, pregnancyStatus: { $nin: ['delivered', 'unsuccessful'] } }).sort({ expectedDeliveryDate: 1 })).lean();
    return res.status(200).json({ deliveries: records.map((record) => ({ ...record, deliveryStatus: record.expectedDeliveryDate < today ? 'overdue' : 'upcoming' })) });
  } catch (error) { return next(error); }
};

const summary = async (req, res, next) => {
  try {
    const now = new Date(); const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const end = new Date(today); end.setUTCDate(end.getUTCDate() + 31);
    const base = { farmer: new mongoose.Types.ObjectId(req.user.id) };
    const [total, confirmed, upcoming, deliveries, unsuccessful] = await Promise.all([
      BreedingRecord.countDocuments(base),
      BreedingRecord.countDocuments({ ...base, pregnancyStatus: { $in: ['pregnancy-confirmed', 'delivered'] } }),
      BreedingRecord.countDocuments({ ...base, expectedDeliveryDate: { $gte: today, $lt: end }, pregnancyStatus: { $nin: ['delivered', 'unsuccessful'] } }),
      BreedingRecord.countDocuments({ ...base, pregnancyStatus: 'delivered' }),
      BreedingRecord.countDocuments({ ...base, pregnancyStatus: 'unsuccessful' })
    ]);
    return res.status(200).json({ summary: { total, confirmed, upcoming, deliveries, unsuccessful } });
  } catch (error) { return next(error); }
};

module.exports = { listRecords, getRecord, createRecord, updateRecord, deleteRecord, history, upcomingDeliveries, summary };
