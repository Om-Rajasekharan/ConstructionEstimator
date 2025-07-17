
// Drawing Tool
// Usage: Freehand or shape drawing on a page

class Drawing {
  constructor({ author, page, type = 'freehand', points = [], color = '#1976d2', width = 2, createdAt = new Date() }) {
    this.author = author;
    this.page = page;
    this.type = type; // 'freehand', 'rect', 'ellipse', 'arrow', etc.
    this.points = points; // [{x, y}, ...] relative coordinates
    this.color = color;
    this.width = width; // stroke width in px
    this.createdAt = createdAt;
  }

  static handleMouseDown({ e, canvasRef, selectedPage, setDrawingCurrentPath }) {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setDrawingCurrentPath({ page: selectedPage || 1, points: [{ x, y }] });
  }

  static handleMouseMove({ e, canvasRef, setDrawingCurrentPath, drawingCurrentPath }) {
    if (!canvasRef.current || !drawingCurrentPath) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setDrawingCurrentPath(path => path ? { ...path, points: [...path.points, { x, y }] } : null);
  }

  static handleMouseUp({ setDrawingPaths, drawingCurrentPath, setDrawingCurrentPath }) {
    if (!drawingCurrentPath) return;
    setDrawingPaths(paths => [...paths, drawingCurrentPath]);
    setDrawingCurrentPath(null);
  }
}

export default Drawing;
