const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String, required: [true, 'Name is required'], trim: true, minlength: 2
  },
  email: {
    type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true
  },
  password: {
    type: String, required: [true, 'Password is required'], minlength: 6
  },
  favorite_genre: { type: String, default: 'Fiction' },
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);