const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketplaceListing', required: true, index: true },
  itemSnapshot: {
    title: { type: String, required: true },
    category: { type: String, enum: ['animal', 'milk', 'feed'], required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true }
  },
  quantity: { type: Number, required: true, min: 0.01 },
  totalPrice: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed'], default: 'pending', index: true },
  customerNotes: { type: String, trim: true, maxlength: 1000, default: '' }
}, { timestamps: true });

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ seller: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
