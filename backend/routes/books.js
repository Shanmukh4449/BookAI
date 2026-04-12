const express = require('express');
const router  = express.Router();
const Book    = require('../models/Book');
const Review  = require('../models/Review');

// ✅ FIX 5: Safe regex to prevent ReDoS attacks
const escapeStringRegexp = require('escape-string-regexp');

// ── GET ALL BOOKS (with pagination) ──────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    // ✅ FIX 7: Pagination added — page & limit params
    const { genre, sort, page = 1, limit = 50 } = req.query;
    let query = {};
    if (genre && genre !== 'All') query.genre = genre;
    let sortOption = { createdAt: -1 };
    if (sort === 'rating') sortOption = { rating: -1 };
    if (sort === 'title')  sortOption = { title: 1 };

    const books = await Book.find(query)
      .sort(sortOption)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Book.countDocuments(query);
    res.status(200).json({ success: true, count: books.length, total, page: Number(page), books });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch books.' });
  }
});

// ── SEARCH BOOKS ──────────────────────────────────────────────────────────────
router.get('/search', async (req, res) => {
  try {
    const { q, genre } = req.query;
    let query = {};
    if (q) {
      // ✅ FIX 5: Escape user input before using in regex
      const safeQuery = escapeStringRegexp(q);
      const regex     = new RegExp(safeQuery, 'i');
      query.$or = [{ title: regex }, { author: regex }, { description: regex }];
    }
    if (genre && genre !== 'All') query.genre = genre;
    const books = await Book.find(query).sort({ rating: -1 });
    res.status(200).json({ success: true, count: books.length, books });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Search failed.' });
  }
});

// ── GET SINGLE BOOK ───────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: 'Book not found.' });
    const reviews = await Review.find({ book_id: req.params.id })
      .populate('user_id', 'name email').sort({ createdAt: -1 });
    let avgRating = book.rating;
    if (reviews.length > 0)
      avgRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);
    res.status(200).json({ success: true, book: { ...book.toObject(), avgRating }, reviews });
  } catch (error) {
    if (error.name === 'CastError')
      return res.status(400).json({ success: false, message: 'Invalid book ID.' });
    res.status(500).json({ success: false, message: 'Failed to fetch book.' });
  }
});

module.exports = router;