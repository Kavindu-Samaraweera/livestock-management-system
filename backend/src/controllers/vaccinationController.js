const mongoose = require('mongoose');
const Animal = require('../models/Animal');
const VaccinationRecord = require('../models/VaccinationRecord');

const parseDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const validateRecord = (body) => {
  const errors = {};
  const vaccinationDate = parseDate(body.vaccinationDate);
  const nextDueDate = body.nextDueDate ? parseDate(body.nextDueDate) : null;
  const vaccineName = String(body.vaccineName || '').trim();
  if (!mongoose.isValidObjectId(body.animal)) errors.animal = 'Select a valid animal.';
  if (!vaccineName || vaccineName.length > 120) errors.vaccineName = 'Vaccine name is required and must be 120 characters or fewer.';
  if (!vaccinationDate || vaccinationDate > new Date()) errors.vaccinationDate = 'Enter a valid vaccination date that is not in the future.';
  if (body.nextDueDate && !nextDueDate) errors.nextDueDate = 'Enter a valid next due date.';
  if (vaccinationDate && nextDueDate && nextDueDate < vaccinationDate) errors.nextDueDate = 'Next due date cannot be before the vaccination date.';
  if (body.dose && String(body.dose).trim().length > 80) errors.dose = 'Dose must be 80 characters or fewer.';
  if (body.administeredBy && String(body.administeredBy).trim().length > 120) errors.administeredBy = 'Administered by must be 120 characters or fewer.';
  if (body.notes && String(body.notes).trim().length > 1000) errors.notes = 'Notes must be 1000 characters or fewer.';
  return {
    errors,
    values: {
      animal: body.animal,
      vaccineName,
      vaccinationDate,
      nextDueDate,
      dose: String(body.dose || '').trim(),
      administeredBy: String(body.administeredBy || '').trim(),
      notes: String(body.notes || '').trim()
    }
  };
};

const animalFields = 'tagId name species';
const findOwnedAnimal = (animalId, farmerId) => Animal.findOne({ _id: animalId, farmer: farmerId }).select('_id tagId name species');
const isValidId = (id) => mongoose.isValidObjectId(id);

const statusFor = (nextDueDate) => {
  if (!nextDueDate) return 'no-due-date';
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const tomorrow = new Date(today); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const due = new Date(nextDueDate);
  if (due < today) return 'overdue';
  if (due < tomorrow) return 'due-today';
  return 'upcoming';
};

const withStatus = (record) => ({ ...record, status: statusFor(record.nextDueDate) });

const listRecords = async (req, res, next) => {
  try {
    const { search = '', dateFrom, dateTo } = req.query;
    const filter = { farmer: req.user.id };
    if (dateFrom || dateTo) {
      filter.vaccinationDate = {};
      const from = dateFrom ? parseDate(dateFrom) : null;
      const to = dateTo ? parseDate(dateTo) : null;
      if (from) filter.vaccinationDate.$gte = from;
      if (to) { to.setUTCDate(to.getUTCDate() + 1); filter.vaccinationDate.$lt = to; }
    }
    const searchText = String(search).trim();
    if (searchText) {
      const animals = await Animal.find({ farmer: req.user.id, $or: [{ tagId: { $regex: searchText, $options: 'i' } }, { name: { $regex: searchText, $options: 'i' } }] }).select('_id');
      filter.$or = [
        { animal: { $in: animals.map((animal) => animal._id) } },
        { vaccineName: { $regex: searchText, $options: 'i' } }
      ];
    }
    const records = await VaccinationRecord.find(filter)
      .sort({ vaccinationDate: -1, createdAt: -1 }).populate('animal', animalFields).lean();
    return res.status(200).json({ records: records.map(withStatus) });
  } catch (error) { return next(error); }
};

const getRecord = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ message: 'Vaccination record not found.' });
    const record = await VaccinationRecord.findOne({ _id: req.params.id, farmer: req.user.id }).populate('animal', animalFields).lean();
    if (!record) return res.status(404).json({ message: 'Vaccination record not found.' });
    return res.status(200).json({ record: withStatus(record) });
  } catch (error) { return next(error); }
};

const createRecord = async (req, res, next) => {
  try {
    const { errors, values } = validateRecord(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ message: 'Please correct the highlighted fields.', errors });
    const animal = await findOwnedAnimal(values.animal, req.user.id);
    if (!animal) return res.status(404).json({ message: 'Animal not found.' });
    const record = await VaccinationRecord.create({ ...values, farmer: req.user.id });
    return res.status(201).json({ message: 'Vaccination record added successfully.', record: withStatus({ ...record.toObject(), animal }) });
  } catch (error) { return next(error); }
};

const updateRecord = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ message: 'Vaccination record not found.' });
    const existing = await VaccinationRecord.findOne({ _id: req.params.id, farmer: req.user.id });
    if (!existing) return res.status(404).json({ message: 'Vaccination record not found.' });
    const body = { ...existing.toObject(), ...req.body, vaccinationDate: req.body.vaccinationDate || existing.vaccinationDate.toISOString().slice(0, 10), nextDueDate: req.body.nextDueDate === undefined ? (existing.nextDueDate ? existing.nextDueDate.toISOString().slice(0, 10) : '') : req.body.nextDueDate };
    const { errors, values } = validateRecord(body);
    if (Object.keys(errors).length) return res.status(400).json({ message: 'Please correct the highlighted fields.', errors });
    if (String(values.animal) !== String(existing.animal)) {
      const animal = await findOwnedAnimal(values.animal, req.user.id);
      if (!animal) return res.status(404).json({ message: 'Animal not found.' });
    }
    Object.assign(existing, values);
    await existing.save();
    const record = await VaccinationRecord.findById(existing._id).populate('animal', animalFields).lean();
    return res.status(200).json({ message: 'Vaccination record updated successfully.', record: withStatus(record) });
  } catch (error) { return next(error); }
};

const deleteRecord = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ message: 'Vaccination record not found.' });
    const result = await VaccinationRecord.deleteOne({ _id: req.params.id, farmer: req.user.id });
    if (!result.deletedCount) return res.status(404).json({ message: 'Vaccination record not found.' });
    return res.status(200).json({ message: 'Vaccination record deleted successfully.' });
  } catch (error) { return next(error); }
};

const getSummary = async (req, res, next) => {
  try {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrow = new Date(today); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const reminderEnd = new Date(today); reminderEnd.setUTCDate(reminderEnd.getUTCDate() + 4);
    const base = { farmer: new mongoose.Types.ObjectId(req.user.id) };
    const [total, dueToday, upcoming, overdue, reminders] = await Promise.all([
      VaccinationRecord.countDocuments(base),
      VaccinationRecord.countDocuments({ ...base, nextDueDate: { $gte: today, $lt: tomorrow } }),
      VaccinationRecord.countDocuments({ ...base, nextDueDate: { $gte: tomorrow } }),
      VaccinationRecord.countDocuments({ ...base, nextDueDate: { $lt: today, $ne: null } }),
      VaccinationRecord.find({ ...base, nextDueDate: { $gte: tomorrow, $lt: reminderEnd } })
        .sort({ nextDueDate: 1 }).populate('animal', animalFields).lean()
    ]);
    return res.status(200).json({ summary: { total, dueToday, upcoming, overdue, reminders: reminders.map(withStatus) } });
  } catch (error) { return next(error); }
};

module.exports = { listRecords, getRecord, createRecord, updateRecord, deleteRecord, getSummary };
