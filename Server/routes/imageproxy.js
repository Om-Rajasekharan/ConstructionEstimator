
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
    if (!project) {
      console.error('Project not found', { projectId });
      return res.status(404).json({ error: 'Project not found' });
    }
    const file = project.files.id(docId);
    if (!file) {
      console.error('Document not found', { docId, files: project.files });
      return res.status(404).json({ error: 'Document not found' });
    }
    if (String(project.owner) !== String(req.user._id)) return res.status(403).json({ error: 'Forbidden' });
    let imagePath = null;
    let manifestDebug = null;
    let manifestDir = null;
    if (file.gcsUrl && file.gcsUrl.endsWith('manifest.json')) {
      const manifestPathParts = file.gcsUrl.replace(/^gs:\/\//, '').split('/').slice(1); // remove bucket
      manifestDir = manifestPathParts.slice(0, -1).join('/');
    }
    if (Array.isArray(file.pageImages) && file.pageImages.length >= pageNumInt) {
      const img = file.pageImages[pageNumInt - 1];
      if (img) {
        if (typeof img === 'string') {
          if (img.startsWith('gs://')) {
            imagePath = img.replace(/^gs:\/\//, '').split('/').slice(1).join('/');
          } else if (manifestDir && !img.startsWith('/')) {
            imagePath = manifestDir + '/' + img;
          } else {
            imagePath = img;
          }
        } else if (img.imageGcsUrl) {
          imagePath = img.imageGcsUrl.replace(/^gs:\/\//, '').split('/').slice(1).join('/');
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
              if (img.startsWith('gs://')) {
                imagePath = img.replace(/^gs:\/\//, '').split('/').slice(1).join('/');
              } else if (manifestDir && !img.startsWith('/')) {
                imagePath = manifestDir + '/' + img;
              } else {
                imagePath = img;
              }
            } else if (img.imageGcsUrl) {
              imagePath = img.imageGcsUrl.replace(/^gs:\/\//, '').split('/').slice(1).join('/');
            } else if (img.gcsUrl) {
              imagePath = img.gcsUrl.replace(/^gs:\/\//, '').split('/').slice(1).join('/');
            }
          }
        } else if (pageImages && typeof pageImages === 'object') {
          const key = String(pageNumInt);
          const img = pageImages[key] || pageImages[pageNumInt];
          if (img) {
            if (typeof img === 'string') {
              if (img.startsWith('gs://')) {
                imagePath = img.replace(/^gs:\/\//, '').split('/').slice(1).join('/');
              } else if (manifestDir && !img.startsWith('/')) {
                imagePath = manifestDir + '/' + img;
              } else {
                imagePath = img;
              }
            } else if (img.imageGcsUrl) {
              imagePath = img.imageGcsUrl.replace(/^gs:\/\//, '').split('/').slice(1).join('/');
            } else if (img.gcsUrl) {
              imagePath = img.gcsUrl.replace(/^gs:\/\//, '').split('/').slice(1).join('/');
            }
          }
        }
      } catch (e) {
        console.error('Manifest parse error', { error: e, data });
      }
    }
    if (!imagePath) {
      console.error('Image not found', { projectId, docId, pageNum, manifestDebug });
      return res.status(404).json({ error: 'Image not found' });
    }
    const gcsFile = bucket.file(imagePath);
    res.set('Content-Type', 'image/png');
    gcsFile.createReadStream()
      .on('error', err => {
        res.status(500).json({ error: 'Failed to fetch image', details: err.message });
      })
      .pipe(res);
  } catch (err) {
    console.error('Server error', { error: err });
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.get('/conversation/:projectId', authUser, async (req, res) => {
  const { projectId } = req.params;
  try {
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (String(project.owner) !== String(req.user._id)) return res.status(403).json({ error: 'Forbidden' });
    
    // Try to get AI response from project.aiUrl first, then fallback to default path
    let aiResponsePath = null;
    if (project.aiUrl) {
      aiResponsePath = project.aiUrl.replace(/^gs:\/\//, '').split('/').slice(1).join('/');
    } else {
      aiResponsePath = `project_${projectId}/ai_response.json`;
    }
    
    const gcsFile = bucket.file(aiResponsePath);
    let data = '';
    const readStream = gcsFile.createReadStream();
    readStream
      .on('data', chunk => { data += chunk; })
      .on('end', () => {
        try {
          const aiResponse = JSON.parse(data);
          const conversation = aiResponse.conversation || [];
          res.json({ conversation });
        } catch (e) {
          // If file doesn't exist or is invalid, return empty conversation
          res.json({ conversation: [] });
        }
      })
      .on('error', err => {
        // If file doesn't exist, return empty conversation
        res.json({ conversation: [] });
      });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Stream mask image for a given page
router.get('/:projectId/:docId/:pageNum/mask', authUser, async (req, res) => {
  const { projectId, docId, pageNum } = req.params;
  const pageNumInt = parseInt(pageNum, 10);
  try {
    const project = await Project.findById(projectId);
    if (!project) {
      console.error('Project not found', { projectId });
      return res.status(404).json({ error: 'Project not found' });
    }
    const file = project.files.id(docId);
    if (!file) {
      console.error('Document not found', { docId, files: project.files });
      return res.status(404).json({ error: 'Document not found' });
    }
    if (String(project.owner) !== String(req.user._id)) return res.status(403).json({ error: 'Forbidden' });
    // Mask path: project_<projectId>/<docFolder>/page_<pageNum>_mask.png
    let maskPath = null;
    if (file.gcsUrl && file.gcsUrl.includes('/')) {
      // Extract folder from gcsUrl
      const parts = file.gcsUrl.replace(/^gs:\/\//, '').split('/').slice(1, -1);
      const folder = parts.join('/');
      maskPath = `${folder}/page_${pageNumInt}_mask.png`;
    }
    if (!maskPath) {
      return res.status(404).json({ error: 'Mask image path not found' });
    }
    const gcsFile = bucket.file(maskPath);
    // Check if file exists before streaming
    try {
      const [exists] = await gcsFile.exists();
      if (!exists) {
        return res.status(404).json({ error: 'Mask file does not exist in GCS', maskPath });
      }
    } catch (existErr) {
      return res.status(500).json({ error: 'Error checking mask file existence', details: existErr.message });
    }
    res.set('Content-Type', 'image/png');
    gcsFile.createReadStream()
      .on('error', err => {
        res.status(500).json({ error: 'Failed to fetch mask image', details: err.message });
      })
      .pipe(res);
  } catch (err) {
    console.error('Server error', { error: err });
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Fetch mask JSON for a given page
router.get('/mask-json', authUser, async (req, res) => {
  try {
    const { projectId, docId, pageNum } = req.query;
    if (!projectId || !docId || !pageNum) {
      return res.status(400).json({ error: 'Missing projectId, docId, or pageNum' });
    }
    // Find project and file for owner validation and folder extraction
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const file = project.files.id(docId);
    if (!file) {
      return res.status(404).json({ error: 'Document not found' });
    }
    if (String(project.owner) !== String(req.user._id)) return res.status(403).json({ error: 'Forbidden' });
    // Compose GCS path for mask JSON, consistent with mask image route
    let maskJsonPath = null;
    if (file.gcsUrl && file.gcsUrl.includes('/')) {
      const parts = file.gcsUrl.replace(/^gs:\/\//, '').split('/').slice(1, -1);
      const folder = parts.join('/');
      maskJsonPath = `${folder}/page_${parseInt(pageNum, 10)}_mask.json`;
    }
    if (!maskJsonPath) {
      console.error('[imageproxy/mask-json] Mask JSON path not found', { projectId, docId, pageNum });
      return res.status(404).json({ error: 'Mask JSON path not found' });
    }
    console.log(`[imageproxy/mask-json] Attempting to fetch mask JSON from GCS: ${maskJsonPath}`);
    const jsonFile = bucket.file(maskJsonPath);
    try {
      const [exists] = await jsonFile.exists();
      if (!exists) {
        console.error('[imageproxy/mask-json] Mask JSON file does not exist in GCS:', maskJsonPath);
        return res.status(404).json({ error: 'Mask JSON not found', maskJsonPath });
      } else {
        console.log(`[imageproxy/mask-json] Mask JSON file exists in GCS: ${maskJsonPath}`);
      }
    } catch (existErr) {
      console.error('[imageproxy/mask-json] Error checking mask JSON file existence:', existErr);
      return res.status(500).json({ error: 'Error checking mask JSON file existence', details: existErr.message });
    }
    const [contents] = await jsonFile.download();
    res.set('Content-Type', 'application/json');
    res.send(contents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
