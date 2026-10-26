const mongoose = require('mongoose');
const Animal = require('../models/Animal');

const allowedSpecies = new Set(['cow', 'goat']);
const allowedSexes = new Set(['male', 'female']);
const allowedSorts = new Set(['createdAt', 'tagId', 'name', 'dateOfBirth', 'initialWeightKg']);

const validateAnimal = (body) => {
  const errors = {};
  const species = String(body.species || '').trim().toLowerCase();
  const sex = String(body.sex || '').trim().toLowerCase();
  const tagId = String(body.tagId || '').trim();
  const breed = String(body.breed || '').trim();
  const date = new Date(body.dateOfBirth);
  const weight = Number(body.initialWeightKg);

  if (!allowedSpecies.has(species)) errors.species = 'Animal type must be cow or goat.';
  if (!tagId || tagId.length > 50) errors.tagId = 'Animal ID is required and must be 50 characters or fewer.';
  if (!allowedSexes.has(sex)) errors.sex = 'Sex must be male or female.';
  if (!body.dateOfBirth || Number.isNaN(date.getTime()) || date > new Date()) errors.dateOfBirth = 'Enter a valid date of birth that is not in the future.';
  if (!breed || breed.length > 80) errors.breed = 'Breed is required and must be 80 characters or fewer.';
  if (body.initialWeightKg === '' || !Number.isFinite(weight) || weight < 0) errors.initialWeightKg = 'Initial weight must be a non-negative number.';
  if (body.name && String(body.name).trim().length > 80) errors.name = 'Name must be 80 characters or fewer.';
  if (body.notes && String(body.notes).trim().length > 1000) errors.notes = 'Notes must be 1000 characters or fewer.';

  return { errors, values: { species, sex, tagId, breed, dateOfBirth: date, initialWeightKg: weight, name: String(body.name || '').trim(), notes: String(body.notes || '').trim() } };
};

const isValidId = (id) => mongoose.isValidObjectId(id);

const listAnimals = async (req, res, next) => {
  try {
    const { search = '', species, sex, sort = '-createdAt' } = req.query;
    const filter = { farmer: req.user.id };
    const normalizedSearch = String(search).trim();
    if (normalizedSearch) filter.$or = [
      { tagId: { $regex: normalizedSearch, $options: 'i' } },
      { name: { $regex: normalizedSearch, $options: 'i' } }
    ];
    if (species && allowedSpecies.has(String(species).toLowerCase())) filter.species = String(species).toLowerCase();
    if (sex && allowedSexes.has(String(sex).toLowerCase())) filter.sex = String(sex).toLowerCase();
    const safeSort = allowedSorts.has(String(sort).replace('-', '')) ? String(sort) : '-createdAt';
    const animals = await Animal.find(filter).sort(safeSort).lean();
    return res.status(200).json({ animals });
  } catch (error) {
    return next(error);
  }
};

const getAnimal = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ message: 'Animal not found.' });
    const animal = await Animal.findOne({ _id: req.params.id, farmer: req.user.id }).lean();
    if (!animal) return res.status(404).json({ message: 'Animal not found.' });
    return res.status(200).json({ animal });
  } catch (error) { return next(error); }
};

const createAnimal = async (req, res, next) => {
  try {
    const { errors, values } = validateAnimal(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ message: 'Please correct the highlighted fields.', errors });
    const animal = await Animal.create({ ...values, farmer: req.user.id });
    return res.status(201).json({ message: 'Animal added successfully.', animal });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'This animal ID is already used on your farm.', errors: { tagId: 'Choose a unique animal ID.' } });
    return next(error);
  }
};

const updateAnimal = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ message: 'Animal not found.' });
    const existing = await Animal.findOne({ _id: req.params.id, farmer: req.user.id });
    if (!existing) return res.status(404).json({ message: 'Animal not found.' });
    const body = { ...existing.toObject(), ...req.body };
    const { errors, values } = validateAnimal(body);
    if (Object.keys(errors).length) return res.status(400).json({ message: 'Please correct the highlighted fields.', errors });
    Object.assign(existing, values);
    await existing.save();
    return res.status(200).json({ message: 'Animal updated successfully.', animal: existing });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'This animal ID is already used on your farm.', errors: { tagId: 'Choose a unique animal ID.' } });
    return next(error);
  }
};

const deleteAnimal = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ message: 'Animal not found.' });
    const result = await Animal.deleteOne({ _id: req.params.id, farmer: req.user.id });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Animal not found.' });
    return res.status(200).json({ message: 'Animal deleted successfully.' });
  } catch (error) { return next(error); }
};

module.exports = { listAnimals, getAnimal, createAnimal, updateAnimal, deleteAnimal };
