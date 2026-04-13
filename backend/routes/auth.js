const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const User     = require('../models/User');
const { LoginHistory, PasswordReset } = require('../models/LoginHistory');
const sendOTPEmail = require('../utils/sendEmail');


// ── SIGNUP ────────────────────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, favorite_genre } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password required.'
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered. Please login.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const role = email.toLowerCase() === process.env.ADMIN_EMAIL
      ? 'admin'
      : 'user';

    const user = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      favorite_genre: favorite_genre || 'Fiction',
      role
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Account created! Please login.'
    });

  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({
      success: false,
      message: 'Signup failed.'
    });
  }
});


// ── LOGIN ─────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password required.'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

    await LoginHistory.create({
      user_id: user._id,
      email: user.email,
      ip_address: ip
    });

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        favorite_genre: user.favorite_genre
      }
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed.'
    });
  }
});


// ── FORGOT PASSWORD (SEND OTP) ────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.json({
        success: true,
        message: 'If email exists, OTP sent'
      });
    }

    await PasswordReset.deleteMany({ user_id: user._id });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await PasswordReset.create({
      user_id: user._id,
      otp,
      expiry_time: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0
    });

const emailSent = await sendOTPEmail(user.email, otp);

if (!emailSent) {
  return res.status(500).json({
    success: false,
    message: 'Failed to send OTP. Try again later.'
  });
}

    res.json({
      success: true,
      message: 'OTP sent to email'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Error sending OTP'
    });
  }
});


// ── RESEND OTP ────────────────────────────────────────────────────────────────
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.json({
        success: true,
        message: 'If email exists, OTP sent'
      });
    }

    await PasswordReset.deleteMany({ user_id: user._id });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await PasswordReset.create({
      user_id: user._id,
      otp,
      expiry_time: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0
    });

    await sendOTPEmail(user.email, otp);

    res.json({
      success: true,
      message: 'OTP resent successfully'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Error resending OTP'
    });
  }
});


// ── RESET PASSWORD (VERIFY OTP + LIMIT ATTEMPTS) ──────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user'
      });
    }

    const record = await PasswordReset.findOne({
      user_id: user._id,
      otp
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // 🚫 attempt limit
    if (record.attempts >= 5) {
      return res.status(400).json({
        success: false,
        message: 'Too many attempts. Please request new OTP.'
      });
    }

    // ⏳ expiry check
    if (record.expiry_time < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired'
      });
    }

    // increment attempts
    record.attempts += 1;
    await record.save();

    // 🔐 update password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await user.save();

    // cleanup
    await PasswordReset.deleteMany({ user_id: user._id });

    res.json({
      success: true,
      message: 'Password reset successful'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Reset failed'
    });
  }
});

module.exports = router;
