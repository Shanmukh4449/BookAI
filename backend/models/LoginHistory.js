const mongoose = require('mongoose');

const loginHistorySchema = new mongoose.Schema({
  user_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  email:      { type: String, required: true },
  login_time: { type: Date, default: Date.now },
  ip_address: { type: String, default: 'unknown' }
});

// ✅ FIX 8: Auto-delete login history older than 30 days (2592000 seconds)
loginHistorySchema.index({ login_time: 1 }, { expireAfterSeconds: 2592000 });

const LoginHistory = mongoose.model('LoginHistory', loginHistorySchema);

const passwordResetSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  otp: { type: String, required: true },
  expiry_time: { type: Date, required: true },
  attempts: { type: Number, default: 0 } // optional security
}, { timestamps: true });

const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);

module.exports = { LoginHistory, PasswordReset };