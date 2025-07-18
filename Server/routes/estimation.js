const express = require('express');
const router = express.Router();
const path = require('path');
const { Storage } = require('@google-cloud/storage');

// Auth middleware (reuse from projects.js)
const { authUser } = require('./projects');

// GET estimation table for a project
router.get('/:projectId', authUser, async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const storage = new Storage({ keyFilename: path.join(__dirname, '../gcs-key.json') });
    const bucketName = process.env.GCS_BUCKET_NAME || 'pdfs_and_responses';
    const bucket = storage.bucket(bucketName);
    const estimationPath = `project_${projectId}/estimation_table.json`;
    const file = bucket.file(estimationPath);
    let exists = false;
    try {
      const [fileExists] = await file.exists();
      exists = fileExists;
    } catch {}
    if (!exists) {
      return res.status(404).json({ error: 'Estimation table not found' });
    }
    const [contents] = await file.download();
    const estimationTable = JSON.parse(contents.toString());
    res.json(estimationTable);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch estimation table' });
  }
});

// PUT estimation table for a project
router.put('/:projectId', authUser, async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const tableData = req.body;
    if (!tableData || typeof tableData !== 'object') {
      return res.status(400).json({ error: 'Invalid estimation table data' });
    }
    const storage = new Storage({ keyFilename: path.join(__dirname, '../gcs-key.json') });
    const bucketName = process.env.GCS_BUCKET_NAME || 'pdfs_and_responses';
    const bucket = storage.bucket(bucketName);
    const estimationPath = `project_${projectId}/estimation_table.json`;
    const file = bucket.file(estimationPath);
    await file.save(Buffer.from(JSON.stringify(tableData, null, 2)), { contentType: 'application/json' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update estimation table' });
  }
});

module.exports = router;
