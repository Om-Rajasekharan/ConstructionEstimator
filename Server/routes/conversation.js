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

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    let tempFilePath = null;
    let contextJson = null;
    let localSummaryPath = null;
    let localWorkspaceSummaryPath = null;

    // Helper to download a file from GCS to local
    async function downloadGcsFile(gcsPath, localPath) {
      const bucket = storage.bucket(BUCKET_NAME);
      const file = bucket.file(gcsPath);
      await file.download({ destination: localPath });
    }
    // Helper to upload a file to GCS
    async function uploadGcsFile(localPath, gcsPath) {
      const bucket = storage.bucket(BUCKET_NAME);
      const file = bucket.file(gcsPath);
      await file.save(fs.readFileSync(localPath));
    }

    // Helper to list files in a GCS folder
    async function listGcsFiles(prefix) {
      const [files] = await storage.bucket(BUCKET_NAME).getFiles({ prefix });
      return files.map(f => f.name);
    }

    // Helper to get local temp path
    function getTempPath(suffix) {
      return path.join(__dirname, `temp_${suffix}_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
    }

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
      let pageTextGcsUrl = null;
      if (pageData) {
        if (typeof pageData === 'string') {
          pageImagePath = pageData.replace(/^gs:\/\//, '').split('/').slice(1).join('/');
        } else if (pageData.imageGcsUrl) {
          pageImagePath = pageData.imageGcsUrl.replace(/^gs:\/\//, '').split('/').slice(1).join('/');
        } else if (pageData.gcsUrl) {
          pageImagePath = pageData.gcsUrl.replace(/^gs:\/\//, '').split('/').slice(1).join('/');
        }
        if (pageData.textGcsUrl) {
          pageTextGcsUrl = pageData.textGcsUrl;
        }
        console.log('[AI Conversation] pageImagePath from pageData:', pageImagePath);
        if (pageTextGcsUrl) {
          console.log('[AI Conversation] textGcsUrl from pageData:', pageTextGcsUrl);
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
          console.log('[AI Conversation] Fallback pageImagePath:', pageImagePath);
        }
      }
      let pageText = null;
      if (pageTextGcsUrl) {
        // Download the JSON file from GCS
        const textPath = pageTextGcsUrl.replace(/^gs:\/\//, '').split('/').slice(1).join('/');
        const textFile = storage.bucket(BUCKET_NAME).file(textPath);
        let textData = '';
        await new Promise((resolve, reject) => {
          textFile.createReadStream()
            .on('data', chunk => { textData += chunk; })
            .on('end', () => resolve())
            .on('error', err => reject(err));
        });
        try {
          const textJson = JSON.parse(textData);
          pageText = textJson.text || '';
        } catch (e) {
          pageText = '';
        }
      }
      contextJson = { pageText };
      const uniqueSuffix = Date.now() + '_' + Math.random().toString(36).slice(2);
      tempFilePath = path.join(__dirname, `temp_page_context_${uniqueSuffix}.json`);
      fs.writeFileSync(tempFilePath, JSON.stringify(contextJson));
    } else if (contextScope === 'current-file' && projectId && docId) {
      console.log(`[AI Conversation] [current-file] Checking/generating summary for projectId=${projectId}, docId=${docId}`);
      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ error: 'Project not found' });
      const file = project.files.id(docId);
      if (!file) return res.status(404).json({ error: 'Document not found' });
      const fileFolder = file.gcsUrl.replace(/^gs:\/\//, '').split('/').slice(1, -1).join('/');
      const fileSummaryGcs = `${fileFolder}/ai_file_summary.json`;
      let fileSummaryExists = false;
      try {
        const [exists] = await storage.bucket(BUCKET_NAME).file(fileSummaryGcs).exists();
        fileSummaryExists = exists;
        console.log(`[AI Conversation] [current-file] File summary exists: ${fileSummaryExists} at ${fileSummaryGcs}`);
      } catch (e) {
        console.log(`[AI Conversation] [current-file] Error checking file summary existence:`, e);
      }
      localSummaryPath = getTempPath('file_summary');
      if (!fileSummaryExists) {
        const allFiles = await listGcsFiles(fileFolder + '/');
        const pageJsons = allFiles.filter(f => f.endsWith('.json') && /page_\d+\.json$/.test(f));
        console.log(`[AI Conversation] [current-file] Page JSONs to summarize:`, pageJsons);
        const localPagePaths = [];
        for (const gcsPage of pageJsons) {
          const localPage = getTempPath('page');
          await downloadGcsFile(gcsPage, localPage);
          localPagePaths.push(localPage);
          console.log(`[AI Conversation] [current-file] Downloaded page JSON: ${gcsPage} -> ${localPage}`);
        }
        const pythonPath = path.join(__dirname, '../prep/conversation.py');
        const args = ['--summarize', 'file', localSummaryPath, ...localPagePaths];
        console.log(`[AI Conversation] [current-file] Summarizing file with: python ${pythonPath} ${args.join(' ')}`);
        await new Promise((resolve, reject) => {
          const proc = spawn('python', [pythonPath, ...args]);
          proc.stdout.on('data', d => console.log(`[AI Conversation] [current-file] Python summary stdout:`, d.toString()));
          proc.stderr.on('data', d => console.error(`[AI Conversation] [current-file] Python summary stderr:`, d.toString()));
          proc.on('close', code => code === 0 ? resolve() : reject(new Error('Python summary failed')));
        });
        await uploadGcsFile(localSummaryPath, fileSummaryGcs);
        console.log(`[AI Conversation] [current-file] Uploaded file summary to GCS: ${fileSummaryGcs}`);
        // Cleanup temp page JSONs
        for (const localPage of localPagePaths) {
          try { fs.unlinkSync(localPage); } catch {}
        }
      } else {
        await downloadGcsFile(fileSummaryGcs, localSummaryPath);
        console.log(`[AI Conversation] [current-file] Downloaded file summary from GCS: ${fileSummaryGcs}`);
      }
      contextJson = JSON.parse(fs.readFileSync(localSummaryPath, 'utf-8'));
      tempFilePath = localSummaryPath;
      console.log(`[AI Conversation] [current-file] Using file summary as context: ${localSummaryPath}`);
    } else if (contextScope === 'whole-workspace' && projectId) {
      console.log(`[AI Conversation] [whole-workspace] Checking/generating workspace summary for projectId=${projectId}`);
      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ error: 'Project not found' });
      const fileFolders = project.files.map(f => f.gcsUrl.replace(/^gs:\/\//, '').split('/').slice(1, -1).join('/'));
      const fileSummaryGcsList = fileFolders.map(folder => `${folder}/ai_file_summary.json`);
      const localFileSummaryPaths = [];
      for (let i = 0; i < fileSummaryGcsList.length; ++i) {
        const fileSummaryGcs = fileSummaryGcsList[i];
        let exists = false;
        try {
          const [e] = await storage.bucket(BUCKET_NAME).file(fileSummaryGcs).exists();
          exists = e;
          console.log(`[AI Conversation] [whole-workspace] File summary exists: ${exists} at ${fileSummaryGcs}`);
        } catch (e) {
          console.log(`[AI Conversation] [whole-workspace] Error checking file summary existence:`, e);
        }
        let localSummaryPath = getTempPath('file_summary');
        if (!exists) {
          const allFiles = await listGcsFiles(fileFolders[i] + '/');
          const pageJsons = allFiles.filter(f => f.endsWith('.json') && /page_\d+\.json$/.test(f));
          console.log(`[AI Conversation] [whole-workspace] Page JSONs to summarize for file ${fileFolders[i]}:`, pageJsons);
          const localPagePaths = [];
          for (const gcsPage of pageJsons) {
            const localPage = getTempPath('page');
            await downloadGcsFile(gcsPage, localPage);
            localPagePaths.push(localPage);
            console.log(`[AI Conversation] [whole-workspace] Downloaded page JSON: ${gcsPage} -> ${localPage}`);
          }
          const pythonPath = path.join(__dirname, '../prep/conversation.py');
          const args = ['--summarize', 'file', localSummaryPath, ...localPagePaths];
          console.log(`[AI Conversation] [whole-workspace] Summarizing file with: python ${pythonPath} ${args.join(' ')}`);
          await new Promise((resolve, reject) => {
            const proc = spawn('python', [pythonPath, ...args]);
            proc.stdout.on('data', d => console.log(`[AI Conversation] [whole-workspace] Python summary stdout:`, d.toString()));
            proc.stderr.on('data', d => console.error(`[AI Conversation] [whole-workspace] Python summary stderr:`, d.toString()));
            proc.on('close', code => code === 0 ? resolve() : reject(new Error('Python summary failed')));
          });
          await uploadGcsFile(localSummaryPath, fileSummaryGcs);
          console.log(`[AI Conversation] [whole-workspace] Uploaded file summary to GCS: ${fileSummaryGcs}`);
          // Cleanup temp page JSONs
          for (const localPage of localPagePaths) {
            try { fs.unlinkSync(localPage); } catch {}
          }
        } else {
          await downloadGcsFile(fileSummaryGcs, localSummaryPath);
          console.log(`[AI Conversation] [whole-workspace] Downloaded file summary from GCS: ${fileSummaryGcs}`);
        }
        localFileSummaryPaths.push(localSummaryPath);
      }
      const projectFolder = fileFolders[0] ? fileFolders[0].split('/')[0] : '';
      const workspaceSummaryGcs = `${projectFolder}/ai_workspace_summary.json`;
      let workspaceSummaryExists = false;
      try {
        const [exists] = await storage.bucket(BUCKET_NAME).file(workspaceSummaryGcs).exists();
        workspaceSummaryExists = exists;
        console.log(`[AI Conversation] [whole-workspace] Workspace summary exists: ${workspaceSummaryExists} at ${workspaceSummaryGcs}`);
      } catch (e) {
        console.log(`[AI Conversation] [whole-workspace] Error checking workspace summary existence:`, e);
      }
      localWorkspaceSummaryPath = getTempPath('workspace_summary');
      if (!workspaceSummaryExists) {
        const pythonPath = path.join(__dirname, '../prep/conversation.py');
        const args = ['--summarize', 'workspace', localWorkspaceSummaryPath, ...localFileSummaryPaths];
        console.log(`[AI Conversation] [whole-workspace] Summarizing workspace with: python ${pythonPath} ${args.join(' ')}`);
        await new Promise((resolve, reject) => {
          const proc = spawn('python', [pythonPath, ...args]);
          proc.stdout.on('data', d => console.log(`[AI Conversation] [whole-workspace] Python summary stdout:`, d.toString()));
          proc.stderr.on('data', d => console.error(`[AI Conversation] [whole-workspace] Python summary stderr:`, d.toString()));
          proc.on('close', code => code === 0 ? resolve() : reject(new Error('Python summary failed')));
        });
        await uploadGcsFile(localWorkspaceSummaryPath, workspaceSummaryGcs);
        console.log(`[AI Conversation] [whole-workspace] Uploaded workspace summary to GCS: ${workspaceSummaryGcs}`);
        // Cleanup temp file summary JSONs
        for (const localFileSummary of localFileSummaryPaths) {
          try { fs.unlinkSync(localFileSummary); } catch {}
        }
      } else {
        await downloadGcsFile(workspaceSummaryGcs, localWorkspaceSummaryPath);
        console.log(`[AI Conversation] [whole-workspace] Downloaded workspace summary from GCS: ${workspaceSummaryGcs}`);
      }
      contextJson = JSON.parse(fs.readFileSync(localWorkspaceSummaryPath, 'utf-8'));
      tempFilePath = localWorkspaceSummaryPath;
      console.log(`[AI Conversation] [whole-workspace] Using workspace summary as context: ${localWorkspaceSummaryPath}`);
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
      // Cleanup temp summary JSONs after AI call
      if (contextScope === 'current-file' && localSummaryPath) {
        try { fs.unlinkSync(localSummaryPath); } catch {}
      }
      if (contextScope === 'whole-workspace' && localWorkspaceSummaryPath) {
        try { fs.unlinkSync(localWorkspaceSummaryPath); } catch {}
      }
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