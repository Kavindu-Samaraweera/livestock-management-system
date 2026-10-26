const mongoose = require('mongoose');

const vaccinationRecordSchema = new mongoose.Schema(
  {
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    animal: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal', required: true, index: true },
    vaccineName: { type: String, required: true, trim: true, maxlength: 120 },
    vaccinationDate: { type: Date, required: true },
    nextDueDate: { type: Date, default: null },
    dose: { type: String, trim: true, maxlength: 80, default: '' },
    administeredBy: { type: String, trim: true, maxlength: 120, default: '' },
    notes: { type: String, trim: true, maxlength: 1000, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('VaccinationRecord', vaccinationRecordSchema);
