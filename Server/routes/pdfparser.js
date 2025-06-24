const express = require('express');
const multer = require('multer');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const router = express.Router();

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

router.post('/calculate', upload.single('pdf'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file uploaded.' });
  }
  const pdfPath = req.file.path;
  const scriptPath = path.join(__dirname, '../prep/trajectory.py');

  console.log(`[PDFParser] Received calculate request. Starting processing for file: ${pdfPath}`);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const py = spawn('python', [scriptPath, pdfPath]);

  py.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const chunk = JSON.parse(line);
        console.log('[PDFParser] Progress chunk:', chunk);
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      } catch (e) {
      }
    }
  });

  py.stderr.on('data', (data) => {
    console.error('[PDFParser] Python stderr:', data.toString());
    res.write(`event: error\ndata: {"error": ${JSON.stringify(data.toString())}}\n\n`);
  });

  py.on('close', (code) => {
    fs.unlink(pdfPath, () => {});
    res.write('event: end\ndata: {"done": true}\n\n');
    res.end();
  });
});

module.exports = router;
