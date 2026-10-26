const mongoose = require('mongoose');
const Animal = require('../models/Animal');
const MilkRecord = require('../models/MilkRecord');

const sessions = new Set(['morning', 'afternoon', 'evening']);

const parseDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const validateRecord = (body) => {
  const errors = {};
  const date = parseDate(body.date);
  const session = String(body.session || '').trim().toLowerCase();
  const quantity = Number(body.quantityLiters);

  if (!mongoose.isValidObjectId(body.animal)) errors.animal = 'Select a valid animal.';
  if (!date || date > new Date()) errors.date = 'Enter a valid date that is not in the future.';
  if (!sessions.has(session)) errors.session = 'Session must be morning, afternoon, or evening.';
  if (body.quantityLiters === '' || !Number.isFinite(quantity) || quantity <= 0) errors.quantityLiters = 'Quantity must be greater than zero.';
  if (body.notes && String(body.notes).trim().length > 1000) errors.notes = 'Notes must be 1000 characters or fewer.';

  return { errors, values: { animal: body.animal, date, session, quantityLiters: quantity, notes: String(body.notes || '').trim() } };
};

const dateRange = (date) => {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { $gte: start, $lt: end };
};

const localDateKey = (date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: process.env.APP_TIMEZONE || 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const animalProjection = { _id: 1, tagId: 1, name: 1, species: 1 };

const listRecords = async (req, res, next) => {
  try {
    const { search = '', dateFrom, dateTo, session } = req.query;
    const filter = { farmer: req.user.id };
    if (session && sessions.has(String(session).toLowerCase())) filter.session = String(session).toLowerCase();
    if (dateFrom || dateTo) {
      filter.date = {};
      const from = dateFrom ? parseDate(dateFrom) : null;
      const to = dateTo ? parseDate(dateTo) : null;
      if (from) filter.date.$gte = from;
      if (to) { to.setUTCDate(to.getUTCDate() + 1); filter.date.$lt = to; }
    }
    const searchText = String(search).trim();
    if (searchText) {
      const animals = await Animal.find({ farmer: req.user.id, $or: [{ tagId: { $regex: searchText, $options: 'i' } }, { name: { $regex: searchText, $options: 'i' } }] }).select('_id');
      filter.animal = { $in: animals.map((animal) => animal._id) };
    }
    const records = await MilkRecord.find(filter).sort({ date: -1, createdAt: -1 }).populate('animal', 'tagId name species').lean();
    return res.status(200).json({ records });
  } catch (error) { return next(error); }
};

const getRecord = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Milk record not found.' });
    const record = await MilkRecord.findOne({ _id: req.params.id, farmer: req.user.id }).populate('animal', 'tagId name species').lean();
    if (!record) return res.status(404).json({ message: 'Milk record not found.' });
    return res.status(200).json({ record });
  } catch (error) { return next(error); }
};

const verifyAnimal = async (animalId, farmerId) => Animal.findOne({ _id: animalId, farmer: farmerId }).select(animalProjection);

const createRecord = async (req, res, next) => {
  try {
    const { errors, values } = validateRecord(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ message: 'Please correct the highlighted fields.', errors });
    const animal = await verifyAnimal(values.animal, req.user.id);
    if (!animal) return res.status(404).json({ message: 'Animal not found.' });
    const record = await MilkRecord.create({ ...values, farmer: req.user.id });
    return res.status(201).json({ message: 'Milk record added successfully.', record: { ...record.toObject(), animal } });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'A record already exists for this animal, date, and session.' });
    return next(error);
  }
};

const updateRecord = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Milk record not found.' });
    const existing = await MilkRecord.findOne({ _id: req.params.id, farmer: req.user.id });
    if (!existing) return res.status(404).json({ message: 'Milk record not found.' });
    const body = { ...existing.toObject(), ...req.body, date: req.body.date || existing.date.toISOString().slice(0, 10) };
    const { errors, values } = validateRecord(body);
    if (Object.keys(errors).length) return res.status(400).json({ message: 'Please correct the highlighted fields.', errors });
    if (String(values.animal) !== String(existing.animal)) {
      const animal = await verifyAnimal(values.animal, req.user.id);
      if (!animal) return res.status(404).json({ message: 'Animal not found.' });
    }
    Object.assign(existing, values);
    await existing.save();
    const record = await MilkRecord.findById(existing._id).populate('animal', 'tagId name species').lean();
    return res.status(200).json({ message: 'Milk record updated successfully.', record });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'A record already exists for this animal, date, and session.' });
    return next(error);
  }
};

const deleteRecord = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Milk record not found.' });
    const result = await MilkRecord.deleteOne({ _id: req.params.id, farmer: req.user.id });
    if (!result.deletedCount) return res.status(404).json({ message: 'Milk record not found.' });
    return res.status(200).json({ message: 'Milk record deleted successfully.' });
  } catch (error) { return next(error); }
};

const getSummary = async (req, res, next) => {
  try {
    const farmer = new mongoose.Types.ObjectId(req.user.id);
    const todayStart = parseDate(localDateKey(new Date()));
    const tomorrow = new Date(todayStart); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const weekStart = new Date(todayStart); const day = weekStart.getUTCDay(); weekStart.setUTCDate(weekStart.getUTCDate() - (day === 0 ? 6 : day - 1));
    const base = { farmer };
    const [today, week, todayBySpecies, weekBySpecies, recordCount, grouped] = await Promise.all([
      MilkRecord.aggregate([{ $match: { ...base, date: { $gte: todayStart, $lt: tomorrow } } }, { $group: { _id: null, total: { $sum: '$quantityLiters' } } }]),
      MilkRecord.aggregate([{ $match: { ...base, date: { $gte: weekStart, $lt: tomorrow } } }, { $group: { _id: null, total: { $sum: '$quantityLiters' } } }]),
      MilkRecord.aggregate([
        { $match: { ...base, date: { $gte: todayStart, $lt: tomorrow } } },
        { $lookup: { from: 'animals', localField: 'animal', foreignField: '_id', as: 'animal' } },
        { $unwind: '$animal' },
        { $group: { _id: '$animal.species', total: { $sum: '$quantityLiters' } } }
      ]),
      MilkRecord.aggregate([
        { $match: { ...base, date: { $gte: weekStart, $lt: tomorrow } } },
        { $lookup: { from: 'animals', localField: 'animal', foreignField: '_id', as: 'animal' } },
        { $unwind: '$animal' },
        { $group: { _id: '$animal.species', total: { $sum: '$quantityLiters' } } }
      ]),
      MilkRecord.countDocuments(base),
      MilkRecord.aggregate([{ $match: base }, { $group: { _id: '$animal', total: { $sum: '$quantityLiters' }, records: { $sum: 1 } } }, { $sort: { total: -1 } }])
    ]);
    const speciesTotal = (items, species) => items.find((item) => item._id === species)?.total || 0;
    const animals = await Animal.find({ _id: { $in: grouped.map((item) => item._id) }, farmer }).select(animalProjection).lean();
    const animalsById = new Map(animals.map((animal) => [String(animal._id), animal]));
    return res.status(200).json({ summary: {
      todayLiters: today[0]?.total || 0,
      weekLiters: week[0]?.total || 0,
      todayCowLiters: speciesTotal(todayBySpecies, 'cow'),
      todayGoatLiters: speciesTotal(todayBySpecies, 'goat'),
      weekCowLiters: speciesTotal(weekBySpecies, 'cow'),
      weekGoatLiters: speciesTotal(weekBySpecies, 'goat'),
      recordCount,
      byAnimal: grouped.map((item) => ({ animal: animalsById.get(String(item._id)), totalLiters: item.total, records: item.records }))
    } });
  } catch (error) { return next(error); }
};

module.exports = { listRecords, getRecord, createRecord, updateRecord, deleteRecord, getSummary };
