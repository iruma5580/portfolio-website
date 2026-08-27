/**
 * routes/admin.js — Protected CRUD endpoints for portfolio data
 */
'use strict';

const express    = require('express');
const fs         = require('fs');
const path       = require('path');
const multer     = require('multer');
const bcrypt     = require('bcryptjs');
const requireAuth = require('../middleware/requireAuth');

const router   = express.Router();
const DATA_FILE = path.join(__dirname, '../data/portfolio.json');

/* ─── HELPERS ─────────────────────────────────────── */
const readData  = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const writeData = (data) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');

/* ─── MULTER — Image Upload ───────────────────────── */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../assets/images');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const projectId = req.params.projectId;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${projectId}_preview${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

/* ─── ALL ROUTES REQUIRE AUTH ─────────────────────── */
router.use(requireAuth);

/* ─── GET /api/admin/data ─────────────────────────── */
router.get('/data', (req, res) => {
  try {
    res.json(readData());
  } catch (e) {
    res.status(500).json({ error: 'Could not read portfolio data' });
  }
});

/* ─── PUT /api/admin/profile ──────────────────────── */
router.put('/profile', (req, res) => {
  try {
    const data = readData();
    const { name, role, intro, badge, about } = req.body;
    if (name  !== undefined) data.profile.name  = name;
    if (role  !== undefined) data.profile.role  = role;
    if (intro !== undefined) data.profile.intro = intro;
    if (badge !== undefined) data.profile.badge = badge;
    if (about !== undefined) data.profile.about = about;
    writeData(data);
    res.json({ success: true, profile: data.profile });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── PUT /api/admin/contact ──────────────────────── */
router.put('/contact', (req, res) => {
  try {
    const data = readData();
    const { email, github, linkedin, facebook } = req.body;
    if (email    !== undefined) data.contact.email    = email;
    if (github   !== undefined) data.contact.github   = github;
    if (linkedin !== undefined) data.contact.linkedin = linkedin;
    if (facebook !== undefined) data.contact.facebook = facebook;
    writeData(data);
    res.json({ success: true, contact: data.contact });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── PUT /api/admin/projects/:projectId ──────────── */
router.put('/projects/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const data = readData();

    if (!data.projects[projectId]) {
      return res.status(404).json({ error: `Project "${projectId}" not found` });
    }

    const allowed = ['title', 'category', 'overview', 'problem', 'solution',
                     'process', 'result', 'github', 'figma', 'live',
                     'features', 'tech'];

    allowed.forEach(key => {
      if (req.body[key] !== undefined) {
        data.projects[projectId][key] = req.body[key];
      }
    });

    writeData(data);
    res.json({ success: true, project: data.projects[projectId] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── POST /api/admin/projects/:projectId/image ───── */
router.post('/projects/:projectId/image', upload.single('image'), (req, res) => {
  try {
    const { projectId } = req.params;
    const data = readData();

    if (!data.projects[projectId]) {
      return res.status(404).json({ error: `Project "${projectId}" not found` });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Update the imgSrc path to the uploaded file
    const imgSrc = `assets/images/${req.file.filename}`;
    data.projects[projectId].imgSrc = imgSrc;
    writeData(data);

    res.json({ success: true, imgSrc });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── POST /api/admin/change-password ─────────────── */
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current and new password are required' });
    }

    const valid = await bcrypt.compare(currentPassword, req.app.locals.adminHash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Update the in-memory hash
    req.app.locals.adminHash = await bcrypt.hash(newPassword, 12);

    // Also update .env file
    const envPath = path.join(__dirname, '../.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    envContent = envContent.replace(/^ADMIN_PASSWORD=.*/m, `ADMIN_PASSWORD=${newPassword}`);
    fs.writeFileSync(envPath, envContent, 'utf8');

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── PUT /api/admin/experience ───────────────────── */
router.put('/experience', (req, res) => {
  try {
    const data = readData();
    const { experience } = req.body;
    if (experience !== undefined && Array.isArray(experience)) {
      data.experience = experience;
      writeData(data);
      res.json({ success: true, experience: data.experience });
    } else {
      res.status(400).json({ error: 'Invalid experience data format' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
