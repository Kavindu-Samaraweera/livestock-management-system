const mongoose = require('mongoose');
const User = require('../models/User');

const requireFarmerTarget = (Model, field = 'farmer') => async (req, res, next) => {
  try {
    const farmerId = req.body?.[field];
    if (!mongoose.isValidObjectId(farmerId)) return res.status(400).json({ message: 'A valid farmer is required for this record.' });
    const farmer = await User.findOne({ _id: farmerId, role: 'farmer' }).select('_id');
    if (!farmer) return res.status(404).json({ message: 'Farmer not found.' });
    req.user.id = farmer._id.toString();
    return next();
  } catch (error) { return next(error); }
};

const scopeExistingRecord = (Model) => async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Record not found.' });
    const record = await Model.findById(req.params.id).select('farmer');
    if (!record) return res.status(404).json({ message: 'Record not found.' });
    req.user.id = record.farmer.toString();
    return next();
  } catch (error) { return next(error); }
};

module.exports = { requireFarmerTarget, scopeExistingRecord };
