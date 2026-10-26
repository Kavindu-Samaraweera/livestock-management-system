const mongoose = require('mongoose');
const Animal = require('../models/Animal');
const WeightRecord = require('../models/WeightRecord');

const parseDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const validateRecord = (body) => {
  const errors = {};
  const measurementDate = parseDate(body.measurementDate);
  const weightKg = Number(body.weightKg);
  if (!mongoose.isValidObjectId(body.animal)) errors.animal = 'Select a valid animal.';
  if (!measurementDate || measurementDate > new Date()) errors.measurementDate = 'Enter a valid date that is not in the future.';
  if (body.weightKg === '' || !Number.isFinite(weightKg) || weightKg <= 0) errors.weightKg = 'Weight must be greater than zero.';
  if (body.notes && String(body.notes).trim().length > 1000) errors.notes = 'Notes must be 1000 characters or fewer.';
  return { errors, values: { animal: body.animal, measurementDate, weightKg, notes: String(body.notes || '').trim() } };
};

const animalFields = 'tagId name species';
const isValidId = (id) => mongoose.isValidObjectId(id);
const findOwnedAnimal = (animalId, farmerId) => Animal.findOne({ _id: animalId, farmer: farmerId }).select('_id tagId name species');

const addChange = (records) => records.map((record, index) => {
  const previous = records[index - 1];
  const differenceKg = previous ? record.weightKg - previous.weightKg : null;
  return { ...record, differenceKg, percentageChange: previous && previous.weightKg > 0 ? (differenceKg / previous.weightKg) * 100 : null };
});

const historySummary = (records) => {
  const measured = addChange(records);
  const latest = measured.at(-1) || null;
  const previous = measured.at(-2) || null;
  const differenceKg = latest && previous ? latest.weightKg - previous.weightKg : null;
  return {
    latest,
    previous,
    differenceKg,
    percentageChange: latest && previous && previous.weightKg > 0 ? (differenceKg / previous.weightKg) * 100 : null,
    meaningfulChart: measured.length >= 2
  };
};

const listRecords = async (req, res, next) => {
  try {
    const { search = '', animal, dateFrom, dateTo } = req.query;
    const filter = { farmer: req.user.id };
    if (isValidId(animal)) filter.animal = animal;
    if (dateFrom || dateTo) {
      filter.measurementDate = {};
      const from = dateFrom ? parseDate(dateFrom) : null;
      const to = dateTo ? parseDate(dateTo) : null;
      if (from) filter.measurementDate.$gte = from;
      if (to) { to.setUTCDate(to.getUTCDate() + 1); filter.measurementDate.$lt = to; }
    }
    const searchText = String(search).trim();
    if (searchText) {
      const animals = await Animal.find({ farmer: req.user.id, $or: [{ tagId: { $regex: searchText, $options: 'i' } }, { name: { $regex: searchText, $options: 'i' } }] }).select('_id');
      filter.animal = { $in: animals.map((item) => item._id) };
    }
    const records = await WeightRecord.find(filter).sort({ measurementDate: -1, createdAt: -1 }).populate('animal', animalFields).lean();
    return res.status(200).json({ records });
  } catch (error) { return next(error); }
};

const getRecord = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ message: 'Weight record not found.' });
    const record = await WeightRecord.findOne({ _id: req.params.id, farmer: req.user.id }).populate('animal', animalFields).lean();
    if (!record) return res.status(404).json({ message: 'Weight record not found.' });
    return res.status(200).json({ record });
  } catch (error) { return next(error); }
};

const createRecord = async (req, res, next) => {
  try {
    const { errors, values } = validateRecord(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ message: 'Please correct the highlighted fields.', errors });
    const animal = await findOwnedAnimal(values.animal, req.user.id);
    if (!animal) return res.status(404).json({ message: 'Animal not found.' });
    const record = await WeightRecord.create({ ...values, farmer: req.user.id });
    return res.status(201).json({ message: 'Weight record added successfully.', record: { ...record.toObject(), animal } });
  } catch (error) { return next(error); }
};

const updateRecord = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ message: 'Weight record not found.' });
    const existing = await WeightRecord.findOne({ _id: req.params.id, farmer: req.user.id });
    if (!existing) return res.status(404).json({ message: 'Weight record not found.' });
    const body = { ...existing.toObject(), ...req.body, measurementDate: req.body.measurementDate || existing.measurementDate.toISOString().slice(0, 10) };
    const { errors, values } = validateRecord(body);
    if (Object.keys(errors).length) return res.status(400).json({ message: 'Please correct the highlighted fields.', errors });
    if (String(values.animal) !== String(existing.animal)) {
      const animal = await findOwnedAnimal(values.animal, req.user.id);
      if (!animal) return res.status(404).json({ message: 'Animal not found.' });
    }
    Object.assign(existing, values);
    await existing.save();
    const record = await WeightRecord.findById(existing._id).populate('animal', animalFields).lean();
    return res.status(200).json({ message: 'Weight record updated successfully.', record });
  } catch (error) { return next(error); }
};

const deleteRecord = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ message: 'Weight record not found.' });
    const result = await WeightRecord.deleteOne({ _id: req.params.id, farmer: req.user.id });
    if (!result.deletedCount) return res.status(404).json({ message: 'Weight record not found.' });
    return res.status(200).json({ message: 'Weight record deleted successfully.' });
  } catch (error) { return next(error); }
};

const getHistory = async (req, res, next) => {
  try {
    if (!isValidId(req.params.animalId)) return res.status(404).json({ message: 'Animal not found.' });
    const animal = await findOwnedAnimal(req.params.animalId, req.user.id);
    if (!animal) return res.status(404).json({ message: 'Animal not found.' });
    const records = await WeightRecord.find({ farmer: req.user.id, animal: animal._id }).sort({ measurementDate: 1, createdAt: 1 }).lean();
    return res.status(200).json({ animal, records: addChange(records), summary: historySummary(records) });
  } catch (error) { return next(error); }
};

module.exports = { listRecords, getRecord, createRecord, updateRecord, deleteRecord, getHistory };
