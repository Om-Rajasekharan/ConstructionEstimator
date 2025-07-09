const express = require('express');
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const User = require('../models/User');
const Project = require('../models/Project');

const router = express.Router();


const gcsKeyPath = path.join(__dirname, '../gcs-key.json');
const gcsBucketName = 'pdfs_and_responses';
const storage = new Storage({ keyFilename: gcsKeyPath });
const bucket = storage.bucket(gcsBucketName);

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

router.get('/manifest/:projectId/:docId', authUser, async (req, res) => {
  const { projectId, docId } = req.params;
  try {
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const file = project.files.id(docId);
    if (!file) return res.status(404).json({ error: 'Document not found' });
    if (String(project.owner) !== String(req.user._id)) return res.status(403).json({ error: 'Forbidden' });
    let manifestPath = null;
    if (file.gcsUrl && file.gcsUrl.endsWith('manifest.json')) {
      manifestPath = file.gcsUrl.replace(/^gs:\/\//, '').split('/').slice(1).join('/');
    }
    if (!manifestPath) return res.status(404).json({ error: 'Manifest not found' });
    const gcsFile = bucket.file(manifestPath);
    let data = '';
    const readStream = gcsFile.createReadStream();
    readStream
      .on('data', chunk => { data += chunk; })
      .on('end', () => {
        try {
          res.json(JSON.parse(data));
        } catch (e) {
          res.status(500).json({ error: 'Manifest is not valid JSON', details: e.message });
        }
      })
      .on('error', err => {
        res.status(500).json({ error: 'Failed to fetch manifest', details: err.message });
      });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.get('/:projectId/:docId/:pageNum', authUser, async (req, res) => {
  const { projectId, docId } = req.params;
  let pageNum = req.params.pageNum;
  const pageNumInt = parseInt(pageNum, 10);
  try {
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const file = project.files.id(docId);
    if (!file) return res.status(404).json({ error: 'Document not found' });
    if (String(project.owner) !== String(req.user._id)) return res.status(403).json({ error: 'Forbidden' });
    let imagePath = null;
    let manifestDebug = null;
    if (Array.isArray(file.pageImages) && file.pageImages.length >= pageNumInt) {
      const img = file.pageImages[pageNumInt - 1];
      if (img) {
        if (typeof img === 'string') {
          imagePath = img.replace(/^gs:\/\//, '').split('/').slice(1).join('/');
        } else if (img.gcsUrl) {
          imagePath = img.gcsUrl.replace(/^gs:\/\//, '').split('/').slice(1).join('/');
        }
      }
    }
    if (!imagePath && file.gcsUrl && file.gcsUrl.endsWith('manifest.json')) {
      const manifestPath = file.gcsUrl.replace(/^gs:\/\//, '').split('/').slice(1).join('/');
      const gcsFile = bucket.file(manifestPath);
      let data = '';
      await new Promise((resolve, reject) => {
        gcsFile.createReadStream()
          .on('data', chunk => { data += chunk; })
          .on('end', () => resolve())
          .on('error', err => reject(err));
      });
      try {
        const manifest = JSON.parse(data);
        manifestDebug = manifest;
        let pageImages = null;
        if (Array.isArray(manifest)) {
          pageImages = manifest;
        } else if (manifest && Array.isArray(manifest.pageImages)) {
          pageImages = manifest.pageImages;
        } else if (manifest && typeof manifest.pageImages === 'object') {
          pageImages = manifest.pageImages;
        }
        if (Array.isArray(pageImages) && pageImages.length >= pageNumInt) {
          const img = pageImages[pageNumInt - 1];
          if (img) {
            if (typeof img === 'string') {
              imagePath = img.replace(/^gs:\/\//, '').split('/').slice(1).join('/');
            } else if (img.gcsUrl) {
              imagePath = img.gcsUrl.replace(/^gs:\/\//, '').split('/').slice(1).join('/');
            }
          }
        } else if (pageImages && typeof pageImages === 'object') {
          const key = String(pageNumInt);
          const img = pageImages[key] || pageImages[pageNumInt];
          if (img) {
            if (typeof img === 'string') {
              imagePath = img.replace(/^gs:\/\//, '').split('/').slice(1).join('/');
            } else if (img.gcsUrl) {
              imagePath = img.gcsUrl.replace(/^gs:\/\//, '').split('/').slice(1).join('/');
            }
          }
        }
      } catch (e) {}
    }
    if (!imagePath) return res.status(404).json({ error: 'Image not found' });
    const gcsFile = bucket.file(imagePath);
    res.set('Content-Type', 'image/png');
    gcsFile.createReadStream()
      .on('error', err => {
        res.status(500).json({ error: 'Failed to fetch image', details: err.message });
      })
      .pipe(res);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;
