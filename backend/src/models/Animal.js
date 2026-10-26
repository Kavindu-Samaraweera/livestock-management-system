const mongoose = require('mongoose');

const animalSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    tagId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    name: {
      type: String,
      trim: true,
      maxlength: 80,
      default: ''
    },
    species: {
      type: String,
      enum: ['cow', 'goat'],
      required: true
    },
    sex: {
      type: String,
      enum: ['male', 'female'],
      required: true
    },
    dateOfBirth: {
      type: Date,
      required: true
    },
    breed: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80
    },
    initialWeightKg: {
      type: Number,
      required: true,
      min: 0
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

animalSchema.index({ farmer: 1, tagId: 1 }, { unique: true });

module.exports = mongoose.model('Animal', animalSchema);
