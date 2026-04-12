const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  book_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  review_text: { type: String, required: true, minlength: 10, maxlength: 1000 },
  rating:      { type: Number, required: true, min: 1, max: 5 }
}, { timestamps: true });

reviewSchema.index({ user_id: 1, book_id: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);