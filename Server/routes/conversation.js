
const express = require('express');
const router = express.Router();
const { Storage } = require('@google-cloud/storage');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'pdfs_and_responses';
const storage = new Storage();


const Project = require('../models/Project');

router.post('/ask', async (req, res) => {
  try {
    const { prompt, aiResponsePath, contextScope, projectId, docId, pageNum } = req.body;
    console.log('[AI Conversation] Incoming request:', {
      prompt,
      aiResponsePath,
      contextScope,
      projectId,
      docId,
      pageNum
    });
    console.log('[AI Conversation] Raw body:', req.body);
    if (!prompt || (!aiResponsePath && contextScope !== 'current-page')) {
      return res.status(400).json({ error: 'Missing prompt or aiResponsePath' });
    }

    let tempFilePath = null;
    let contextJson = null;

    if (contextScope === 'current-page' && projectId && docId && pageNum) {
      console.log(`[AI Conversation] Fetching GCS page for projectId=${projectId}, docId=${docId}, pageNum=${pageNum}`);
      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ error: 'Project not found' });
      const file = project.files.id(docId);
      if (!file) return res.status(404).json({ error: 'Document not found' });
      let pageData = null;
      if (Array.isArray(file.pageImages) && file.pageImages.length >= pageNum) {
        pageData = file.pageImages[pageNum - 1];
        console.log('[AI Conversation] Found pageData in file.pageImages:', pageData);
      }
      if (!pageData && file.gcsUrl && file.gcsUrl.endsWith('manifest.json')) {
        console.log('[AI Conversation] Trying to fetch manifest for pageData...');
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
          console.log('[AI Conversation] Manifest loaded:', manifest);
          if (Array.isArray(manifest) && manifest.length >= pageNum) {
            pageData = manifest[pageNum - 1];
            console.log('[AI Conversation] Found pageData in manifest array:', pageData);
          } else if (manifest && Array.isArray(manifest.pageImages) && manifest.pageImages.length >= pageNum) {
            pageData = manifest.pageImages[pageNum - 1];
            console.log('[AI Conversation] Found pageData in manifest.pageImages array:', pageData);
          } else if (manifest && typeof manifest.pageImages === 'object') {
            const key = String(pageNum);
            pageData = manifest.pageImages[key] || manifest.pageImages[pageNum];
            console.log('[AI Conversation] Found pageData in manifest.pageImages object:', pageData);
          }
        } catch (e) {
          console.error('[AI Conversation] Error parsing manifest:', e.message);
        }
      }
      let pageImagePath = null;
      if (pageData) {
        if (typeof pageData === 'string') {
          pageImagePath = pageData.replace(/^gs:\/\//, '').split('/').slice(1).join('/');
        } else if (pageData.gcsUrl) {
          pageImagePath = pageData.gcsUrl.replace(/^gs:\/\//, '').split('/').slice(1).join('/');
        }
        console.log('[AI Conversation] pageImagePath from pageData:', pageImagePath);
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
          console.log('[AI Conversation] Fallback pageImagePath:', pageImagePath);
        }
      }
      let tempImagePath = null;
      if (pageImagePath) {
        const bucket = storage.bucket(BUCKET_NAME);
        const imageFile = bucket.file(pageImagePath);
        const uniqueSuffix = Date.now() + '_' + Math.random().toString(36).slice(2);
        tempImagePath = path.join(__dirname, `temp_page_image_${uniqueSuffix}.png`);
        try {
          await imageFile.download({ destination: tempImagePath });
          console.log('[AI Conversation] Downloaded page image to:', tempImagePath);
        } catch (e) {
          console.error('[AI Conversation] Failed to download page image:', pageImagePath, e.message);
          return res.status(404).json({ error: 'Page image not found in GCS', details: pageImagePath });
        }
      } else {
        console.error('[AI Conversation] Could not determine page image path');
        return res.status(404).json({ error: 'Page image path could not be determined' });
      }
      contextJson = { pageImagePath: tempImagePath };
      const uniqueSuffix = Date.now() + '_' + Math.random().toString(36).slice(2);
      tempFilePath = path.join(__dirname, `temp_page_context_${uniqueSuffix}.json`);
      fs.writeFileSync(tempFilePath, JSON.stringify(contextJson));
    } else {
      const uniqueSuffix = Date.now() + '_' + Math.random().toString(36).slice(2);
      tempFilePath = path.join(__dirname, `temp_ai_response_${uniqueSuffix}.json`);
      const bucket = storage.bucket(BUCKET_NAME);
      const file = bucket.file(aiResponsePath);
      let exists = false;
      try {
        const [fileExists] = await file.exists();
        exists = fileExists;
      } catch {}
      if (exists) {
        await file.download({ destination: tempFilePath });
      } else {
        const initialConversation = {
          conversation: [
          ]
        };
        fs.writeFileSync(tempFilePath, JSON.stringify(initialConversation, null, 2));
      }
    }

    const pythonPath = path.join(__dirname, '../prep/conversation.py');
    console.log('[AI Conversation] Spawning python:', pythonPath, prompt, tempFilePath);
    const pythonProcess = spawn('python', [pythonPath, prompt, tempFilePath]);

    let output = '';
    let errorOutput = '';
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
      console.log('[AI Conversation] Python stdout:', data.toString());
    });
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error('[AI Conversation] Python stderr:', data.toString());
    });

    pythonProcess.on('close', async (code) => {
      fs.unlink(tempFilePath, () => {});
      if (code !== 0) {
        console.error('[AI Conversation] Python exited with code', code, 'stderr:', errorOutput);
        return res.status(500).json({ error: 'Python script failed', details: errorOutput });
      }
      try {
        console.log('[AI Conversation] Python output:', output);
        const result = JSON.parse(output);
        const answerVal = result && result.content ? (typeof result.content === 'string' ? result.content : JSON.stringify(result.content)) : '';
        if (prompt.trim() && answerVal.trim()) {
          let aiResponseGcsPath = aiResponsePath;
          if (!aiResponseGcsPath || aiResponseGcsPath.trim() === "") {
            aiResponseGcsPath = `project_${projectId}/ai_response.json`;
          }
          const origFile = storage.bucket(BUCKET_NAME).file(aiResponseGcsPath);
          let aiResponse = null;
          try {
            const [contents] = await origFile.download();
            aiResponse = JSON.parse(contents.toString());
          } catch {
            aiResponse = { conversation: [] };
          }
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
            } catch (err) {}
          }

          await origFile.save(Buffer.from(JSON.stringify(aiResponse, null, 2)), { contentType: 'application/json' });
        }
        console.log('[AI Conversation] Final response:', result);
        res.json(result);
      } catch (e) {
        console.error('[AI Conversation] Failed to parse AI response:', output);
        res.status(500).json({ error: 'Failed to parse AI response', details: output });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
