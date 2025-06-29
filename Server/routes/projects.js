const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Project = require('../models/Project');
const router = express.Router();
const path = require('path');
const { Storage } = require('@google-cloud/storage');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

async function authUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(decoded.userId);
    if (!req.user) return res.status(404).json({ error: 'User not found' });
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

router.get('/', authUser, async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json({ projects });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

router.post('/', authUser, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name required' });
  try {
    const project = await Project.create({ name, owner: req.user._id });
    const projects = await Project.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json({ project, projects });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// GET /api/projects/:id - fetch a single project by ID
router.get('/:id', authUser, async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  const storage = new Storage({ keyFilename: path.join(__dirname, '../gcs-key.json') });
  const bucket = storage.bucket('pdfs_and_responses');
  let pdfUrl = null;
  let aiUrl = null;
  if (project.gcsPdfUrl) {
    const pdfFile = bucket.file(project.gcsPdfUrl.split('/').pop());
    [pdfUrl] = await pdfFile.getSignedUrl({ action: 'read', expires: Date.now() + 60 * 60 * 1000 });
  }
  if (project.gcsAiUrl) {
    const aiFile = bucket.file(project.gcsAiUrl.split('/').pop());
    [aiUrl] = await aiFile.getSignedUrl({ action: 'read', expires: Date.now() + 60 * 60 * 1000 });
  }
  res.json({ ...project.toObject(), pdfUrl, aiUrl });
});

module.exports = router;
