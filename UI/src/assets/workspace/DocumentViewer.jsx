import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { ToolClasses } from './Tools';
import StickyNoteTool from './tools/stickyNote';
import DrawingTool from './tools/drawing';
import HighlightTool from './tools/highlight';
import StickyNoteRender from './tools/stickyNoteRender.jsx';
import DrawingRender from './tools/DrawingRender.jsx';
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


export default function DocumentViewer({ document: pdfDocument, projectId, selectedPage, zoom, onZoomChange, activeTool, toggledImgSrc }) {
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
      let delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
      let newZoom = +(imgZoom + delta).toFixed(3);
      newZoom = Math.max(0.1, Math.min(5, newZoom));
      setImgZoom(newZoom);
    }
  }
  function handleImageMouseDown(e) {
    if (!isImageDoc || e.button !== 0) return;
    const imgDiv = e.currentTarget;
    const rect = imgDiv.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    const displayW = rect.width;
    const displayH = rect.height;
    if (activeTool === 'pan') {
      imgDraggingRef.current = true;
      imgLastPosRef.current = { x: e.clientX, y: e.clientY };
      document.body.style.cursor = 'grabbing';
    } else if (activeTool === 'highlight') {
      HighlightTool.handleMouseDownImage({ e, imgDivRef: imgContainerRef, setDrawingHighlight });
    } else if (activeTool === 'stickyNote') {
      StickyNoteTool.handleMouseDownImage({
        e,
        imgDiv,
        imgPage,
        setStickyNotes,
        stickyNotes
      });
    } else if (activeTool === 'drawing') {
      const x = offsetX / displayW;
      const y = offsetY / displayH;
      setDrawingCurrentPath({ page: imgPage, points: [{ x, y }] });
    }
  }
  function handleImageMouseMove(e) {
    if (!isImageDoc) return;
    const imgDiv = imgContainerRef.current?.querySelector('div[style*="position: absolute"]');
    let rect, displayW, displayH;
    if (imgDiv) {
      rect = imgDiv.getBoundingClientRect();
      displayW = rect.width;
      displayH = rect.height;
    }
    if (activeTool === 'pan') {
      if (!imgDraggingRef.current) return;
      const dx = e.clientX - imgLastPosRef.current.x;
      const dy = e.clientY - imgLastPosRef.current.y;
      setImgPan(pan => ({ x: pan.x + dx, y: pan.y + dy }));
      imgLastPosRef.current = { x: e.clientX, y: e.clientY };
    } else if (activeTool === 'highlight') {
      HighlightTool.handleMouseMoveImage({ e, imgDivRef: imgContainerRef, drawingHighlight, setDrawingHighlight });
    } else if (activeTool === 'drawing') {
      if (!drawingCurrentPath || !imgDiv) return;
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      const x = offsetX / displayW;
      const y = offsetY / displayH;
      setDrawingCurrentPath(path => ({ ...path, points: [...path.points, { x, y }] }));
    } else {
      return;
    }
  }
  function handleImageMouseUp() {
    if (!isImageDoc) return;
    if (activeTool === 'pan') {
      imgDraggingRef.current = false;
      document.body.style.cursor = '';
    } else if (activeTool === 'highlight') {
      HighlightTool.handleMouseUpImage({ drawingHighlight, setDrawingHighlight, setHighlights, imgPage, ToolClasses });
    } else if (activeTool === 'drawing') {
      if (drawingCurrentPath) {
        setDrawingPaths(paths => [...paths, drawingCurrentPath]);
        setDrawingCurrentPath(null);
      }
    }
  }
  useEffect(() => {
    if (!isImageDoc) return;
    const move = (e) => {
      if (activeTool === 'drawing' || activeTool === 'highlight' || activeTool === 'pan') {
        handleImageMouseMove(e);
      }
    };
    const up = (e) => {
      if (activeTool === 'drawing' || activeTool === 'highlight' || activeTool === 'pan') {
        handleImageMouseUp(e);
      }
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [isImageDoc, activeTool]);

  useEffect(() => {
    if (isImageDoc) setImgPan({ x: 0, y: 0 });
  }, [imgPage, isImageDoc]);

  const scrollContainerRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [dragOrigin, setDragOrigin] = useState({ x: 0, y: 0 });
  const [scrollOrigin, setScrollOrigin] = useState({ left: 0, top: 0 });

  function handleMouseDown(e) {
    if (activeTool !== 'pan') return;
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
    if (activeTool !== 'pan') return;
    if (!dragging || !scrollContainerRef.current) return;
    const dx = e.clientX - dragOrigin.x;
    const dy = e.clientY - dragOrigin.y;
    scrollContainerRef.current.scrollLeft = scrollOrigin.left - dx;
    scrollContainerRef.current.scrollTop = scrollOrigin.top - dy;
  }
  function handleMouseUp() {
    if (activeTool !== 'pan') return;
    setDragging(false);
  }

  useEffect(() => {
    if (isImageDoc) setImgPage(pageNumber);
  }, [isImageDoc, pageNumber, pdfDocument]);

  const totalPages = isImageDoc && imageList ? imageList.length : null;

  // --- Annotation state ---
  const [highlights, setHighlights] = React.useState([]);
  const [drawingHighlight, setDrawingHighlight] = React.useState(null);
  const [stickyNotes, setStickyNotes] = React.useState([]);
  const [drawingPaths, setDrawingPaths] = React.useState([]);
  const [drawingCurrentPath, setDrawingCurrentPath] = React.useState(null);
  // --- Image loading state for image docs ---
  const [imgLoading, setImgLoading] = React.useState(true);
  const [imgError, setImgError] = React.useState('');
  const [imgSrc, setImgSrc] = React.useState(null);
  const prevBlobUrlRef = useRef(null);
  const [imgNaturalSize, setImgNaturalSize] = React.useState({ width: 1, height: 1 });
  React.useEffect(() => {
    if (!isImageDoc || !imageList || imgPage < 1 || imgPage > imageList.length) return;
    setImgLoading(true);
    setImgError('');
    if (toggledImgSrc) {
      if (prevBlobUrlRef.current && prevBlobUrlRef.current !== toggledImgSrc) {
        URL.revokeObjectURL(prevBlobUrlRef.current);
        prevBlobUrlRef.current = null;
      }
      setImgSrc(toggledImgSrc);
      setImgLoading(false);
      return;
    }
    const imageUrl = `${import.meta.env.VITE_API_URL}/api/image/${projectId}/${docId}/${imgPage}`;
    const token = localStorage.getItem('token');
    let didCancel = false;
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
        if (didCancel) return;
        const url = URL.createObjectURL(blob);
        // Revoke previous blob URL if it exists
        if (prevBlobUrlRef.current && prevBlobUrlRef.current !== url) {
          URL.revokeObjectURL(prevBlobUrlRef.current);
        }
        prevBlobUrlRef.current = url;
        setImgSrc(url);
        setImgLoading(false);
      })
      .catch(err => {
        if (didCancel) return;
        setImgError('Failed to load image');
        setImgLoading(false);
      });
    return () => {
      didCancel = true;
    };
  }, [isImageDoc, imageList, imgPage, projectId, docId, toggledImgSrc]);

  React.useEffect(() => {
    return () => {
      if (prevBlobUrlRef.current) {
        URL.revokeObjectURL(prevBlobUrlRef.current);
        prevBlobUrlRef.current = null;
      }
    };
  }, []);
  // --- Mouse event handlers for highlight tool (PDF) ---
  function handleHighlightMouseDown(e) {
    if (activeTool !== 'highlight') return;
    HighlightTool.handleMouseDownPDF({ e, canvasRef, setDrawingHighlight });
  }
  function handleHighlightMouseMove(e) {
    if (activeTool !== 'highlight') return;
    HighlightTool.handleMouseMovePDF({ e, canvasRef, drawingHighlight, setDrawingHighlight });
  }
  function handleHighlightMouseUp(e) {
    if (activeTool !== 'highlight') return;
    HighlightTool.handleMouseUpPDF({ e, canvasRef, drawingHighlight, setDrawingHighlight, setHighlights, selectedPage, ToolClasses });
  }

  // --- Sticky Note tool for PDFs ---
  function handleStickyNoteMouseDown(e) {
    if (activeTool !== 'stickyNote' || !canvasRef.current) return;
    StickyNoteTool.handleMouseDown({
      e,
      canvasRef,
      selectedPage,
      setStickyNotes,
      stickyNotes
    });
  }

  // --- Drawing tool for PDFs ---
  function handleDrawingMouseDown(e) {
    if (activeTool !== 'drawing' || !canvasRef.current) return;
    DrawingTool.handleMouseDown({
      e,
      canvasRef,
      selectedPage,
      setDrawingCurrentPath
    });
  }
  function handleDrawingMouseMove(e) {
    if (activeTool !== 'drawing' || !drawingCurrentPath || !canvasRef.current) return;
    DrawingTool.handleMouseMove({
      e,
      canvasRef,
      setDrawingCurrentPath,
      drawingCurrentPath
    });
  }
  function handleDrawingMouseUp(e) {
    if (activeTool !== 'drawing' || !drawingCurrentPath) return;
    DrawingTool.handleMouseUp({
      setDrawingPaths,
      drawingCurrentPath,
      setDrawingCurrentPath
    });
  }

  // --- Render highlight overlays ---
  function renderHighlights() {
    const page = selectedPage || 1;
    return highlights.filter(h => h.page === page).map((h, i) => (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: `${h.x * 100}%`,
          top: `${h.y * 100}%`,
          width: `${h.width * 100}%`,
          height: `${h.height * 100}%`,
          background: h.color,
          opacity: 0.35,
          border: '1.5px solid #ffd600',
          borderRadius: 4,
          pointerEvents: 'none',
        }}
      />
    ));
  }

  // Add these states at the top of your component
  const [maskJson, setMaskJson] = useState(null);
  const [selectedRoomIdx, setSelectedRoomIdx] = useState(null);
  const [roomMaterialInputs, setRoomMaterialInputs] = useState({});

  // Helper to estimate square feet (assuming maskJson.image is in pixels, and you know the scale)
  function estimateSqFt(rectWidth, rectHeight, maskJson) {
    // Example: assume blueprint is 1/8" = 1' and image is scanned at 300 DPI
    // You may need to adjust this formula based on your actual scale!
    // For now, just show pixel area as a placeholder
    if (!maskJson?.image) return 0;
    // Example: 1 pixel = X feet (you should replace this with your real scale)
    // For now, just return area in square feet assuming 1 pixel = 0.01 ft
    const pixelToFt = 0.01;
    return Math.round(rectWidth * rectHeight * pixelToFt * pixelToFt);
  }

  // Fetch mask JSON when mask is shown
  useEffect(() => {
    if (!toggledImgSrc || !projectId || !pdfDocument?.id || !selectedPage) return;
    fetch(`${import.meta.env.VITE_API_URL}/api/image/mask-json?projectId=${projectId}&docId=${pdfDocument.id}&pageNum=${selectedPage}`, {
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        console.log('[MASK JSON]', data); // <-- Add this line
        setMaskJson(data);
      })
      .catch(() => setMaskJson(null));
  }, [toggledImgSrc, projectId, pdfDocument?.id, selectedPage]);

  return (
    <div className="document-viewer" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', userSelect: dragging ? 'none' : 'auto', cursor: dragging ? 'grabbing' : 'auto' }}>
      {pdfDocument ? (
        <React.Fragment>
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
                cursor: (() => {
                  if (activeTool === 'pan') return imgDraggingRef.current ? 'grabbing' : 'grab';
                  if (activeTool === 'highlight') return 'crosshair';
                  if (activeTool === 'stickyNote') return 'copy';
                  if (activeTool === 'drawing') return drawingCurrentPath ? 'crosshair' : 'pencil';
                  return 'default';
                })(),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
              }}
              onMouseDown={handleImageMouseDown}
              onWheelCapture={handleImageWheel}
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
                {imageList && imageList.length > 0 && imgPage >= 1 && imgPage <= imageList.length ? (
                  <>
                    {imgLoading && <span style={{ color: '#888', position: 'absolute', left: 16, top: 40, pointerEvents: 'auto' }}>Loading image...</span>}
                    {imgError && <span style={{ color: 'red', position: 'absolute', left: 16, top: 40, pointerEvents: 'auto' }}>{imgError}</span>}
                    {imgSrc && (() => {
                      const maxW = window.innerWidth;
                      const maxH = window.innerHeight * 0.9;
                      const naturalW = imgNaturalSize.width;
                      const naturalH = imgNaturalSize.height;
                      let scale = 1;
                      if (naturalW && naturalH) {
                        scale = Math.min(maxW / naturalW, maxH / naturalH, 1);
                      }
                      const displayW = naturalW * scale * imgZoom;
                      const displayH = naturalH * scale * imgZoom;
                      return (
                        <div
                          style={{
                            position: 'absolute',
                            left: '50%',
                            top: '50%',
                            transform: `translate(-50%, -50%) translate(${imgPan.x}px, ${imgPan.y}px)`,
                            width: displayW,
                            height: displayH,
                            boxShadow: '0 2px 8px #0001',
                            background: '#fff',
                            cursor: 'inherit',
                            userSelect: 'none',
                            pointerEvents: 'auto',
                            maxWidth: maxW,
                            maxHeight: maxH,
                          }}
                          onMouseDown={handleImageMouseDown}
                        >
                          <img
                            src={imgSrc}
                            alt={`Page ${imgPage}`}
                            style={{
                              display: 'block',
                              width: displayW,
                              height: displayH,
                              objectFit: 'contain',
                              pointerEvents: 'none',
                              userSelect: 'none',
                              opacity: imgLoading ? 0.5 : 1,
                              cursor: 'inherit',
                            }}
                            draggable={false}
                            onLoad={e => {
                              setImgNaturalSize({
                                width: e.target.naturalWidth,
                                height: e.target.naturalHeight
                              });
                            }}
                          />
                          {/* --- SVG overlay for selectable mask regions --- */}
                          {maskJson?.predictions?.length > 0 && (
                            <svg
                              width={displayW}
                              height={displayH}
                              style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                pointerEvents: 'auto',
                                zIndex: 10,
                              }}
                            >
                              {maskJson.predictions.map((pred, idx) => {
                                const { x, y, width, height } = pred;
                                if ([x, y, width, height].some(v => v == null)) return null;
                                // Scale from original image size to displayed size
                                const scaleX = displayW / maskJson.image.width;
                                const scaleY = displayH / maskJson.image.height;
                                const left = (x - width / 2) * scaleX;
                                const top = (y - height / 2) * scaleY;
                                const rectWidth = width * scaleX;
                                const rectHeight = height * scaleY;
                                const selected = selectedRoomIdx === idx;
                                return (
                                  <g key={idx}>
                                    <rect
                                      x={left}
                                      y={top}
                                      width={rectWidth}
                                      height={rectHeight}
                                      fill={selected ? 'rgba(255,215,0,0.5)' : 'rgba(0,200,255,0.35)'}
                                      stroke={selected ? '#FFD700' : '#FF0080'}
                                      strokeWidth={selected ? 4 : 2}
                                      style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                                      onClick={e => {
                                        e.stopPropagation();
                                        setSelectedRoomIdx(idx);
                                      }}
                                    />
                                    {/* Empty text box for now */}
                                    <text
                                      x={left + rectWidth / 2}
                                      y={top + rectHeight / 2}
                                      textAnchor="middle"
                                      alignmentBaseline="middle"
                                      fontSize={18}
                                      fill="#222"
                                      pointerEvents="none"
                                    >
                                      {/* No label */}
                                    </text>
                                    {/* Bubble form for selected room */}
                                    {selected && (
                                      <foreignObject
                                        x={left + rectWidth + 8}
                                        y={top}
                                        width={180}
                                        height={110}
                                        style={{ pointerEvents: 'auto', zIndex: 100 }}
                                      >
                                        <div
                                          style={{
                                            background: '#fff',
                                            border: '2px solid #FFD700',
                                            borderRadius: 12,
                                            boxShadow: '0 2px 12px rgba(30,60,114,0.15)',
                                            padding: 12,
                                            fontSize: 15,
                                            width: 160,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 8,
                                          }}
                                        >
                                          <div style={{ fontWeight: 700, color: '#222', marginBottom: 2 }}>
                                            Estimated Sq Ft: <span style={{ color: '#1976d2' }}>{estimateSqFt(rectWidth / scaleX, rectHeight / scaleY, maskJson)}</span>
                                          </div>
                                          <label style={{ fontSize: 13, color: '#444', marginBottom: 2 }}>
                                            Floor Material:
                                            <input
                                              type="text"
                                              value={roomMaterialInputs[idx] || ''}
                                              onChange={e => setRoomMaterialInputs(inputs => ({ ...inputs, [idx]: e.target.value }))}
                                              style={{
                                                marginLeft: 6,
                                                padding: '4px 8px',
                                                borderRadius: 6,
                                                border: '1px solid #ccc',
                                                fontSize: 14,
                                                width: '90%',
                                              }}
                                              placeholder="e.g. Tile, Carpet"
                                            />
                                          </label>
                                          <button
                                            style={{
                                              marginTop: 4,
                                              background: '#ffd600',
                                              color: '#222',
                                              border: 'none',
                                              borderRadius: 6,
                                              padding: '6px 12px',
                                              fontWeight: 600,
                                              cursor: 'pointer',
                                            }}
                                            onClick={e => {
                                              e.stopPropagation();
                                              // You can handle save logic here if needed
                                            }}
                                          >
                                            Save
                                          </button>
                                        </div>
                                      </foreignObject>
                                    )}
                                  </g>
                                );
                              })}
                            </svg>
                          )}
                          {/* --- end SVG overlay --- */}
                          {/* ...other overlays... */}
                        </div>
                      );
                    })()}
                  </>
                ) : (!manifestLoading && !manifestError) ? (
                  <span style={{ color: '#888', position: 'absolute', left: 16, top: 16, pointerEvents: 'auto' }}>No image for this page</span>
                ) : null}
              </div>
            </div>
          ) : pdfDocument.type === 'application/pdf' ? (
            <div
              ref={scrollContainerRef}
              style={{
                flex: 1,
                width: '100%',
                height: '100%',
                background: '#fff',
                position: 'relative',
                overflow: 'auto',
                cursor: (() => {
                  if (activeTool === 'pan') return dragging ? 'grabbing' : 'grab';
                  if (activeTool === 'highlight') return 'crosshair';
                  if (activeTool === 'stickyNote') return 'copy';
                  if (activeTool === 'drawing') return 'url("data:image/svg+xml,%3Csvg width=\'32\' height=\'32\' viewBox=\'0 0 32 32\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M6 26L26 6L28 8L8 28L6 26Z\' fill=\'%231976d2\' stroke=\'%23333\' stroke-width=\'2\'/\%3E%3Crect x=\'4\' y=\'24\' width=\'4\' height=\'4\' fill=\'%23ffd600\' stroke=\'%23333\' stroke-width=\'1\'/\%3E%3C/svg%3E") 0 32, pointer';
                  return 'default';
                })(),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseDown={e => {
                if (activeTool === 'highlight') handleHighlightMouseDown(e);
                else if (activeTool === 'pan') handleMouseDown(e);
                else if (activeTool === 'stickyNote') handleStickyNoteMouseDown(e);
                else if (activeTool === 'drawing') handleDrawingMouseDown(e);
              }}
              onMouseMove={e => {
                if (activeTool === 'highlight') handleHighlightMouseMove(e);
                else if (activeTool === 'pan') handleMouseMove(e);
                else if (activeTool === 'drawing') handleDrawingMouseMove(e);
              }}
              onMouseUp={e => {
                if (activeTool === 'highlight') handleHighlightMouseUp(e);
                else if (activeTool === 'pan') handleMouseUp(e);
                else if (activeTool === 'drawing') handleDrawingMouseUp(e);
              }}
              onMouseLeave={e => {
                if (activeTool === 'highlight') handleHighlightMouseUp(e);
                else if (activeTool === 'pan') handleMouseUp(e);
                else if (activeTool === 'drawing') handleDrawingMouseUp(e);
              }}
              onWheel={handleWheel}
            >
              {loading && <span style={{ color: '#888', position: 'absolute', left: 16, top: 16 }}>Loading page...</span>}
              {error && <span style={{ color: 'red', position: 'absolute', left: 16, top: 16 }}>{error}</span>}
              <div style={{ position: 'relative', width: `${FIXED_CANVAS_WIDTH * zoom}px`, margin: '0 auto' }}>
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
                    cursor: 'inherit',
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
                {/* Drawing overlay for PDF mode */}
                <DrawingRender
                  drawingPaths={drawingPaths}
                  setDrawingPaths={setDrawingPaths}
                  drawingCurrentPath={drawingCurrentPath && typeof drawingCurrentPath === 'object' ? drawingCurrentPath : null}
                  setDrawingCurrentPath={setDrawingCurrentPath}
                  displayW={FIXED_CANVAS_WIDTH * zoom}
                  displayH={canvasRef.current ? canvasRef.current.height : 1}
                  page={pageNumber}
                  isImage={false}
                  activeTool={activeTool}
                />
                {activeTool === 'highlight' && drawingHighlight && (() => {
                  const { x0, y0, x1, y1 } = drawingHighlight;
                  const x = Math.min(x0, x1);
                  const y = Math.min(y0, y1);
                  const width = Math.abs(x1 - x0);
                  const height = Math.abs(y1 - y0);
                  return (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${x * 100}%`,
                        top: `${y * 100}%`,
                        width: `${width * 100}%`,
                        height: `${height * 100}%`,
                        background: '#ffeb3b',
                        opacity: 0.25,
                        border: '1.5px dashed #ffd600',
                        borderRadius: 4,
                        pointerEvents: 'none',
                      }}
                    />
                  );
                })()}
                {/* Sticky notes for PDF mode */}
                <StickyNoteRender
                  stickyNotes={stickyNotes}
                  setStickyNotes={setStickyNotes}
                  isImage={false}
                  displayW={FIXED_CANVAS_WIDTH * zoom}
                  displayH={1}
                  page={pageNumber}
                />
              </div>
            </div>
          ) : (
            <iframe
              src={docUrl}
              title={docName}
              style={{ width: '100%', height: 'calc(100% - 24px)', border: 'none' }}
              allow="fullscreen"
            />
          )}
        </React.Fragment>
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

