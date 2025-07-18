import React from 'react';

/**
 * DrawingRender - Renders drawing paths/shapes on a canvas overlay.
 * @param {Object[]} drawingPaths - Array of Drawing objects (or plain path objects)
 * @param {Function} setDrawingPaths - State setter for drawing paths
 * @param {Object} drawingCurrentPath - Current path being drawn
 * @param {Function} setDrawingCurrentPath - State setter for current path
 * @param {number} displayW - Display width (pixels)
 * @param {number} displayH - Display height (pixels)
 * @param {number} page - Current page number
 * @param {boolean} isImage - True if rendering for image, false for PDF
 */
export default function DrawingRender({ drawingPaths, setDrawingPaths, drawingCurrentPath, setDrawingCurrentPath, displayW, displayH, page, isImage, activeTool }) {
  const canvasRef = React.useRef(null);

  // Draw all paths for the current page
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const paths = [...drawingPaths, drawingCurrentPath].filter(p => p && p.page === page);
    paths.forEach(path => {
      if (!path.points || path.points.length < 2) return;
      const distinct = path.points.filter((pt, idx, arr) => idx === 0 || pt.x !== arr[idx - 1].x || pt.y !== arr[idx - 1].y);
      if (distinct.length < 2) return;
      ctx.strokeStyle = path.color || '#1976d2';
      ctx.lineWidth = path.width || 2;
      ctx.beginPath();
      distinct.forEach((pt, idx) => {
        const x = pt.x * canvas.width;
        const y = pt.y * canvas.height;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
  }, [drawingPaths, drawingCurrentPath, displayW, displayH, page]);

  function handleMouseDown(e) {
    if (activeTool !== 'drawing') return;
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) * canvas.width / rect.width) / canvas.width;
    const y = ((e.clientY - rect.top) * canvas.height / rect.height) / canvas.height;
    setDrawingCurrentPath({ page, points: [{ x, y }], color: '#1976d2', width: 2 });
  }
  function handleMouseMove(e) {
    if (activeTool !== 'drawing') return;
    if (!canvasRef.current || !drawingCurrentPath) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) * canvas.width / rect.width) / canvas.width;
    const y = ((e.clientY - rect.top) * canvas.height / rect.height) / canvas.height;
    setDrawingCurrentPath(path => path ? { ...path, points: [...path.points, { x, y }] } : null);
  }
  function handleMouseUp() {
    if (activeTool !== 'drawing') return;
    if (!drawingCurrentPath) return;
    setDrawingPaths(paths => [...paths, drawingCurrentPath]);
    setDrawingCurrentPath(null);
  }

  React.useEffect(() => {
    if (activeTool !== 'drawing' || !drawingCurrentPath) return;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [drawingCurrentPath, activeTool]);

  return (
    <canvas
      ref={canvasRef}
      width={Math.round(displayW)}
      height={Math.round(displayH)}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: Math.round(displayW) + 'px',
        height: Math.round(displayH) + 'px',
        pointerEvents: activeTool === 'drawing' ? 'auto' : 'none',
        zIndex: 5
      }}
      onMouseDown={activeTool === 'drawing' ? handleMouseDown : undefined}
    />
  );
}
