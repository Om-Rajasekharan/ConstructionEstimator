const express = require('express');
const multer = require('multer');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const { Storage } = require('@google-cloud/storage');
const Project = require('../models/Project');
const User = require('../models/User');
const projectsRoutes = require('./projects');

const router = express.Router();

const storage = new Storage({ keyFilename: path.join(__dirname, '../gcs-key.json') });
const bucket = storage.bucket('pdfs_and_responses');

const upload = multer({
  dest: path.join(__dirname, '../uploads'),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  }
});

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
async function authUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  try {
    const token = authHeader.split(' ')[1];
    const decoded = require('jsonwebtoken').verify(token, JWT_SECRET);
    req.user = await User.findById(decoded.userId);
    if (!req.user) return res.status(404).json({ error: 'User not found' });
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

router.post('/calculate', authUser, upload.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded.' });

  const gcsPdfFileName = `${Date.now()}_${req.file.originalname}`;
  const gcsPdfFile = bucket.file(gcsPdfFileName);
  await gcsPdfFile.save(fs.readFileSync(req.file.path), { contentType: 'application/pdf' });
  const gcsPdfUrl = `gs://${bucket.name}/${gcsPdfFileName}`;

  const pdfPath = req.file.path;
  console.log(`[PDFParser] Received calculate request. Starting processing for file: ${pdfPath}`);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const scriptPath = path.join(__dirname, '../prep/trajectory.py');
  const py = spawn('python', [scriptPath, pdfPath]);

  let aiResponse = null;
  let aiResponseChunks = [];

  py.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const chunk = JSON.parse(line);
        aiResponseChunks.push(chunk);
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      } catch (e) {
      }
    }
  });

  py.stderr.on('data', (data) => {
    console.error('[PDFParser] Python stderr:', data.toString());
    res.write(`event: error\ndata: {"error": ${JSON.stringify(data.toString())}}\n\n`);
  });

  py.on('close', async (code) => {
    fs.unlink(pdfPath, () => {});
    res.write('event: end\ndata: {"done": true}\n\n');
    res.end();

    aiResponse = aiResponseChunks.length ? aiResponseChunks[aiResponseChunks.length-1] : null;

    let gcsAiUrl = null;
    if (aiResponse) {
      const baseName = req.file.originalname.replace(/\.pdf$/i, '');
      const gcsAiFileName = `${Date.now()}_${baseName}_airesponse.json`;
      const gcsAiFile = bucket.file(gcsAiFileName);
      await gcsAiFile.save(Buffer.from(JSON.stringify(aiResponse)), { contentType: 'application/json' });
      gcsAiUrl = `gs://${bucket.name}/${gcsAiFileName}`;
    }

    const userId = req.user?._id;
    const { projectId, projectName, model, temperature, customPrompt } = req.body;
    if (projectId) {
      const updateFields = {
        owner: userId,
        gcsPdfUrl,
        gcsAiUrl,
        model,
        temperature,
        customPrompt,
      };
      if (projectName) {
        updateFields.name = projectName;
      }
      await Project.findByIdAndUpdate(
        projectId,
        updateFields,
        { new: true }
      );
    } else {
      await Project.create({
        name: projectName || req.file.originalname,
        owner: userId,
        gcsPdfUrl,
        gcsAiUrl,
        model,
        temperature,
        customPrompt,
      });
    }
  });
});

module.exports = router;
