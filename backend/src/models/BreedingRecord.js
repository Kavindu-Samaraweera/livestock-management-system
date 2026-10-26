const mongoose = require('mongoose');

const breedingRecordSchema = new mongoose.Schema(
  {
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mother: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal', required: true, index: true },
    father: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal', default: null, index: true },
    matingDate: { type: Date, required: true },
    breedingMethod: { type: String, enum: ['natural-mating', 'artificial-insemination'], required: true },
    pregnancyStatus: { type: String, enum: ['planned', 'mated', 'pregnancy-confirmed', 'delivered', 'unsuccessful'], required: true },
    pregnancyConfirmationDate: { type: Date, default: null },
    expectedDeliveryDate: { type: Date, default: null },
    actualDeliveryDate: { type: Date, default: null },
    birthOutcome: { type: String, enum: ['live-birth', 'stillbirth', 'not-applicable'], default: 'not-applicable' },
    offspringCount: { type: Number, min: 0, default: 0 },
    postpartumStatus: { type: String, enum: ['not-applicable', 'monitoring', 'recovered', 'requires-attention'], default: 'not-applicable' },
    notes: { type: String, trim: true, maxlength: 1000, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('BreedingRecord', breedingRecordSchema);
