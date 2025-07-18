const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const UI_URL = process.env.UI_URL;

router.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false }));
router.use(passport.initialize());
router.use(passport.session());

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      user = await User.create({
        googleId: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
      });
    }
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// User signup route
router.post('/signup', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ error: 'User exists' });
  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password: hash, name });
  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { email: user.email, name: user.name, company: user.company || '' } });
});

// User signin route
router.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { email: user.email, name: user.name, company: user.company || '' } });
});

// Google OAuth login route
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google OAuth callback route
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    const token = jwt.sign({ userId: req.user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.redirect(`${UI_URL}/auth-success?token=${token}`);
  }
);

// Complete profile for Google sign-in users
router.post('/complete-profile', async (req, res) => {
  try {
    console.log('--- /complete-profile DEBUG ---');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log('No Authorization header');
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    console.log('Extracted token:', token);
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log('Decoded JWT:', decoded);
    } catch (jwtErr) {
      console.log('JWT verification error:', jwtErr);
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    const userId = decoded.userId;
    const { name, company } = req.body;
    if (!name || !company) {
      console.log('Missing fields:', { name, company });
      return res.status(400).json({ error: 'Missing fields' });
    }
    const user = await User.findByIdAndUpdate(userId, { name, company }, { new: true });
    if (!user) {
      console.log('User not found for userId:', userId);
      return res.status(404).json({ error: 'User not found' });
    }
    console.log('Profile updated for user:', user.email);
    res.json({ user: { email: user.email, name: user.name, company: user.company } });
  } catch (err) {
    console.log('General error in /complete-profile:', err);
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

// Get current user info
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;