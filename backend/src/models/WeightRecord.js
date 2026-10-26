const mongoose = require('mongoose');

const weightRecordSchema = new mongoose.Schema(
  {
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    animal: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal', required: true, index: true },
    measurementDate: { type: Date, required: true },
    weightKg: { type: Number, required: true, min: 0.01 },
    notes: { type: String, trim: true, maxlength: 1000, default: '' }
  },
  { timestamps: true }
);

weightRecordSchema.index({ farmer: 1, animal: 1, measurementDate: 1 });

module.exports = mongoose.model('WeightRecord', weightRecordSchema);
