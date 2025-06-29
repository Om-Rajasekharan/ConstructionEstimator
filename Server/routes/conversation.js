
const express = require('express');
const router = express.Router();
const { Storage } = require('@google-cloud/storage');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Set your GCS bucket name here
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'pdfs_and_responses';
const storage = new Storage();

// POST /api/conversation/ask
router.post('/ask', async (req, res) => {
  try {
    const { prompt, aiResponsePath } = req.body;
    if (!prompt || !aiResponsePath) {
      return res.status(400).json({ error: 'Missing prompt or aiResponsePath' });
    }

    const uniqueSuffix = Date.now() + '_' + Math.random().toString(36).slice(2);
    const tempFilePath = path.join(__dirname, `temp_ai_response_${uniqueSuffix}.json`);
    const file = storage.bucket(BUCKET_NAME).file(aiResponsePath);
    await file.download({ destination: tempFilePath });

    const pythonPath = path.join(__dirname, '../prep/conversation.py');
    const pythonProcess = spawn('python', [pythonPath, prompt, tempFilePath]);

    let output = '';
    let errorOutput = '';
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', async (code) => {
      fs.unlink(tempFilePath, () => {});
      if (code !== 0) {
        return res.status(500).json({ error: 'Python script failed', details: errorOutput });
      }
      try {
        const result = JSON.parse(output);
        const answerVal = result && result.content ? (typeof result.content === 'string' ? result.content : JSON.stringify(result.content)) : '';
        if (prompt.trim() && answerVal.trim()) {
          const [contents] = await file.download();
          let aiResponse = JSON.parse(contents.toString());
          if (!aiResponse.conversation) aiResponse.conversation = [];
          const appendedEntry = {
            question: prompt,
            answer: answerVal,
            timestamp: new Date().toISOString()
          };
          aiResponse.conversation.push(appendedEntry);

          const match = answerVal.match(/```json[\s\n]*([\s\S]*?)```/i) || answerVal.match(/```[\s\n]*([\s\S]*?)```/i);
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

          await file.save(Buffer.from(JSON.stringify(aiResponse, null, 2)), { contentType: 'application/json' });
        }
        res.json(result);
      } catch (e) {
        res.status(500).json({ error: 'Failed to parse AI response', details: output });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
