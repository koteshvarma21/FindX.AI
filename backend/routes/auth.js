const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function signToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, fullName, phone } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'username, email, and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const normalizedUsername = username.toLowerCase();
    const normalizedEmail = email.toLowerCase();

    let existing = await User.findOne({
      $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
    });

    if (existing && existing.password) {
      return res.status(409).json({ message: 'Username or email is already taken' });
    }

    if (!existing) {
      existing = await User.create({
        username: normalizedUsername,
        email: normalizedEmail,
        password,
        fullName,
        name: fullName,
        phone,
      });
    } else {
      existing.username = normalizedUsername;
      existing.password = password;
      existing.fullName = fullName || existing.fullName;
      existing.name = fullName || existing.name;
      existing.phone = phone || existing.phone;
      await existing.save();
    }

    const user = await User.findById(existing._id);
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'username and password are required' });
    }
    const normalizedUsername = username.toLowerCase();
    const user = await User.findOne({
      $or: [{ username: normalizedUsername }, { email: normalizedUsername }],
    });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    res.json({ token: signToken(user), user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  return res.json({ user });
});

router.patch('/profile', requireAuth, async (req, res) => {
  const { fullName, username } = req.body || {};
  if (!fullName && !username) return res.status(400).json({ message: 'fullName or username is required' });
  if (username && (!/^[a-zA-Z0-9_]{3,30}$/.test(username))) return res.status(400).json({ message: 'Invalid username' });
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (username) {
      const conflict = await User.findOne({ username: username.toLowerCase(), _id: { $ne: user._id } });
      if (conflict) return res.status(409).json({ message: 'Username is already taken' });
      user.username = username.toLowerCase();
    }
    if (fullName) { user.fullName = fullName.trim(); user.name = user.fullName; }
    await user.save();
    return res.json({ user });
  } catch (error) { console.error('Profile update error:', error.message); return res.status(500).json({ message: 'Failed to update profile' }); }
});

router.patch('/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || newPassword.length < 8) return res.status(400).json({ message: 'Current password and a new password of at least 8 characters are required' });
  try {
    const user = await User.findById(req.userId);
    if (!user || !(await user.comparePassword(currentPassword))) return res.status(401).json({ message: 'Current password is incorrect' });
    user.password = newPassword;
    await user.save();
    return res.json({ success: true, message: 'Password updated' });
  } catch (error) { console.error('Password update error:', error.message); return res.status(500).json({ message: 'Failed to update password' }); }
});

module.exports = router;