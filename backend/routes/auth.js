const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

module.exports = router;