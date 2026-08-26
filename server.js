/**
 * server.js — Portfolio Admin Backend
 * Jhon Eric Arbas Portfolio
 *
 * Usage:
 *   node server.js
 *
 * Then open:
 *   http://localhost:3000        → Portfolio
 *   http://localhost:3000/admin  → Admin Panel
 */
'use strict';

// Load .env locally; on Render, env vars are injected by the platform
try {
  require('dotenv').config();
} catch (e) {
  // Ignore error if dotenv is not present
}

const express = require('express');
const path    = require('path');
const bcrypt  = require('bcryptjs');
const fs      = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

/* ─── VALIDATE ENV ────────────────────────────────── */
if (!process.env.ADMIN_PASSWORD) {
  console.error('❌  ADMIN_PASSWORD is not set in .env');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error('❌  JWT_SECRET is not set in .env');
  process.exit(1);
}

/* ─── MIDDLEWARE ──────────────────────────────────── */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static portfolio files
app.use(express.static(path.join(__dirname)));

// Serve admin panel files
app.use('/admin', express.static(path.join(__dirname, 'admin')));

/* ─── HASH PASSWORD ON STARTUP ────────────────────── */
(async () => {
  const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
  app.locals.adminHash = hash;
  console.log('✓  Admin password hashed and ready');
})();

/* ─── PUBLIC API ──────────────────────────────────── */
// GET /api/data — public endpoint the portfolio reads
app.get('/api/data', (req, res) => {
  try {
    const dataPath = path.join(__dirname, 'data', 'portfolio.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Could not load portfolio data' });
  }
});

/* ─── AUTH ROUTES ─────────────────────────────────── */
app.use('/api/auth', require('./routes/auth'));

/* ─── ADMIN API ROUTES ────────────────────────────── */
app.use('/api/admin', require('./routes/admin'));

/* ─── ADMIN PANEL HTML ────────────────────────────── */
// /admin and /admin/* all serve the admin SPA
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});
app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});

/* ─── PORTFOLIO FALLBACK ──────────────────────────── */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

/* ─── START ───────────────────────────────────────── */
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║   Jhon Eric Arbas — Portfolio Server     ║');
  console.log('  ╠══════════════════════════════════════════╣');
  console.log(`  ║   Portfolio  → http://localhost:${PORT}      ║`);
  console.log(`  ║   Admin      → http://localhost:${PORT}/admin ║`);
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');
  console.log(`  ℹ  Default password: ${process.env.ADMIN_PASSWORD}`);
  console.log('  ℹ  Change it at: http://localhost:3000/admin/dashboard → Settings');
  console.log('');
});
