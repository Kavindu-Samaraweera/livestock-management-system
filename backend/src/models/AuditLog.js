const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, enum: ['user-suspended', 'user-reactivated', 'user-updated', 'user-deleted', 'listing-deactivated', 'listing-reactivated', 'listing-updated', 'listing-deleted'], required: true, index: true },
    targetType: { type: String, enum: ['User', 'MarketplaceListing'], required: true },
    target: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    description: { type: String, required: true, trim: true, maxlength: 300 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
