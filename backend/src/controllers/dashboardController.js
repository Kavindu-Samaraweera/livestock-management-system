const mongoose = require('mongoose');
const Animal = require('../models/Animal');

const emptySummary = {
  totalAnimals: 0,
  cows: 0,
  goats: 0,
  maleAnimals: 0,
  femaleAnimals: 0,
  overview: [],
  recentActivity: []
};

const getSummary = async (req, res, next) => {
  try {
    const farmerId = req.user.id;
    const farmerObjectId = new mongoose.Types.ObjectId(farmerId);
    const [totalAnimals, groupedAnimals] = await Promise.all([
      Animal.countDocuments({ farmer: farmerId }),
      Animal.aggregate([
        { $match: { farmer: farmerObjectId } },
        { $group: { _id: { species: '$species', sex: '$sex' }, count: { $sum: 1 } } }
      ])
    ]);

    if (totalAnimals === 0) {
      return res.status(200).json({ summary: emptySummary });
    }

    const summary = { ...emptySummary, totalAnimals };

    groupedAnimals.forEach(({ _id, count }) => {
      if (_id.species === 'cow') summary.cows += count;
      if (_id.species === 'goat') summary.goats += count;
      if (_id.sex === 'male') summary.maleAnimals += count;
      if (_id.sex === 'female') summary.femaleAnimals += count;
    });

    summary.overview = [
      { label: 'Cows', value: summary.cows, color: 'green' },
      { label: 'Goats', value: summary.goats, color: 'gold' },
      { label: 'Male', value: summary.maleAnimals, color: 'blue' },
      { label: 'Female', value: summary.femaleAnimals, color: 'rose' }
    ];

    return res.status(200).json({ summary });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getSummary };
