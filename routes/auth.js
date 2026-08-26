/**
 * routes/auth.js — Login & token endpoints
 */
'use strict';

const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const router  = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  // Compare against the hashed password stored in memory (seeded at startup)
  const valid = await bcrypt.compare(password, req.app.locals.adminHash);

  if (!valid) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  // Issue a JWT valid for 24 hours
  const token = jwt.sign(
    { role: 'admin', iat: Date.now() },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({ success: true, token });
});

// GET /api/auth/verify — check if current token is valid
router.get('/verify', require('../middleware/requireAuth'), (req, res) => {
  res.json({ valid: true, admin: req.admin });
});

module.exports = router;
