import React, { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export default function BlueprintMaskToggle({ projectId, docId, pageNum, blueprintImgSrc, style, showMask, setShowMask, setMaskImgUrl }) {
  const [maskExists, setMaskExists] = useState(false);
  const [maskBlobUrl, setMaskBlobUrl] = useState(null);
  const maskImgSrc = `${API_BASE}/api/image/${projectId}/${docId}/${pageNum}/mask`;

  useEffect(() => {
    let prevBlobUrl = maskBlobUrl;
    if (projectId && docId && pageNum) {
      const maskCheckUrl = `${API_BASE}/api/image/${projectId}/${docId}/${pageNum}/mask`;
      const token = localStorage.getItem('token');
      console.log('[BlueprintMaskToggle] Checking mask existence:', { maskCheckUrl });
      fetch(maskCheckUrl, {
        method: 'GET',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include',
      })
        .then(res => {
          const contentType = res.headers.get('Content-Type');
          if (res.ok && contentType?.includes('image')) {
            console.log('[BlueprintMaskToggle] Mask exists for page', pageNum);
            setMaskExists(true);
            res.blob().then(blob => {
              if (prevBlobUrl) {
                URL.revokeObjectURL(prevBlobUrl);
              }
              const url = URL.createObjectURL(blob);
              setMaskBlobUrl(url);
              setMaskImgUrl(url);
            });
          } else {
            console.log('[BlueprintMaskToggle] Mask does NOT exist for page', pageNum, 'Content-Type:', contentType);
            setMaskExists(false);
            if (prevBlobUrl) {
              URL.revokeObjectURL(prevBlobUrl);
            }
            setMaskBlobUrl(null);
            setMaskImgUrl(null);
          }
        })
        .catch((err) => {
          console.error('[BlueprintMaskToggle] Error checking mask existence:', err);
          setMaskExists(false);
          if (prevBlobUrl) {
            URL.revokeObjectURL(prevBlobUrl);
          }
          setMaskBlobUrl(null);
          setMaskImgUrl(null);
        });
    } else {
      setMaskExists(false);
      if (prevBlobUrl) {
        URL.revokeObjectURL(prevBlobUrl);
      }
      setMaskBlobUrl(null);
      setMaskImgUrl(null);
    }
    setShowMask(false);
    return () => {
      if (maskBlobUrl) {
        URL.revokeObjectURL(maskBlobUrl);
      }
    };
  }, [projectId, docId, pageNum, setMaskImgUrl, setShowMask]);

  let actualBlueprintImgSrc = blueprintImgSrc;
  if (blueprintImgSrc && blueprintImgSrc.endsWith('manifest.json') && window.pageImages && Array.isArray(window.pageImages) && pageNum > 0) {
    const entry = window.pageImages[pageNum - 1];
    if (entry && entry.url) {
      actualBlueprintImgSrc = entry.url;
    } else if (entry && entry.imageGcsUrl) {
      actualBlueprintImgSrc = entry.imageGcsUrl;
    }
  }
  return (
    <div style={{ position: 'relative', ...style }}>
      {maskExists && (
        <button
          onClick={() => {
            setShowMask(s => {
              const next = !s;
              console.log('[BlueprintMaskToggle] Toggling mask:', next ? 'Show Mask' : 'Show Blueprint');
              return next;
            });
          }}
          style={{
            marginBottom: 10,
            background: showMask ? 'linear-gradient(90deg, #2a5298 0%, #1e3c72 100%)' : 'linear-gradient(90deg, #1e3c72 0%, #2a5298 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '8px 22px',
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: 0.5,
            boxShadow: '0 2px 12px rgba(30,60,114,0.10)',
            cursor: 'pointer',
            transition: 'all 0.18s',
          }}
        >
          {showMask ? 'Show Blueprint' : 'Show Mask'}
        </button>
      )}
    </div>
  );
}
