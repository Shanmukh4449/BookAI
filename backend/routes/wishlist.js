const express  = require('express');
const router   = express.Router();
const Wishlist = require('../models/Wishlist');
const Book     = require('../models/Book'); // ✅ FIX 2: needed for book validation
const { protect } = require('../middleware/auth');

router.use(protect);

// ── ADD TO WISHLIST ───────────────────────────────────────────────────────────
router.post('/add', async (req, res) => {
  try {
    const { book_id } = req.body;
    if (!book_id) return res.status(400).json({ success: false, message: 'book_id required.' });

    // ✅ FIX 2: Validate that book actually exists before adding to wishlist
    const bookExists = await Book.findById(book_id);
    if (!bookExists) return res.status(404).json({ success: false, message: 'Book not found.' });

    const existing = await Wishlist.findOne({ user_id: req.user.id, book_id });
    if (existing) return res.status(409).json({ success: false, message: 'Already in wishlist.' });

    const item = new Wishlist({ user_id: req.user.id, book_id });

    // ✅ FIX 6: Duplicate error handling around save
    try {
      await item.save();
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ success: false, message: 'Already in wishlist.' });
      }
      throw err;
    }

    res.status(201).json({ success: true, message: 'Added to wishlist!', item });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add.' });
  }
});

// ── REMOVE FROM WISHLIST ──────────────────────────────────────────────────────
router.delete('/remove/:bookId', async (req, res) => {
  try {
    const result = await Wishlist.findOneAndDelete({ user_id: req.user.id, book_id: req.params.bookId });
    if (!result) return res.status(404).json({ success: false, message: 'Not in wishlist.' });
    res.status(200).json({ success: true, message: 'Removed from wishlist.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to remove.' });
  }
});

// ── GET MY WISHLIST ───────────────────────────────────────────────────────────
router.get('/my', async (req, res) => {
  try {
    // ✅ FIX 2: .populate('book_id') so full book data comes back
    const items = await Wishlist.find({ user_id: req.user.id })
      .populate('book_id')
      .sort({ createdAt: -1 });
    const books = items.map(i => i.book_id).filter(Boolean);
    res.status(200).json({ success: true, count: books.length, books });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch wishlist.' });
  }
});

// ── CHECK IF BOOK IS IN WISHLIST ──────────────────────────────────────────────
router.get('/check/:bookId', async (req, res) => {
  try {
    const item = await Wishlist.findOne({ user_id: req.user.id, book_id: req.params.bookId });
    res.status(200).json({ success: true, inWishlist: !!item });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to check.' });
  }
});

module.exports = router;