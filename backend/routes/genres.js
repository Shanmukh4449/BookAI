const express = require('express');
const router  = express.Router();
const Genre   = require('../models/Genre');

const DEFAULT_GENRES = ['Fiction','Non-Fiction','Science','History','Romance','Thriller','Fantasy','Biography','Technology','Psychology'];

router.get('/', async (req, res) => {
  try {
    const customGenres = await Genre.find({}).select('name').lean();
    const customNames  = customGenres.map(g => g.name);
    const allGenres    = [...new Set([...DEFAULT_GENRES, ...customNames])];
    res.status(200).json({ success: true, genres: allGenres });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch genres.', genres: DEFAULT_GENRES });
  }
});

module.exports = router;