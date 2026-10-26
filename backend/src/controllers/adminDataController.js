const Animal = require('../models/Animal');
const MilkRecord = require('../models/MilkRecord');
const VaccinationRecord = require('../models/VaccinationRecord');
const WeightRecord = require('../models/WeightRecord');
const BreedingRecord = require('../models/BreedingRecord');

const configs = {
  animals: { model: Animal, populate: [{ path: 'farmer', select: 'name email' }] },
  milk: { model: MilkRecord, populate: [{ path: 'farmer', select: 'name email' }, { path: 'animal', select: 'tagId name species sex' }] },
  vaccinations: { model: VaccinationRecord, populate: [{ path: 'farmer', select: 'name email' }, { path: 'animal', select: 'tagId name species sex' }] },
  weights: { model: WeightRecord, populate: [{ path: 'farmer', select: 'name email' }, { path: 'animal', select: 'tagId name species sex' }] },
  breeding: { model: BreedingRecord, populate: [{ path: 'farmer', select: 'name email' }, { path: 'mother', select: 'tagId name species sex' }, { path: 'father', select: 'tagId name species sex' }] }
};

const listResource = (resource) => async (req, res, next) => {
  try {
    const config = configs[resource];
    const records = await config.model.find().populate(config.populate).sort({ createdAt: -1 }).lean();
    return res.json({ records });
  } catch (error) { return next(error); }
};

module.exports = { listAnimals: listResource('animals'), listMilk: listResource('milk'), listVaccinations: listResource('vaccinations'), listWeights: listResource('weights'), listBreeding: listResource('breeding') };
