const mongoose = require('mongoose');
const Animal = require('../models/Animal');
const MilkRecord = require('../models/MilkRecord');
const VaccinationRecord = require('../models/VaccinationRecord');
const WeightRecord = require('../models/WeightRecord');
const BreedingRecord = require('../models/BreedingRecord');

const parseDate = (value) => {
  if (!value) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};
const dayStart = (date = new Date()) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
const addDays = (date, days) => { const result = new Date(date); result.setUTCDate(result.getUTCDate() + days); return result; };
const rangeFromQuery = (query) => {
  const now = new Date(); const defaultFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const from = query.dateFrom ? parseDate(query.dateFrom) : defaultFrom;
  const toValue = query.dateTo ? parseDate(query.dateTo) : addDays(dayStart(now), 1);
  return { from: from || defaultFrom, to: toValue ? addDays(toValue, 1) : addDays(dayStart(now), 1), invalid: Boolean((query.dateFrom && !parseDate(query.dateFrom)) || (query.dateTo && !parseDate(query.dateTo))) };
};
const farmerId = (req) => new mongoose.Types.ObjectId(req.user.id);
const animalFields = 'tagId name species sex dateOfBirth';

const getAnimals = async (req) => {
  const animals = await Animal.find({ farmer: req.user.id }).select(animalFields).lean();
  const counts = { total: animals.length, male: 0, female: 0, cow: 0, goat: 0, cowMale: 0, cowFemale: 0, goatMale: 0, goatFemale: 0 };
  animals.forEach((animal) => { counts[animal.sex] += 1; counts[animal.species] += 1; counts[`${animal.species}${animal.sex.charAt(0).toUpperCase()}${animal.sex.slice(1)}`] += 1; });
  return { counts, animals };
};

const getReproduction = async (req, animals) => {
  const females = animals.filter((animal) => animal.sex === 'female');
  const records = await BreedingRecord.find({ farmer: req.user.id, $or: [{ mother: { $in: females.map((animal) => animal._id) } }, { father: { $in: females.map((animal) => animal._id) } }] }).sort({ matingDate: -1, updatedAt: -1 }).lean();
  const byAnimal = new Map(); records.forEach((record) => { const id = String(record.mother); if (!byAnimal.has(id)) byAnimal.set(id, record); });
  const today = dayStart(); const categories = { pregnant: 0, postpartum: 0, youngFemale: 0, eligible: 0, other: 0 }; const details = [];
  females.forEach((animal) => {
    let category = 'other'; const latest = byAnimal.get(String(animal._id));
    if (new Date(animal.dateOfBirth) > addDays(today, -8 * 30)) category = 'youngFemale';
    else if (latest?.pregnancyStatus === 'pregnancy-confirmed') category = 'pregnant';
    else if (latest?.actualDeliveryDate && new Date(latest.actualDeliveryDate) > addDays(today, -90)) category = 'postpartum';
    else if (latest?.actualDeliveryDate && new Date(latest.actualDeliveryDate) <= addDays(today, -90)) category = 'eligible';
    categories[category] += 1; details.push({ animal, category });
  });
  const total = females.length; const chart = Object.entries(categories).map(([label, count]) => ({ label, count, percentage: total ? (count / total) * 100 : 0 }));
  return { totalFemales: total, categories, chart, priority: ['youngFemale', 'pregnant', 'postpartum', 'eligible', 'other'], details };
};

const getMilk = async (req) => {
  const range = rangeFromQuery(req.query); if (range.invalid) return { error: 'Use date filters in YYYY-MM-DD format.' };
  const farmer = farmerId(req); const match = { farmer, date: { $gte: range.from, $lt: range.to } }; if (mongoose.isValidObjectId(req.query.animal)) match.animal = new mongoose.Types.ObjectId(req.query.animal);
  const [rangeTotal, recordCount, daily, monthly, byAnimal, todayTotal, weekTotal, monthTotal] = await Promise.all([
    MilkRecord.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: '$quantityLiters' } } }]),
    MilkRecord.countDocuments(match),
    MilkRecord.aggregate([{ $match: match }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' } }, litres: { $sum: '$quantityLiters' } } }, { $sort: { _id: 1 } }]),
    MilkRecord.aggregate([{ $match: match }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date', timezone: 'UTC' } }, litres: { $sum: '$quantityLiters' } } }, { $sort: { _id: 1 } }]),
    MilkRecord.aggregate([{ $match: match }, { $group: { _id: '$animal', litres: { $sum: '$quantityLiters' }, records: { $sum: 1 } } }, { $sort: { litres: -1 } }]),
    MilkRecord.aggregate([{ $match: { farmer, date: { $gte: dayStart(), $lt: addDays(dayStart(), 1) } } }, { $group: { _id: null, total: { $sum: '$quantityLiters' } } }]),
    MilkRecord.aggregate([{ $match: { farmer, date: { $gte: addDays(dayStart(), -(dayStart().getUTCDay() || 7) + 1), $lt: addDays(dayStart(), 1) } } }, { $group: { _id: null, total: { $sum: '$quantityLiters' } } }]),
    MilkRecord.aggregate([{ $match: { farmer, date: { $gte: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)), $lt: addDays(dayStart(), 1) } } }, { $group: { _id: null, total: { $sum: '$quantityLiters' } } }])
  ]);
  const animalIds = byAnimal.map((item) => item._id); const animals = await Animal.find({ _id: { $in: animalIds }, farmer }).select('tagId name species').lean(); const names = new Map(animals.map((animal) => [String(animal._id), animal]));
  return { range: { from: range.from, to: addDays(range.to, -1) }, totalLitres: rangeTotal[0]?.total || 0, todayLitres: todayTotal[0]?.total || 0, weekLitres: weekTotal[0]?.total || 0, monthLitres: monthTotal[0]?.total || 0, recordCount, daily: daily.map((item) => ({ date: item._id, litres: item.litres })), monthly: monthly.map((item) => ({ month: item._id, litres: item.litres })), byAnimal: byAnimal.map((item) => ({ animal: names.get(String(item._id)), litres: item.litres, records: item.records })) };
};

const getVaccinations = async (req) => {
  const range = rangeFromQuery(req.query); if (range.invalid) return { error: 'Use date filters in YYYY-MM-DD format.' };
  const farmer = farmerId(req); const today = dayStart(); const tomorrow = addDays(today, 1); const filter = { farmer, vaccinationDate: { $gte: range.from, $lt: range.to } };
  const [total, dueToday, upcoming, overdue, history] = await Promise.all([
    VaccinationRecord.countDocuments(filter),
    VaccinationRecord.countDocuments({ farmer, nextDueDate: { $gte: today, $lt: tomorrow } }),
    VaccinationRecord.countDocuments({ farmer, nextDueDate: { $gte: tomorrow } }),
    VaccinationRecord.countDocuments({ farmer, nextDueDate: { $lt: today, $ne: null } }),
    VaccinationRecord.aggregate([{ $match: filter }, { $group: { _id: '$animal', records: { $sum: 1 } } }, { $sort: { records: -1 } }])
  ]);
  const animals = await Animal.find({ _id: { $in: history.map((item) => item._id) }, farmer }).select('tagId name species').lean(); const names = new Map(animals.map((animal) => [String(animal._id), animal]));
  return { range: { from: range.from, to: addDays(range.to, -1) }, total, dueToday, upcoming, overdue, history: history.map((item) => ({ animal: names.get(String(item._id)), records: item.records })) };
};

const getBreeding = async (req) => {
  const farmer = farmerId(req); const today = dayStart(); const end = addDays(today, 31);
  const [total, confirmed, upcoming, overdue, deliveries, unsuccessful, expected] = await Promise.all([
    BreedingRecord.countDocuments({ farmer }),
    BreedingRecord.countDocuments({ farmer, pregnancyStatus: { $in: ['pregnancy-confirmed', 'delivered'] } }),
    BreedingRecord.countDocuments({ farmer, expectedDeliveryDate: { $gte: today, $lt: end }, pregnancyStatus: { $nin: ['delivered', 'unsuccessful'] } }),
    BreedingRecord.countDocuments({ farmer, expectedDeliveryDate: { $lt: today, $ne: null }, pregnancyStatus: { $nin: ['delivered', 'unsuccessful'] } }),
    BreedingRecord.countDocuments({ farmer, pregnancyStatus: 'delivered' }),
    BreedingRecord.countDocuments({ farmer, pregnancyStatus: 'unsuccessful' }),
    BreedingRecord.find({ farmer, expectedDeliveryDate: { $ne: null }, pregnancyStatus: { $nin: ['delivered', 'unsuccessful'] } }).sort({ expectedDeliveryDate: 1 }).populate('mother', 'tagId name species').lean()
  ]);
  return { total, confirmed, upcoming, overdue, deliveries, unsuccessful, expectedDeliveries: expected.map((record) => ({ ...record, deliveryStatus: record.expectedDeliveryDate < today ? 'overdue' : 'upcoming' })) };
};

const getWeights = async (req) => {
  const range = rangeFromQuery(req.query); if (range.invalid) return { error: 'Use date filters in YYYY-MM-DD format.' };
  const filter = { farmer: req.user.id, measurementDate: { $gte: range.from, $lt: range.to } }; if (mongoose.isValidObjectId(req.query.animal)) filter.animal = req.query.animal;
  const records = await WeightRecord.find(filter).sort({ measurementDate: 1, createdAt: 1 }).populate('animal', 'tagId name species').lean();
  const latest = records.at(-1) || null; const previous = records.at(-2) || null; const differenceKg = latest && previous ? latest.weightKg - previous.weightKg : null;
  return { range: { from: range.from, to: addDays(range.to, -1) }, records, latest, previous, differenceKg, percentageChange: latest && previous && previous.weightKg > 0 ? (differenceKg / previous.weightKg) * 100 : null };
};

const getOverview = async (req, res, next) => { try { const range = rangeFromQuery(req.query); if (range.invalid) return res.status(400).json({ message: 'Use date filters in YYYY-MM-DD format.' }); const { animals, counts } = await getAnimals(req); const [reproduction, milk, vaccinations, breeding, weights] = await Promise.all([getReproduction(req, animals), getMilk(req), getVaccinations(req), getBreeding(req), getWeights(req)]); return res.status(200).json({ overview: { animals: counts, reproduction, milk, vaccinations, breeding, weights, range: { from: range.from, to: addDays(range.to, -1) } } }); } catch (error) { return next(error); } };
const endpoint = (getter, key) => async (req, res, next) => { try { const result = await getter(req); if (result.error) return res.status(400).json({ message: result.error }); return res.status(200).json({ [key]: result }); } catch (error) { return next(error); } };

module.exports = { getOverview, getAnimals: endpoint(async (req) => (await getAnimals(req)).counts, 'animals'), getReproduction: endpoint(async (req) => { const { animals } = await getAnimals(req); return getReproduction(req, animals); }, 'reproduction'), getMilk: endpoint(getMilk, 'milk'), getVaccinations: endpoint(getVaccinations, 'vaccinations'), getBreeding: endpoint(getBreeding, 'breeding'), getWeights: endpoint(getWeights, 'weights') };
