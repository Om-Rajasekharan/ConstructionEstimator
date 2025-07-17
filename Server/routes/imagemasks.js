const express = require('express');
const router = express.Router();
const { Storage } = require('@google-cloud/storage');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');


const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'pdfs_and_responses';
const storage = new Storage();
const Project = require('../models/Project');

router.post('/mask-page', async (req, res) => {
  try {
    console.log('[imagemasks] POST /mask-page hit');
    const { projectId, docId, pageNum } = req.body;
    console.log('[imagemasks] Body:', req.body);
    if (!projectId || !docId || !pageNum) {
      console.log('[imagemasks] Missing required fields');
      return res.status(400).json({ error: 'Missing projectId, docId, or pageNum' });
    }

    // see conversation.js
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const file = project.files.id(docId);
    if (!file) return res.status(404).json({ error: 'Document not found' });
    let pageData = null;
    if (Array.isArray(file.pageImages) && file.pageImages.length >= pageNum) {
      pageData = file.pageImages[pageNum - 1];
      console.log('[imagemasks] Found pageData in file.pageImages:', pageData);
    }
    if (!pageData && file.gcsUrl && file.gcsUrl.endsWith('manifest.json')) {
      console.log('[imagemasks] Trying to fetch manifest for pageData...');
      const manifestPath = file.gcsUrl.replace(/^gs:\/\//, '').split('/').slice(1).join('/');
      const bucket = storage.bucket(BUCKET_NAME);
      const manifestFile = bucket.file(manifestPath);
      let data = '';
      await new Promise((resolve, reject) => {
        manifestFile.createReadStream()
          .on('data', chunk => { data += chunk; })
          .on('end', () => resolve())
          .on('error', err => reject(err));
      });
      try {
        const manifest = JSON.parse(data);
        console.log('[imagemasks] Manifest loaded:', manifest);
        if (Array.isArray(manifest) && manifest.length >= pageNum) {
          pageData = manifest[pageNum - 1];
          console.log('[imagemasks] Found pageData in manifest array:', pageData);
        } else if (manifest && Array.isArray(manifest.pageImages) && manifest.pageImages.length >= pageNum) {
          pageData = manifest.pageImages[pageNum - 1];
          console.log('[imagemasks] Found pageData in manifest.pageImages array:', pageData);
        } else if (manifest && typeof manifest.pageImages === 'object') {
          const key = String(pageNum);
          pageData = manifest.pageImages[key] || manifest.pageImages[pageNum];
          console.log('[imagemasks] Found pageData in manifest.pageImages object:', pageData);
        }
      } catch (e) {
        console.error('[imagemasks] Error parsing manifest:', e.message);
      }
    }
    let pageImagePath = null;
    if (pageData) {
      if (typeof pageData === 'string') {
        pageImagePath = pageData.replace(/^gs:\/\//, '').split('/').slice(1).join('/');
      } else if (pageData.imageGcsUrl) {
        pageImagePath = pageData.imageGcsUrl.replace(/^gs:\/\//, '').split('/').slice(1).join('/');
      } else if (pageData.gcsUrl) {
        pageImagePath = pageData.gcsUrl.replace(/^gs:\/\//, '').split('/').slice(1).join('/');
      }
    }
    if (!pageImagePath) {
      let basePath = null;
      if (file.gcsUrl && file.gcsUrl.endsWith('manifest.json')) {
        basePath = file.gcsUrl.replace(/^gs:\/\//, '').split('/').slice(1, -1).join('/');
      } else if (file.gcsUrl) {
        basePath = file.gcsUrl.replace(/^gs:\/\//, '').split('/').slice(1, -1).join('/');
      }
      if (basePath) {
        pageImagePath = `${basePath}/page_${pageNum}.png`;
        console.log('[imagemasks] Fallback pageImagePath:', pageImagePath);
      }
    }
    if (!pageImagePath) {
      console.log('[imagemasks] Could not resolve page image path');
      return res.status(404).json({ error: 'Could not resolve page image path' });
    }

    // Download the PNG from GCS to a temp file
    const tempImagePath = path.join(__dirname, `temp_mask_input_${projectId}_${docId}_${pageNum}_${Date.now()}.png`);
    const bucket = storage.bucket(BUCKET_NAME);
    const pageFile = bucket.file(pageImagePath);
    await pageFile.download({ destination: tempImagePath });
    console.log('[imagemasks] Downloaded page image to:', tempImagePath);

    // Run mask.py for this image
    const pythonPath = path.join(__dirname, '..', 'takeoff', 'mask.py');
    const env = { ...process.env, PAGE_NUM: pageNum };
    console.log('[imagemasks] Running mask.py:', pythonPath, tempImagePath);
    await new Promise((resolve, reject) => {
      const proc = spawn('python', [pythonPath, tempImagePath], { env });
      proc.stdout.on('data', d => process.stdout.write('[mask.py stdout] ' + d));
      proc.stderr.on('data', d => process.stderr.write('[mask.py stderr] ' + d));
      proc.on('close', code => code === 0 ? resolve() : reject(new Error('mask.py failed')));
    });

    // Output mask path (as written by mask.py)
    const outputMaskPath = path.join(__dirname, '..', 'takeoff', 'output', 'room_mask_overlay.png');
    const outputJsonPath = path.join(__dirname, '..', 'takeoff', 'output', 'roomplanner_results.json');
    console.log('[imagemasks] Looking for output mask at:', outputMaskPath);
    if (!fs.existsSync(outputMaskPath)) {
      console.log('[imagemasks] Mask output not found:', outputMaskPath);
      return res.status(500).json({ error: 'Mask output not found' });
    }
    if (!fs.existsSync(outputJsonPath)) {
      console.log('[imagemasks] Mask JSON not found:', outputJsonPath);
      // Not fatal, but warn
    }

    // Compose GCS path for the mask using manifest/image folder structure
    let maskFolder = null;
    if (file.gcsUrl) {
      // Remove gs://BUCKET_NAME/ prefix and manifest.json suffix
      const parts = file.gcsUrl.replace(/^gs:\/\//, '').split('/');
      // Remove bucket name
      if (parts[0] === BUCKET_NAME) parts.shift();
      // Remove manifest.json or any file name at the end
      if (parts.length && parts[parts.length - 1].endsWith('.json')) parts.pop();
      maskFolder = parts.join('/');
    }
    if (!maskFolder) {
      maskFolder = `${projectId}/${docId}`;
      console.log('[imagemasks] Fallback maskFolder:', maskFolder);
    }
    const gcsPath = `${maskFolder}/page_${pageNum}_mask.png`;
    const maskFile = bucket.file(gcsPath);
    await maskFile.save(fs.readFileSync(outputMaskPath), { contentType: 'image/png' });
    console.log('[imagemasks] Uploaded mask to GCS:', gcsPath);

    // Also upload the mask JSON file
    if (fs.existsSync(outputJsonPath)) {
      const jsonGcsPath = `${maskFolder}/page_${pageNum}_mask.json`;
      const jsonFile = bucket.file(jsonGcsPath);
      await jsonFile.save(fs.readFileSync(outputJsonPath), { contentType: 'application/json' });
      console.log('[imagemasks] Uploaded mask JSON to GCS:', jsonGcsPath);
    }

    // Return the GCS URL for the mask
    const gcsUrl = `gs://${BUCKET_NAME}/${gcsPath}`;
    res.json({ maskUrl: gcsUrl });

    // Cleanup temp image
    try { fs.unlinkSync(tempImagePath); } catch {}
  } catch (err) {
    console.error('[imagemasks] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Proxy GCS image/mask to browser
router.get('/imageproxy', async (req, res) => {
  try {
    const gcsUrl = req.query.gcsUrl;
    console.log('[imageproxy] Requested gcsUrl:', gcsUrl);
    if (!gcsUrl || !gcsUrl.startsWith('gs://')) {
      console.error('[imageproxy] Invalid gcsUrl:', gcsUrl);
      return res.status(400).send('Missing or invalid gcsUrl');
    }
    const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'pdfs_and_responses';
    const parts = gcsUrl.replace(/^gs:\/\//, '').split('/');
    let bucketName = BUCKET_NAME;
    if (parts[0] !== BUCKET_NAME) bucketName = parts[0];
    const filePath = parts.slice(1).join('/');
    console.log('[imageproxy] Using bucket:', bucketName, 'filePath:', filePath);
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);
    try {
      const [meta] = await file.getMetadata();
      console.log('[imageproxy] File metadata:', meta);
      res.set('Content-Type', meta.contentType || 'image/png');
      file.createReadStream()
        .on('error', err => {
          console.error('[imageproxy] Error streaming file:', err);
          res.status(404).send('File not found');
        })
        .pipe(res);
    } catch (metaErr) {
      console.error('[imageproxy] Error getting metadata for', bucketName, filePath, metaErr);
      res.status(404).send('File not found (metadata error)');
    }
  } catch (err) {
    console.error('[imageproxy] Fatal error:', err);
    res.status(500).send('Internal error');
  }
});

module.exports = router;
