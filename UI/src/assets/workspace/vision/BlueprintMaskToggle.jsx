import React, { useEffect, useState, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export default function BlueprintMaskToggle({ projectId, docId, pageNum, blueprintImgSrc, style, showMask, setShowMask, setMaskImgUrl }) {
  const [maskExists, setMaskExists] = useState(false);
  const [maskBlobUrl, setMaskBlobUrl] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [rawMaskJson, setRawMaskJson] = useState(null);
  const [imageDims, setImageDims] = useState({ width: 1, height: 1 });
  const imgRef = useRef();

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

  // Fetch mask JSON and predictions when mask is shown
  useEffect(() => {
    if (maskExists && showMask && projectId && docId && pageNum) {
      const token = localStorage.getItem('token');
      fetch(`${API_BASE}/api/image/mask-json?projectId=${projectId}&docId=${docId}&pageNum=${pageNum}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include',
      })
        .then(res => res.json())
        .then(json => {
          console.log('[BlueprintMaskToggle] Received mask JSON:', json);
          setRawMaskJson(json);
          setPredictions(json.predictions || []);
          setImageDims(json.image || { width: 1, height: 1 });
        })
        .catch(() => {
          setRawMaskJson(null);
          setPredictions([]);
        });
    } else {
      setRawMaskJson(null);
      setPredictions([]);
    }
  }, [maskExists, showMask, projectId, docId, pageNum]);

  // Get displayed image size
  const handleImgLoad = () => {
    if (imgRef.current) {
      const dims = {
        width: imgRef.current.naturalWidth,
        height: imgRef.current.naturalHeight,
      };
      window._debugBlueprintDims = dims; // for manual inspection
      console.log('[BlueprintMaskToggle] Displayed image size:', dims, 'imgRef:', imgRef.current);
      setImageDims(dims);
    }
  };

  const [manifestImages, setManifestImages] = useState(null);
  useEffect(() => {
    if (blueprintImgSrc && blueprintImgSrc.endsWith('manifest.json')) {
      fetch(blueprintImgSrc)
        .then(res => res.json())
        .then(manifest => {
          let images = null;
          if (Array.isArray(manifest)) {
            images = manifest;
          } else if (manifest && Array.isArray(manifest.pageImages)) {
            images = manifest.pageImages;
          } else if (manifest && typeof manifest.pageImages === 'object') {
            images = Object.values(manifest.pageImages);
          }
          setManifestImages(images);
        })
        .catch(() => setManifestImages(null));
    } else {
      setManifestImages(null);
    }
  }, [blueprintImgSrc]);

  let actualBlueprintImgSrc = blueprintImgSrc;
  if (
    blueprintImgSrc &&
    blueprintImgSrc.endsWith('manifest.json') &&
    manifestImages &&
    Array.isArray(manifestImages) &&
    pageNum > 0
  ) {
    const entry = manifestImages[pageNum - 1];
    if (entry && entry.url) {
      actualBlueprintImgSrc = entry.url;
    } else if (entry && entry.imageGcsUrl) {
      actualBlueprintImgSrc = entry.imageGcsUrl;
    } else if (typeof entry === 'string') {
      actualBlueprintImgSrc = entry;
    }
  }
  return (
    <div style={{ position: 'relative', ...style, width: '100%', height: '100%' }}>
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
      {/* Blueprint image */}
      {actualBlueprintImgSrc && (
        (() => {
          console.log('[BlueprintMaskToggle] window.pageImages:', window.pageImages);
          console.log('[BlueprintMaskToggle] actualBlueprintImgSrc:', actualBlueprintImgSrc, 'showMask:', showMask);
          return (
            <img
              key={actualBlueprintImgSrc + '_' + showMask}
              ref={imgRef}
              src={actualBlueprintImgSrc}
              alt="Blueprint"
              onLoad={handleImgLoad}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                borderRadius: 12,
                boxShadow: '0 2px 16px rgba(30,60,114,0.10)',
                position: 'relative',
                zIndex: 1,
              }}
            />
          );
        })()
      )}
      {/* Mask overlay */}
      {maskExists && showMask && maskBlobUrl && (
        <img
          src={maskBlobUrl}
          alt="Mask Overlay"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: 12,
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      )}
      {/* JSON overlay on top of mask image, below polygons */}
      {maskExists && showMask && rawMaskJson && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 2.5,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-start',
        }}>
          <pre style={{
            width: '100%',
            maxHeight: 200,
            overflow: 'auto',
            background: 'rgba(0,0,0,0.7)',
            color: '#fff',
            fontSize: 12,
            borderRadius: 8,
            padding: 8,
            margin: 0,
          }}>{JSON.stringify(rawMaskJson, null, 2)}</pre>
        </div>
      )}
      {/* Room polygons overlay */}
      {maskExists && showMask && predictions.length > 0 && (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 3,
          }}
          viewBox={`0 0 ${imageDims.width} ${imageDims.height}`}
          preserveAspectRatio="none"
        >
          {predictions.map((pred, idx) => {
            // If points array exists, render as polygon
            if (Array.isArray(pred.points)) {
              return (
                <polygon
                  key={idx}
                  points={pred.points.map(pt => `${pt.x * imageDims.width / (rawMaskJson?.image?.width || imageDims.width)},${pt.y * imageDims.height / (rawMaskJson?.image?.height || imageDims.height)}`).join(' ')}
                  fill="rgba(0,0,255,0.3)"
                  stroke="blue"
                  strokeWidth={imageDims.width / 400}
                />
              );
            }
            // Otherwise, render as rectangle, scaling coordinates if needed
            const { x, y, width, height } = pred;
            const scaleX = imageDims.width / (rawMaskJson?.image?.width || imageDims.width);
            const scaleY = imageDims.height / (rawMaskJson?.image?.height || imageDims.height);
            return (
              <rect
                key={idx}
                x={x * scaleX}
                y={y * scaleY}
                width={width * scaleX}
                height={height * scaleY}
                fill="rgba(0,0,255,0.3)"
                stroke="blue"
                strokeWidth={imageDims.width / 400}
              />
            );
          })}
        </svg>
      )}
      {/* ...existing code... */}
    </div>
  );
}
