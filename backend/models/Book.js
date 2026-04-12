const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title:       { type: String, required: [true, 'Title is required'], trim: true },
  author:      { type: String, required: [true, 'Author is required'], trim: true },
  genre:       { type: String, required: true },
  description: { type: String, required: true, minlength: 20 },
  rating:      { type: Number, default: 0, min: 0, max: 5 },
  platform_link: { type: String, default: '' }, // ✅ FIX 10: empty string, not '#'
  cover_url:   { type: String, default: '' }
}, { timestamps: true });

bookSchema.index({ title: 'text', author: 'text', description: 'text' });

module.exports = mongoose.model('Book', bookSchema);