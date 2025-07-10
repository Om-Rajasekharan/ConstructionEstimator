import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

async function fetchManifest(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch manifest');
    return await res.json();
  } catch (e) {
    return null;
  }
}


export default function DocumentViewer({ document: pdfDocument, projectId, selectedPage, zoom, onZoomChange }) {
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [manifest, setManifest] = useState(null); 
  const [manifestLoading, setManifestLoading] = useState(false);
  const [manifestError, setManifestError] = useState('');
  let pageNumber = selectedPage || 1;
  let docUrl = pdfDocument?.url;
  let docName = pdfDocument?.name;

  let docId = pdfDocument?.id || pdfDocument?._id || '';
  if (pdfDocument?.files && Array.isArray(pdfDocument.files)) {
    const found = pdfDocument.files.find(f => f._id === docId);
    if (!found && pdfDocument.files.length > 0) {
      docId = pdfDocument.files[0]._id;
    }
  }

  const [imgPage, setImgPage] = useState(1);

  const isImageDoc = pdfDocument?.pageImages || (pdfDocument?.gcsUrl && pdfDocument?.gcsUrl.endsWith('manifest.json'));
  const imageList = pdfDocument?.pageImages || manifest;

  useEffect(() => {
    let ignore = false;
    if (pdfDocument?.gcsUrl && pdfDocument.gcsUrl.endsWith('manifest.json') && !pdfDocument.pageImages) {
      setManifestLoading(true);
      setManifestError('');
      fetchManifest(pdfDocument.gcsUrl.replace('gs://', 'https://storage.googleapis.com/'))
        .then(data => {
          if (!ignore) setManifest(data);
        })
        .catch(() => {
          if (!ignore) setManifestError('Failed to load manifest');
        })
        .finally(() => {
          if (!ignore) setManifestLoading(false);
        });
    } else {
      setManifest(null);
    }
    return () => { ignore = true; };
  }, [pdfDocument]);

  const pageCache = useRef({});
  const pdfDocRef = useRef(null);
  const FIXED_CANVAS_WIDTH = 1000;
  async function renderPageToCache(pdf, num) {
    if (pageCache.current[num]) return pageCache.current[num];
    try {
      if (!pdf || typeof pdf.numPages !== 'number' || num < 1 || num > pdf.numPages) {
        return null;
      }
      const page = await pdf.getPage(num);
      const origViewport = page.getViewport({ scale: 1 });
      const scale = FIXED_CANVAS_WIDTH / origViewport.width;
      const viewport = page.getViewport({ scale });
      const offscreen = window.document.createElement('canvas');
      offscreen.width = viewport.width;
      offscreen.height = viewport.height;
      const ctx = offscreen.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
      pageCache.current[num] = { canvas: offscreen, width: viewport.width, height: viewport.height, scale };
      return pageCache.current[num];
    } catch (err) {
      return null;
    }
  }
  useEffect(() => {
    if (isImageDoc) return; 
    let cancelled = false;
    if (!docUrl || pdfDocument?.type !== 'application/pdf') return;
    setLoading(true);
    setError('');
    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel(); } catch {}
      renderTaskRef.current = null;
    }
    let pdfDoc;
    pdfjsLib.getDocument({ url: docUrl }).promise
      .then(pdf => {
        pdfDocRef.current = pdf;
        pdfDoc = pdf;
        if (pageNumber < 1 || pageNumber > pdf.numPages) {
          setError('Invalid page number');
          setLoading(false);
          return;
        }
        return renderPageToCache(pdf, pageNumber);
      })
      .then(cacheObj => {
        if (!cacheObj || cancelled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = cacheObj.width;
        canvas.height = cacheObj.height;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(cacheObj.canvas, 0, 0);
        setLoading(false);
        if (pdfDoc && typeof pdfDoc.numPages === 'number') {
          if (pageNumber > 1 && pageNumber - 1 <= pdfDoc.numPages) renderPageToCache(pdfDoc, pageNumber - 1);
          if (pageNumber < pdfDoc.numPages && pageNumber + 1 >= 1) renderPageToCache(pdfDoc, pageNumber + 1);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError('Failed to load PDF page');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch {}
        renderTaskRef.current = null;
      }
    };

  }, [docUrl, pageNumber, pdfDocument?.type, isImageDoc]);

  const isZoomControlled = typeof zoom === 'number' && typeof onZoomChange === 'function';
  const [imgZoomUncontrolled, setImgZoomUncontrolled] = useState(1);
  const imgZoom = isZoomControlled ? zoom : imgZoomUncontrolled;
  const setImgZoom = isZoomControlled ? onZoomChange : setImgZoomUncontrolled;
  const [imgPan, setImgPan] = useState({ x: 0, y: 0 });
  const imgContainerRef = useRef(null);
  const imgDraggingRef = useRef(false);
  const imgLastPosRef = useRef({ x: 0, y: 0 });

  function handleImageWheel(e) {
    if (!isImageDoc) return;

    if (imgContainerRef.current && e.target && imgContainerRef.current.contains(e.target)) {

      const ZOOM_STEP = 0.03;
      e.preventDefault();
      let delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
      let newZoom = +(imgZoom + delta).toFixed(3);
      newZoom = Math.max(0.1, Math.min(5, newZoom));
      setImgZoom(newZoom);
    }
  }

  function handleImageMouseDown(e) {
    if (!isImageDoc || e.button !== 0) return;
    imgDraggingRef.current = true;
    imgLastPosRef.current = { x: e.clientX, y: e.clientY };
    document.body.style.cursor = 'grabbing';
  }
  function handleImageMouseMove(e) {
    if (!isImageDoc || !imgDraggingRef.current) return;
    const dx = e.clientX - imgLastPosRef.current.x;
    const dy = e.clientY - imgLastPosRef.current.y;
    setImgPan(pan => ({ x: pan.x + dx, y: pan.y + dy }));
    imgLastPosRef.current = { x: e.clientX, y: e.clientY };
  }
  function handleImageMouseUp() {
    if (!isImageDoc) return;
    imgDraggingRef.current = false;
    document.body.style.cursor = '';
  }
  useEffect(() => {
    if (!isImageDoc) return;
    const move = handleImageMouseMove;
    const up = handleImageMouseUp;
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [isImageDoc]);

  useEffect(() => {
    if (isImageDoc) setImgPan({ x: 0, y: 0 });
  }, [imgPage, isImageDoc]);

  const scrollContainerRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [dragOrigin, setDragOrigin] = useState({ x: 0, y: 0 });
  const [scrollOrigin, setScrollOrigin] = useState({ left: 0, top: 0 });

  function handleMouseDown(e) {
    if (e.button !== 0) return;
    setDragging(true);
    setDragOrigin({ x: e.clientX, y: e.clientY });
    if (scrollContainerRef.current) {
      setScrollOrigin({
        left: scrollContainerRef.current.scrollLeft,
        top: scrollContainerRef.current.scrollTop,
      });
    }
  }
  function handleMouseMove(e) {
    if (!dragging || !scrollContainerRef.current) return;
    const dx = e.clientX - dragOrigin.x;
    const dy = e.clientY - dragOrigin.y;
    scrollContainerRef.current.scrollLeft = scrollOrigin.left - dx;
    scrollContainerRef.current.scrollTop = scrollOrigin.top - dy;
  }
  function handleMouseUp() {
    setDragging(false);
  }

  useEffect(() => {
    if (isImageDoc) setImgPage(pageNumber);
  }, [isImageDoc, pageNumber, pdfDocument]);

  const totalPages = isImageDoc && imageList ? imageList.length : null;

  return (
    <div className="document-viewer" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', userSelect: dragging ? 'none' : 'auto', cursor: dragging ? 'grabbing' : 'auto' }}>
      {pdfDocument ? (
        <>
          <div style={{ fontSize: 12, color: '#888', padding: '2px 8px', background: '#f7f7fa', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{docName} {isImageDoc && totalPages ? `(Page ${imgPage} of ${totalPages})` : (pdfDocument.type === 'application/pdf' && `(Page ${pageNumber})`)}</span>
            {isImageDoc && totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => setImgPage(p => Math.max(1, p - 1))} disabled={imgPage <= 1} style={{ fontSize: 16, padding: '2px 8px' }}>Prev</button>
                <select value={imgPage} onChange={e => setImgPage(Number(e.target.value))} style={{ fontSize: 14, padding: '2px 6px' }}>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <option key={i + 1} value={i + 1}>Page {i + 1}</option>
                  ))}
                </select>
                <button onClick={() => setImgPage(p => Math.min(totalPages, p + 1))} disabled={imgPage >= totalPages} style={{ fontSize: 16, padding: '2px 8px' }}>Next</button>
              </div>
            )}
          </div>
          {isImageDoc ? (
            <div
              ref={imgContainerRef}
              style={{
                flex: 1,
                width: '100%',
                height: '100%',
                background: '#fff',
                position: 'relative',
                overflow: 'hidden',
                cursor: imgDraggingRef.current ? 'grabbing' : 'grab',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
              }}
              onMouseDown={handleImageMouseDown}
              onWheel={handleImageWheel}
              onTouchStart={e => {
                if (e.touches && e.touches.length > 1) {
                  e.preventDefault();
                }
              }}
              onGestureStart={e => e.preventDefault()}
              onGestureChange={e => e.preventDefault()}
              onGestureEnd={e => e.preventDefault()}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                {manifestLoading && <span style={{ color: '#888', position: 'absolute', left: 16, top: 16, pointerEvents: 'auto' }}>Loading manifest...</span>}
                {manifestError && <span style={{ color: 'red', position: 'absolute', left: 16, top: 16, pointerEvents: 'auto' }}>{manifestError}</span>}
                {imageList && imageList.length > 0 && imgPage >= 1 && imgPage <= imageList.length ? (() => {
                  const imageUrl = `${import.meta.env.VITE_API_URL}/api/image/${projectId}/${docId}/${imgPage}`;
                  const [imgLoading, setImgLoading] = React.useState(true);
                  const [imgError, setImgError] = React.useState('');
                  const [imgSrc, setImgSrc] = React.useState(null);
                  React.useEffect(() => {
                    let revoked = false;
                    setImgLoading(true);
                    setImgError('');
                    setImgSrc(null);
                    const token = localStorage.getItem('token');
                    fetch(imageUrl, {
                      method: 'GET',
                      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                      credentials: 'include',
                    })
                      .then(async res => {
                        if (!res.ok) {
                          const errText = await res.text();
                          throw new Error(`Failed to load image (${res.status}): ${errText}`);
                        }
                        return res.blob();
                      })
                      .then(blob => {
                        if (revoked) return;
                        const url = URL.createObjectURL(blob);
                        setImgSrc(url);
                        setImgLoading(false);
                      })
                      .catch(err => {
                        if (revoked) return;
                        setImgError('Failed to load image');
                        setImgLoading(false);
                      });
                    return () => {
                      revoked = true;
                      if (imgSrc) URL.revokeObjectURL(imgSrc);
                    };
                  }, [imageUrl]);
                  return (
                    <>
                      {imgLoading && <span style={{ color: '#888', position: 'absolute', left: 16, top: 40, pointerEvents: 'auto' }}>Loading image...</span>}
                      {imgError && <span style={{ color: 'red', position: 'absolute', left: 16, top: 40, pointerEvents: 'auto' }}>{imgError}</span>}
                      {imgSrc && (
                        <div
                          style={{
                            position: 'absolute',
                            left: `calc(50% + ${imgPan.x}px)`,
                            top: `calc(50% + ${imgPan.y}px)`,
                            transform: `translate(-50%, -50%) scale(${imgZoom})`,
                            transition: imgLoading ? 'none' : 'transform 0.15s',
                            boxShadow: '0 2px 8px #0001',
                            background: '#fff',
                            cursor: imgDraggingRef.current ? 'grabbing' : 'grab',
                            userSelect: 'none',
                            pointerEvents: 'auto',
                          }}
                          onMouseDown={handleImageMouseDown}
                        >
                          <img
                            src={imgSrc}
                            alt={`Page ${imgPage}`}
                            style={{
                              display: 'block',
                              maxWidth: '100vw',
                              maxHeight: '90vh',
                              width: 'auto',
                              height: 'auto',
                              pointerEvents: 'none',
                              userSelect: 'none',
                              WebkitUserSelect: 'none',
                              MozUserSelect: 'none',
                              msUserSelect: 'none',
                              opacity: imgLoading ? 0.5 : 1,
                            }}
                            draggable={false}
                            onLoad={() => {
                              setImgLoading(false);
                              setImgError('');
                            }}
                            onError={e => {
                              setImgLoading(false);
                              setImgError('Failed to load image');
                            }}
                          />
                        </div>
                      )}
                    </>
                  );
                })() : (!manifestLoading && !manifestError) ? (
                  <span style={{ color: '#888', position: 'absolute', left: 16, top: 16, pointerEvents: 'auto' }}>No image for this page</span>
                ) : null}
              </div>
            </div>
          ) : pdfDocument.type === 'application/pdf' ? (
            <div
              ref={scrollContainerRef}
              style={{ flex: 1, width: '100%', height: '100%', background: '#fff', position: 'relative', overflow: 'auto', cursor: dragging ? 'grabbing' : 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            >
              {loading && <span style={{ color: '#888', position: 'absolute', left: 16, top: 16 }}>Loading page...</span>}
              {error && <span style={{ color: 'red', position: 'absolute', left: 16, top: 16 }}>{error}</span>}
              <canvas
                ref={canvasRef}
                style={{
                  display: loading || error ? 'none' : 'block',
                  boxShadow: '0 2px 8px #0001',
                  background: '#fff',
                  position: 'relative',
                  left: 0,
                  top: 0,
                  width: `${FIXED_CANVAS_WIDTH * zoom}px`,
                  height: 'auto',
                  cursor: dragging ? 'grabbing' : 'grab',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none',
                  maxWidth: 'none',
                  maxHeight: 'none',
                  transition: 'width 0.15s',
                }}
                draggable={false}
              />
            </div>
          ) : (
            <iframe
              src={docUrl}
              title={docName}
              style={{ width: '100%', height: 'calc(100% - 24px)', border: 'none' }}
              allow="fullscreen"
            />
          )}
        </>
      ) : (
        <div style={{ padding: 32, color: '#888' }}>Select a document to view</div>
      )}
      {/* Hide scrollbars for this viewer */}
      <style>{`
        .document-viewer *::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
        .document-viewer { scrollbar-width: none !important; -ms-overflow-style: none !important; }
      `}</style>
    </div>
  );
}

