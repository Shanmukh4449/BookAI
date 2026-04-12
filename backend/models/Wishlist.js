const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  book_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true }
}, { timestamps: true });

wishlistSchema.index({ user_id: 1, book_id: 1 }, { unique: true });

module.exports = mongoose.model('Wishlist', wishlistSchema);