const express = require('express');
const router  = express.Router();
const Review  = require('../models/Review');
const Book    = require('../models/Book');
const { protect } = require('../middleware/auth');

// ── ADD REVIEW ────────────────────────────────────────────────────────────────
router.post('/add', protect, async (req, res) => {
  try {
    const { book_id, review_text, rating } = req.body;

    if (!book_id || !review_text || !rating)
      return res.status(400).json({ success: false, message: 'book_id, review_text, rating required.' });

    if (rating < 1 || rating > 5)
      return res.status(400).json({ success: false, message: 'Rating must be 1–5.' });

    const book = await Book.findById(book_id);
    if (!book) return res.status(404).json({ success: false, message: 'Book not found.' });

    const existing = await Review.findOne({ user_id: req.user.id, book_id });
    if (existing)
      return res.status(409).json({ success: false, message: 'You already reviewed this book.' });

    const review = new Review({
      user_id: req.user.id,
      book_id,
      review_text,
      rating: parseInt(rating)
    });

    try {
      await review.save();
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ success: false, message: 'You already reviewed this book.' });
      }
      throw err;
    }

    const allReviews = await Review.find({ book_id });
    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await Book.findByIdAndUpdate(book_id, {
      rating: Math.round(avg * 10) / 10
    });

    const populated = await Review.findById(review._id).populate('user_id', 'name email');

    // ✅ SOCKET FIX (clean + consistent)
    const io = req.app.get('io');
    if (io) {
      io.to(`book:${book_id}`).emit('reviewAdded', {
        review: populated,
        avgRating: parseFloat(avg.toFixed(1))
      });

      io.emit('bookUpdated', {
        bookId: book_id,
        rating: Math.round(avg * 10) / 10
      });
    }

    res.status(201).json({ success: true, message: 'Review added!', review: populated });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add review.' });
  }
});

// ── GET REVIEWS ──────────────────────────────────────────────────────────────
router.get('/:bookId', async (req, res) => {
  try {
    const reviews = await Review.find({ book_id: req.params.bookId })
      .populate('user_id', 'name email')
      .sort({ createdAt: -1 });

    let avgRating = 0;
    if (reviews.length > 0)
      avgRating = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);

    res.status(200).json({ success: true, count: reviews.length, avgRating, reviews });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch reviews.' });
  }
});

// ── DELETE REVIEW ─────────────────────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });

    const isOwner = review.user_id.toString() === req.user.id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin)
      return res.status(403).json({ success: false, message: 'Not authorized.' });

    const book_id = review.book_id;

    await Review.findByIdAndDelete(req.params.id);

    const remaining = await Review.find({ book_id });
    const newRating = remaining.length > 0
      ? remaining.reduce((s, r) => s + r.rating, 0) / remaining.length
      : 0;

    await Book.findByIdAndUpdate(book_id, {
      rating: Math.round(newRating * 10) / 10
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`book:${book_id}`).emit('reviewDeleted', {
        reviewId: req.params.id,
        avgRating: parseFloat(newRating.toFixed(1))
      });
    }

    res.status(200).json({ success: true, message: 'Review deleted.' });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete review.' });
  }
});

module.exports = router;