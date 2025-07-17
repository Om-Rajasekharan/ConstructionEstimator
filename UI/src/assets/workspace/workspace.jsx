import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
import DocumentList from './DocumentList';
import DocumentViewer from './DocumentViewer';
import FileUploadBox from './FileUploadBox';
import MultiFileUploadBox from './MultiFileUploadBox';
import Conversation from '../components/Conversation';
import Tools from './Tools';
import FloorplanMasker from './vision/floorplans';
import BlueprintMaskToggle from './vision/BlueprintMaskToggle';

export default function Workspace({ project }) {
  // Mask toggle state and mask image URL for DocumentViewer
  const [showMask, setShowMask] = useState(false);
  const [maskImgUrl, setMaskImgUrl] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [zoom, setZoom] = useState(1.5);
  const [showAI, setShowAI] = useState(false);
  const [aiWindowPos, setAiWindowPos] = useState({ x: 300, y: 120 });
  const [draggingAI, setDraggingAI] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [activeTool, setActiveTool] = useState('pan');
  const [showMasker, setShowMasker] = useState(false);
  const [maskExists, setMaskExists] = useState(false);

  const fetchDocs = async () => {
    if (!project) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${project._id || project.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        const docs = await Promise.all((data.files || []).map(async (f, idx) => {
          const isManifest = f.gcsUrl && f.gcsUrl.endsWith('manifest.json');
          let docObj = {
            id: f.id || f._id || idx,
            name: f.name,
            type: f.type,
            url: f.gcsUrl || f.url,
            gcsUrl: f.gcsUrl,
          };
          if (isManifest) {
            try {
              const manifestUrl = `${import.meta.env.VITE_API_URL}/api/image/manifest/${project._id || project.id}/${f.id || f._id || idx}`;
              const manifestRes = await fetch(manifestUrl, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
              });
              if (manifestRes.ok) {
                const manifest = await manifestRes.json();
                docObj.pageImages = Array.isArray(manifest) ? manifest : [];
              } else {
                docObj.pageImages = [];
              }
            } catch {
              docObj.pageImages = [];
            }
          } else if (f.type === 'application/pdf' && (f.url || f.gcsUrl)) {
            try {
              const loadingTask = pdfjsLib.getDocument({ url: f.url || f.gcsUrl });
              const pdf = await loadingTask.promise;
              docObj.pages = Array.from({ length: pdf.numPages }, (_, i) => ({ pageNumber: i + 1 }));
            } catch (err) {
              docObj.pages = [];
            }
          }
          return docObj;
        }));
        setDocuments(docs);
        setSelectedDocId(docs[0]?.id || null);
      }
    } catch {}
  };

  useEffect(() => {
    fetchDocs();
  }, [project]);

  let selectedDoc = null;
  let selectedPage = null;
  if (selectedDocId) {
    const match = selectedDocId.match(/^(.*?)(?:-page-(\d+))?$/);
    if (match) {
      const baseId = match[1];
      selectedDoc = documents.find(doc => doc.id === baseId);
      if (match[2]) {
        selectedPage = parseInt(match[2], 10);
      } else if (selectedDoc && selectedDoc.pageImages && selectedDoc.pageImages.length > 0) {
        selectedPage = 1;
      }
    }
  }

  useEffect(() => {
    setMaskImgUrl(null);
  }, [selectedDoc, selectedPage]);

  useEffect(() => {
    async function checkMask() {
      setMaskExists(false);
      if (selectedDoc && selectedPage) {
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';
        const maskCheckUrl = `${API_BASE}/api/image/${project?._id || project?.id}/${selectedDoc.id}/${selectedPage}/mask`;
        const token = localStorage.getItem('token');
        try {
          const res = await fetch(maskCheckUrl, {
            method: 'GET',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            credentials: 'include',
          });
          if (res.ok && res.headers.get('Content-Type')?.includes('image')) {
            setMaskExists(true);
          } else {
            setMaskExists(false);
          }
        } catch {
          setMaskExists(false);
        }
      }
    }
    checkMask();
  }, [selectedDoc, selectedPage, project]);

  function getDisplayUrl(doc) {
    if (!doc || !doc.url) return null;
    if (doc.url.startsWith('http')) return doc.url;
    if (doc.signedUrl) return doc.signedUrl;
    if (doc.url.startsWith('gs://')) {
      return doc.url.replace('gs://', 'https://storage.googleapis.com/');
    }
    return null;
  }

  const handleFilesUploaded = async (files) => {
    setUploadError('');
    if (!files || !files.length) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type !== 'application/pdf') {
        setUploadError('Only PDF files are supported.');
        continue;
      }
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('projectId', project._id || project.id);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pdf/processPdf`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          body: formData,
        });
        if (!res.ok) throw new Error('Upload failed');

        await new Promise(r => setTimeout(r, 400)); 
        const res2 = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${project._id || project.id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (res2.ok) {
          const data = await res2.json();
          if (data.files && data.files.length > 0) {
            setSelectedDocId(data.files[0].id || data.files[0]._id);
          }
        }
      } catch (e) {
        setUploadError('Upload failed.');
      }
    }
  };

  function handleAIDragStart(e) {
    setDraggingAI(true);
    setDragOffset({ x: e.clientX - aiWindowPos.x, y: e.clientY - aiWindowPos.y });
  }
  function handleAIDrag(e) {
    if (!draggingAI) return;
    setAiWindowPos({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
  }
  function handleAIDragEnd() {
    setDraggingAI(false);
  }

  const [showUpload, setShowUpload] = useState(false);
  useEffect(() => {
    setShowUpload(!documents.length);
  }, [documents.length]);

  if (showUpload) {
    return (
      <div
        className="workspace-container"
        style={{
          position: 'fixed',
          top: 64,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: 'calc(100vh - 64px)',
          background: '#e3eafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
        }}
      >
        <MultiFileUploadBox 
          onConfirm={handleFilesUploaded} 
          error={uploadError} 
          onUploadComplete={() => {
            setShowUpload(false);
            setTimeout(() => fetchDocs(), 100);
          }}
          projectId={project?._id || project?.id}
        />
      </div>
    );
  }

  return (
    <div
      className="workspace-container"
      style={{
        position: 'fixed',
        top: 64,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: 'calc(100vh - 64px)',
        background: '#e3eafc',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1,
        cursor: (() => {
          if (activeTool === 'drawing') return 'url("data:image/svg+xml,%3Csvg width=\'32\' height=\'32\' viewBox=\'0 0 32 32\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M6 26L26 6L28 8L8 28L6 26Z\' fill=\'%231976d2\' stroke=\'%23333\' stroke-width=\'2\'/%3E%3Crect x=\'4\' y=\'24\' width=\'4\' height=\'4\' fill=\'%23ffd600\' stroke=\'%23333\' stroke-width=\'1\'/%3E%3C/svg%3E") 0 32, pointer';
          if (activeTool === 'highlight') return 'url("data:image/svg+xml,%3Csvg width=\'32\' height=\'32\' viewBox=\'0 0 32 32\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect x=\'6\' y=\'20\' width=\'20\' height=\'6\' rx=\'2\' fill=\'%23ffeb3b\' stroke=\'%23ffd600\' stroke-width=\'2\'/%3E%3Crect x=\'10\' y=\'6\' width=\'12\' height=\'14\' rx=\'3\' fill=\'%23fffde7\' stroke=\'%23ffd600\' stroke-width=\'2\'/%3E%3C/svg%3E") 0 32, pointer';
          if (activeTool === 'stickyNote') return 'url("data:image/svg+xml,%3Csvg width=\'32\' height=\'32\' viewBox=\'0 0 32 32\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect x=\'4\' y=\'4\' width=\'24\' height=\'24\' rx=\'4\' fill=\'%23fffbe6\' stroke=\'%23ffd600\' stroke-width=\'2\'/%3E%3Crect x=\'8\' y=\'8\' width=\'16\' height=\'16\' rx=\'2\' fill=\'%23ffe066\'/%3E%3C/svg%3E") 0 32, pointer';
          return 'default';
        })(),
      }}
    >
      <div style={{ height: 36, background: '#f7f7fa', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', gap: 8, position: 'relative' }}>
        <Tools activeTool={activeTool} setActiveTool={setActiveTool} />
        {maskExists && selectedDoc && selectedPage && (
          <div style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)', zIndex: 10 }}>
            <BlueprintMaskToggle
              projectId={project?._id || project?.id}
              docId={selectedDoc.id}
              pageNum={selectedPage}
              blueprintImgSrc={selectedDoc.pageImages && selectedDoc.pageImages[selectedPage - 1]?.url ? selectedDoc.pageImages[selectedPage - 1].url : getDisplayUrl(selectedDoc)}
              style={{ marginTop: 2 }}
              showMask={showMask}
              setShowMask={setShowMask}
              setMaskImgUrl={setMaskImgUrl}
            />
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#888', marginRight: 8 }}>Zoom:</span>
          <button onClick={() => setZoom(z => Math.max(0.1, +(z - 0.1).toFixed(2)))} style={{ fontSize: 16, padding: '2px 8px', marginRight: 2 }}>−</button>
          <span style={{ minWidth: 48, textAlign: 'center', color: '#222', fontWeight: 500, fontSize: 15, background: '#f0f0f7', borderRadius: 4, padding: '2px 8px' }}>{Math.round(Math.max(zoom * 100, 10))}%</span>
          <button onClick={() => setZoom(z => Math.min(5, +(z + 0.1).toFixed(2)))} style={{ fontSize: 16, padding: '2px 8px', marginLeft: 2 }}>+</button>
          <button onClick={() => setZoom(1)} style={{ fontSize: 13, padding: '2px 10px', marginLeft: 12, background: '#f0f0f7', border: '1px solid #ccc', borderRadius: 4, color: '#444', cursor: 'pointer' }}>Reset</button>
        </div>
      </div>
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{ width: collapsed ? 48 : 250, transition: 'width 0.2s', borderRight: '1px solid #bfc2c7', background: '#f5f6fa', height: '100%' }}>
          <DocumentList
            documents={documents}
            onSelect={setSelectedDocId}
            selectedDocId={selectedDocId}
            collapsed={collapsed}
            setCollapsed={setCollapsed}
          />
        </div>
        <div style={{ flex: 1, position: 'relative', height: '100%', minHeight: 0, background: '#fff', overflow: 'hidden' }}>
          <DocumentViewer 
            document={selectedDoc ? { ...selectedDoc, url: getDisplayUrl(selectedDoc) } : null}
            projectId={project?._id || project?.id}
            selectedPage={selectedPage}
            zoom={zoom}
            onZoomChange={setZoom}
            activeTool={activeTool}
            toggledImgSrc={showMask ? maskImgUrl : null}
          />
        </div>
      </div>
      <div style={{ position: 'fixed', right: 36, bottom: 92, zIndex: 2002 }}>
        {selectedDoc && selectedPage && (
          <FloorplanMasker
            imageUrl={selectedDoc.pageImages && selectedDoc.pageImages[selectedPage - 1]?.url ? selectedDoc.pageImages[selectedPage - 1].url : getDisplayUrl(selectedDoc)}
            projectId={project?._id || project?.id}
            docId={selectedDoc.id}
            pageNum={selectedPage}
            style={{ marginBottom: 0, boxShadow: '0 4px 24px rgba(0,0,0,0.10)', borderRadius: 14, background: '#fff' }}
          />
        )}
      </div>

      <button
        onClick={() => setShowAI(v => !v)}
        style={{
          position: 'fixed',
          right: 32,
          bottom: 32,
          zIndex: 2002,
          background: 'linear-gradient(135deg, rgba(30,30,30,0.92) 0%, rgba(60,60,60,0.88) 100%)',
          color: '#fff',
          border: '1.5px solid rgba(255,255,255,0.10)',
          borderRadius: 18,
          padding: '12px 28px',
          fontSize: 18,
          fontWeight: 700,
          boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
          backdropFilter: 'blur(12px)',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {showAI ? '✕' : 'Ask AI'}
      </button>
      {showAI && (
        <Conversation
          aiResponsePath={project?.aiUrl || ''}
          projectId={project?._id || project?.id}
          docId={selectedDoc ? selectedDoc.id : null}
          pageNum={selectedPage || null}
          onClose={() => setShowAI(false)}
        />
      )}
      <style>{`
        .workspace-container *::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
        .workspace-container { scrollbar-width: none !important; -ms-overflow-style: none !important; }
      `}</style>
    </div>
  );
}

