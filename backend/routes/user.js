const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

router.use(protect);

// UPDATE FAVOURITE GENRE
router.put('/update-genre', async (req, res) => {
  try {
    const { favorite_genre } = req.body;
    if (!favorite_genre || favorite_genre.trim() === '')
      return res.status(400).json({ success: false, message: 'Genre is required.' });
    const user = await User.findByIdAndUpdate(
      req.user.id, { favorite_genre: favorite_genre.trim() }, { new: true }
    ).select('-password');
    res.status(200).json({ success: true, message: 'Genre updated!', user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update genre.' });
  }
});

// GET MY PROFILE
router.get('/me', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile.' });
  }
});

module.exports = router;