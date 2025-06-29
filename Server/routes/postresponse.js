const express = require('express');
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const Project = require('../models/Project');
const User = require('../models/User');
const router = express.Router();

const storage = new Storage({ keyFilename: path.join(__dirname, '../gcs-key.json') });
const bucket = storage.bucket('pdfs_and_responses');

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


router.get('/:projectId', authUser, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project || !project.gcsAiUrl) {
      return res.status(404).json({ error: 'No AI response found for this project.' });
    }
    const gcsPath = project.gcsAiUrl.replace(/^gs:\/\//, '');
    const [bucketName, ...fileParts] = gcsPath.split('/');
    const filePath = fileParts.join('/');
    const file = storage.bucket(bucketName).file(filePath);
    const [contents] = await file.download();
    const responseJson = JSON.parse(contents.toString());
    res.json({
      ...responseJson,
      gcsAiUrl: project.gcsAiUrl
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch AI response', details: err.message });
  }
});

router.post('/:projectId', authUser, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project || !project.gcsAiUrl) {
      return res.status(404).json({ error: 'No AI response found for this project.' });
    }
    const gcsPath = project.gcsAiUrl.replace(/^gs:\/\//, '');
    const [bucketName, ...fileParts] = gcsPath.split('/');
    const filePath = fileParts.join('/');
    const file = storage.bucket(bucketName).file(filePath);
    const [contents] = await file.download();
    let aiResponse = JSON.parse(contents.toString());
    const originalAiResponse = JSON.parse(contents.toString()); // Deep copy for before/after logging


    if (!aiResponse.conversation) aiResponse.conversation = [];
    if (req.body && (req.body.question || req.body.answer)) {
      const appendedEntry = {
        ...(req.body.question !== undefined ? { question: req.body.question } : {}),
        ...(req.body.answer !== undefined ? { answer: req.body.answer } : {}),
        timestamp: new Date().toISOString()
      };
      aiResponse.conversation.push(appendedEntry);
      if (req.body.answer && typeof req.body.answer === 'string') {
        const match = req.body.answer.match(/```json[\s\n]*([\s\S]*?)```/i) || req.body.answer.match(/```[\s\n]*([\s\S]*?)```/i);
        if (match && match[1]) {
          try {
            const jsonStr = match[1].trim();
            const parsed = JSON.parse(jsonStr);
            if (parsed && typeof parsed === 'object') {
              const canonicalKeys = [
                'metadata','materials','labor','equipment','permits_and_licenses','insurance_and_bonds','subcontractors_and_vendors','timeline_and_scheduling','site_conditions_and_preparation','safety_and_compliance','overhead_and_profit','contingencies_and_allowances','quality_control_and_testing','closeout_and_warranty','section_costs','total_bid','section_costs_explanation'
              ];
              const parsedKeys = Object.keys(parsed);
              const numCanonical = canonicalKeys.filter(k => parsedKeys.includes(k)).length;
              const isFullEstimate = numCanonical >= 3 || (parsedKeys.includes('metadata') && parsedKeys.includes('materials')) || parsedKeys.includes('total_bid');
              if (isFullEstimate) {
                aiResponse.answer_json = parsed;
              } else {
                if (!aiResponse.answer_json || typeof aiResponse.answer_json !== 'object') {
                  aiResponse.answer_json = {};
                }
                for (const [key, value] of Object.entries(parsed)) {
                  if (Array.isArray(value)) {
                    aiResponse.answer_json[key] = value;
                  } else if (
                    typeof value === 'object' && value !== null &&
                    typeof aiResponse.answer_json[key] === 'object' && aiResponse.answer_json[key] !== null &&
                    !Array.isArray(value) && !Array.isArray(aiResponse.answer_json[key])
                  ) {
                    aiResponse.answer_json[key] = { ...aiResponse.answer_json[key], ...value };
                  } else {
                    aiResponse.answer_json[key] = value;
                  }
                }
              }
            }
          } catch (err) {}
        }
      }
    }


    const { question, answer, answer_json, ...rest } = req.body || {};
    if (answer_json && typeof answer_json === 'object') {
      if (!aiResponse.answer_json || typeof aiResponse.answer_json !== 'object') {
        aiResponse.answer_json = {};
      }
      for (const [key, value] of Object.entries(answer_json)) {
        if (Array.isArray(value)) {
          aiResponse.answer_json[key] = value;
        } else if (
          typeof value === 'object' && value !== null &&
          typeof aiResponse.answer_json[key] === 'object' && aiResponse.answer_json[key] !== null &&
          !Array.isArray(value) && !Array.isArray(aiResponse.answer_json[key])
        ) {
          aiResponse.answer_json[key] = { ...aiResponse.answer_json[key], ...value };
        } else {
          aiResponse.answer_json[key] = value;
        }
      }
    }
    if (rest && Object.keys(rest).length > 0) {
      for (const [key, value] of Object.entries(rest)) {
        if (Array.isArray(value)) {
          aiResponse[key] = value;
        } else if (
          typeof value === 'object' && value !== null &&
          typeof aiResponse[key] === 'object' && aiResponse[key] !== null &&
          !Array.isArray(value) && !Array.isArray(aiResponse[key])
        ) {
          aiResponse[key] = { ...aiResponse[key], ...value };
        } else {
          aiResponse[key] = value;
        }
      }
    }

    // DO NOT remove answer_json; it is the canonical, editable section and must persist

    // Always update the GCS file
    try {
      await file.save(Buffer.from(JSON.stringify(aiResponse, null, 2)), { contentType: 'application/json' });
    } catch (saveErr) {
      return res.status(500).json({ error: 'Failed to save updated AI response', details: saveErr.message });
    }
    res.json({ success: true, updated: aiResponse });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update AI response', details: err.message });
  }
});

module.exports = router;
