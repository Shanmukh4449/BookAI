const express  = require('express');
const router   = express.Router();
const Book     = require('../models/Book');
const User     = require('../models/User');
const Review   = require('../models/Review'); // ✅ FIX 11: needed for admin reviews route
const Genre    = require('../models/Genre');
const { LoginHistory } = require('../models/LoginHistory');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

// ── ADD BOOK ──────────────────────────────────────────────────────────────────
router.post('/add-book', async (req, res) => {
  try {
    const { title, author, genre, description, rating, platform_link, cover_url } = req.body;
    if (!title || !author || !genre || !description)
      return res.status(400).json({ success: false, message: 'Title, author, genre, description required.' });

    // ✅ FIX 3: Validate that genre exists (default OR custom)
    const Genre = require('../models/Genre');
    const defaultGenres = ['Fiction','Non-Fiction','Science','History','Romance','Thriller','Fantasy','Biography','Technology','Psychology'];
    const customGenre   = await Genre.findOne({ name: { $regex: new RegExp(`^${genre}$`, 'i') } });
    if (!defaultGenres.includes(genre) && !customGenre) {
      return res.status(400).json({ success: false, message: `Invalid genre: "${genre}". Add it first in Genres tab.` });
    }

    const book = await Book.create({
      title, author, genre, description,
      rating: parseFloat(rating) || 0,
      platform_link: platform_link || '',
      cover_url: cover_url || ''
    });
    const io = req.app.get('io');
    if (io) io.emit('bookAdded', { book });
    res.status(201).json({ success: true, message: 'Book added!', book });
  } catch (error) {
    console.error('Add book error:', error);
    res.status(500).json({ success: false, message: 'Failed to add book.' });
  }
});

// ── UPDATE BOOK (BUG FIXED) ───────────────────────────────────────────────────
router.put('/update-book/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const allowedFields = ['title', 'author', 'genre', 'description', 'rating', 'platform_link', 'cover_url'];
    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined && req.body[field] !== '') updateData[field] = req.body[field];
    });
    if (updateData.rating !== undefined) updateData.rating = parseFloat(updateData.rating);
    const book = await Book.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: false });
    if (!book) return res.status(404).json({ success: false, message: 'Book not found.' });
    const io = req.app.get('io');
    if (io) io.emit('bookUpdated', { book });
    res.status(200).json({ success: true, message: 'Book updated!', book });
  } catch (error) {
    console.error('Update book error:', error);
    res.status(500).json({ success: false, message: 'Failed to update book.' });
  }
});

// ── DELETE BOOK ───────────────────────────────────────────────────────────────
router.delete('/delete-book/:id', async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: 'Book not found.' });
    res.status(200).json({ success: true, message: 'Book deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete book.' });
  }
});

// ── LOGIN HISTORY ─────────────────────────────────────────────────────────────
router.get('/login-history', async (req, res) => {
  try {
    const history = await LoginHistory.find()
      .populate('user_id', 'name email role')
      .sort({ login_time: -1 }).limit(100);
    res.status(200).json({ success: true, count: history.length, history });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch history.' });
  }
});

// ── ALL USERS ─────────────────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
});

// ── DASHBOARD STATS ───────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const totalUsers   = await User.countDocuments();
    const totalBooks   = await Book.countDocuments();
    const totalReviews = await Review.countDocuments();
    const genreAgg     = await Book.aggregate([{ $group: { _id: '$genre', count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
    const popularGenre = genreAgg.length > 0 ? genreAgg[0]._id : 'N/A';
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const usersByDay   = await User.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    const recentLogins = await LoginHistory.find().populate('user_id', 'name email').sort({ login_time: -1 }).limit(5);
    const topBooks     = await Book.find({}).sort({ rating: -1 }).limit(5);
    res.status(200).json({
      success: true,
      stats: { totalUsers, totalBooks, totalReviews, popularGenre, genreDistribution: genreAgg, usersByDay, recentLogins, topBooks }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to load stats.' });
  }
});

// ── ADD GENRE ─────────────────────────────────────────────────────────────────
router.post('/add-genre', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === '')
      return res.status(400).json({ success: false, message: 'Genre name required.' });
    const existing = await Genre.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
    if (existing)
      return res.status(409).json({ success: false, message: 'Genre already exists.' });
    const genre = await Genre.create({ name: name.trim(), createdBy: req.user.id });
    res.status(201).json({ success: true, message: 'Genre added!', genre });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add genre.' });
  }
});

// ✅ FIX 11: Admin — View ALL reviews across all books
router.get('/reviews', async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('user_id', 'name email')
      .populate('book_id', 'title genre')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch reviews.' });
  }
});

// ✅ FIX 11: Admin — Delete any review
router.delete('/reviews/:id', async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });
    // Recalculate book rating
    const remaining = await Review.find({ book_id: review.book_id });
    const newRating  = remaining.length > 0
      ? remaining.reduce((s, r) => s + r.rating, 0) / remaining.length : 0;
    await Book.findByIdAndUpdate(review.book_id, { rating: Math.round(newRating * 10) / 10 });
    res.status(200).json({ success: true, message: 'Review deleted by admin.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete review.' });
  }
});

module.exports = router;