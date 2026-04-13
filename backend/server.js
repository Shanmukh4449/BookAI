const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// ✅ SOCKET.IO SETUP (Improved CORS)
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// ✅ Make io accessible in all routes
app.set('io', io);

// ── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

// ✅ Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests. Please try again later.' }
});
app.use('/api', limiter);

// ── MONGODB ──────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('✅ MongoDB Connected Successfully');
  await autoSeed();
})
.catch(err => {
  console.error('❌ MongoDB Error:', err.message);
  process.exit(1);
});

// ✅ AUTO SEED FUNCTION
async function autoSeed() {
  try {
    const Book = require('./models/Book');
    const count = await Book.countDocuments();

    if (count === 0) {
      console.log('📚 No books found — auto-seeding database...');
      const { seedDatabase } = require('./utils/seedBooks');
      await seedDatabase();
      console.log('✅ Auto-seed complete!');
    } else {
      console.log(`📚 Database has ${count} books — skipping seed.`);
    }
  } catch (err) {
    console.error('⚠️ Auto-seed error:', err.message);
  }
}

// ── ROUTES ───────────────────────────────────────────────────────────────────
const authRoutes      = require('./routes/auth');
const bookRoutes      = require('./routes/books');
const reviewRoutes    = require('./routes/reviews');
const recommendRoutes = require('./routes/recommendations');
const adminRoutes     = require('./routes/admin');
const wishlistRoutes  = require('./routes/wishlist');
const userRoutes      = require('./routes/user');
const genreRoutes     = require('./routes/genres');

app.use('/api/auth',            authRoutes);
app.use('/api/books',           bookRoutes);
app.use('/api/reviews',         reviewRoutes);
app.use('/api/recommendations', recommendRoutes);
app.use('/api/admin',           adminRoutes);
app.use('/api/wishlist',        wishlistRoutes);
app.use('/api/user',            userRoutes);
app.use('/api/genres',          genreRoutes);


// ── ROOT ─────────────────────────────────────────────────────────────────────
app.get('/api', (req, res) => {
  res.json({ message: 'BookAI API v2.0 Running ✅', version: '2.0.0' });
});

// ── FRONTEND FALLBACK (VERY IMPORTANT FOR DEPLOYMENT) ─────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ── ERROR HANDLER ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

// ── SOCKET.IO ─────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  socket.on('joinBook', (bookId) => {
    socket.join(`book:${bookId}`);
    console.log(`📖 Joined room: book:${bookId}`);
  });

  socket.on('leaveBook', (bookId) => {
    socket.leave(`book:${bookId}`);
    console.log(`📖 Left room: book:${bookId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// ── START SERVER ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running → http://localhost:${PORT}`);
});

// ✅ EXPORT
module.exports = { app, io };
