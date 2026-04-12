const express  = require('express');
const router   = express.Router();
const natural  = require('natural');
const Book     = require('../models/Book');
const User     = require('../models/User');
const { protect } = require('../middleware/auth');

const TfIdf    = natural.TfIdf;
const tokenizer = new natural.WordTokenizer();
const stemmer  = natural.PorterStemmer;

function buildTfIdf(books) {
  const tfidf = new TfIdf();
  books.forEach(book => {
    const text = `${book.title} ${book.author} ${book.genre} ${book.genre} ${book.description}`;
    const tokens = tokenizer.tokenize(text.toLowerCase());
    tfidf.addDocument(tokens.map(t => stemmer.stem(t)).join(' '));
  });
  return tfidf;
}

function getVector(tfidf, index) {
  const vec = {};
  tfidf.listTerms(index).forEach(item => { vec[item.term] = item.tfidf; });
  return vec;
}

function cosineSimilarity(vecA, vecB) {
  let dot = 0;
  for (const term in vecA) { if (vecB[term]) dot += vecA[term] * vecB[term]; }
  const magA = Math.sqrt(Object.values(vecA).reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(Object.values(vecB).reduce((s, v) => s + v * v, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

// BASIC (Genre-based)
router.get('/basic', protect, async (req, res) => {
  try {
    const user  = await User.findById(req.user.id);
    const genre = user.favorite_genre || 'Fiction';
    const books = await Book.find({ genre }).sort({ rating: -1 }).limit(8);
    res.status(200).json({ success: true, type: 'basic', reason: `Based on your favourite genre: ${genre}`, books });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Recommendation failed.' });
  }
});

// AI (TF-IDF + Cosine Similarity)
router.get('/ai', protect, async (req, res) => {
  try {
    const { book_id } = req.query;
    const topN = parseInt(req.query.topN) || 5;
    if (!book_id) {
      const user  = await User.findById(req.user.id);
      const books = await Book.find({ genre: user.favorite_genre }).sort({ rating: -1 }).limit(6);
      return res.status(200).json({ success: true, type: 'ai', algorithm: 'TF-IDF + Cosine Similarity (genre fallback)', books });
    }
    const allBooks = await Book.find({});
    if (allBooks.length < 2) return res.status(200).json({ success: true, books: [] });
    const targetIdx = allBooks.findIndex(b => b._id.toString() === book_id);
    if (targetIdx === -1) return res.status(404).json({ success: false, message: 'Book not found.' });
    const tfidf     = buildTfIdf(allBooks);
    const targetVec = getVector(tfidf, targetIdx);
    const results = allBooks
      .map((book, idx) => {
        if (idx === targetIdx) return null;
        return { book, score: cosineSimilarity(targetVec, getVector(tfidf, idx)) };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
      .map(item => ({ ...item.book.toObject(), similarity_score: Math.round(item.score * 100) / 100 }));
    res.status(200).json({
      success: true, type: 'ai',
      algorithm: 'TF-IDF + Cosine Similarity (Content-Based Filtering)',
      target_book: allBooks[targetIdx].title, books: results
    });
  } catch (error) {
    console.error('AI Rec Error:', error);
    res.status(500).json({ success: false, message: 'AI recommendation failed.' });
  }
});

module.exports = router;