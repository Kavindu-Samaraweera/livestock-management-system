const mongoose = require('mongoose');

const marketplaceListingSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  category: { type: String, enum: ['animal', 'milk', 'feed'], required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 2000, default: '' },
  price: { type: Number, required: true, min: 0.01 },
  currency: { type: String, trim: true, uppercase: true, default: 'LKR', maxlength: 3 },
  imageUrl: { type: String, trim: true, maxlength: 500, default: '' },
  status: { type: String, enum: ['active', 'inactive', 'reserved', 'sold'], default: 'active', index: true },
  animal: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal', default: null, index: true },
  animalType: { type: String, enum: ['cow', 'goat'], default: null },
  animalId: { type: String, trim: true, maxlength: 50, default: '' },
  sex: { type: String, enum: ['male', 'female'], default: null },
  breed: { type: String, trim: true, maxlength: 80, default: '' },
  dateOfBirth: { type: Date, default: null },
  availableQuantity: { type: Number, required: true, min: 0 },
  unit: { type: String, trim: true, default: 'unit', maxlength: 30 },
  feedType: { type: String, trim: true, maxlength: 100, default: '' },
  productName: { type: String, trim: true, maxlength: 120, default: '' },
  packaging: { type: String, trim: true, maxlength: 120, default: '' },
  freshness: { type: String, trim: true, maxlength: 120, default: '' },
  collectionDate: { type: Date, default: null },
  storageNotes: { type: String, trim: true, maxlength: 500, default: '' }
}, { timestamps: true });

marketplaceListingSchema.index({ category: 1, status: 1, createdAt: -1 });
marketplaceListingSchema.index({ title: 'text', description: 'text', animalId: 'text' });

module.exports = mongoose.model('MarketplaceListing', marketplaceListingSchema);
