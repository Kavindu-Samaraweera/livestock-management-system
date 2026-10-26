const mongoose = require('mongoose');

const milkRecordSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    animal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
      required: true,
      index: true
    },
    date: {
      type: Date,
      required: true
    },
    session: {
      type: String,
      enum: ['morning', 'afternoon', 'evening'],
      required: true
    },
    quantityLiters: {
      type: Number,
      required: true,
      min: 0.01
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ''
    }
  },
  { timestamps: true }
);

milkRecordSchema.index({ farmer: 1, animal: 1, date: 1, session: 1 }, { unique: true });

module.exports = mongoose.model('MilkRecord', milkRecordSchema);
