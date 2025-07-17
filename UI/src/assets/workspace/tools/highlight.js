
// Highlight Tool
// Usage: import HighlightTool from './highlight';

class Highlight {
  constructor({ author, page, x, y, width, height, color = '#ffeb3b', createdAt = new Date() }) {
    this.author = author;
    this.page = page;
    this.x = x; // top-left x (relative 0-1)
    this.y = y; // top-left y (relative 0-1)
    this.width = width; // relative width (0-1)
    this.height = height; // relative height (0-1)
    this.color = color;
    this.createdAt = createdAt;
  }
}

const HighlightTool = {
  Highlight,

  handleMouseDownPDF({ e, canvasRef, setDrawingHighlight }) {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setDrawingHighlight({ x0: x, y0: y, x1: x, y1: y });
  },
  handleMouseMovePDF({ e, canvasRef, drawingHighlight, setDrawingHighlight }) {
    if (!drawingHighlight || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setDrawingHighlight(d => d ? { ...d, x1: x, y1: y } : null);
  },
  handleMouseUpPDF({ e, canvasRef, drawingHighlight, setDrawingHighlight, setHighlights, selectedPage, ToolClasses }) {
    if (!drawingHighlight || !canvasRef.current) return;
    const { x0, y0, x1, y1 } = drawingHighlight;
    const x = Math.min(x0, x1);
    const y = Math.min(y0, y1);
    const width = Math.abs(x1 - x0);
    const height = Math.abs(y1 - y0);
    if (width > 0.01 && height > 0.01) {
      const HighlightCtor = ToolClasses && typeof ToolClasses.highlight === 'function' ? ToolClasses.highlight : HighlightTool.Highlight;
      setHighlights(hs => [...hs, new HighlightCtor({
        author: 'me',
        page: selectedPage || 1,
        x, y, width, height
      })]);
    }
    setDrawingHighlight(null);
  },

  handleMouseDownImage({ e, imgDivRef, setDrawingHighlight }) {
    if (!imgDivRef.current) return;
    const rect = imgDivRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setDrawingHighlight({ x0: x, y0: y, x1: x, y1: y });
  },
  handleMouseMoveImage({ e, imgDivRef, drawingHighlight, setDrawingHighlight }) {
    if (!drawingHighlight || !imgDivRef.current) return;
    const rect = imgDivRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setDrawingHighlight(d => d ? { ...d, x1: x, y1: y } : null);
  },
  handleMouseUpImage({ drawingHighlight, setDrawingHighlight, setHighlights, imgPage, ToolClasses }) {
    if (!drawingHighlight) return;
    const { x0, y0, x1, y1 } = drawingHighlight;
    const x = Math.min(x0, x1);
    const y = Math.min(y0, y1);
    const width = Math.abs(x1 - x0);
    const height = Math.abs(y1 - y0);
    if (width > 0.01 && height > 0.01) {
      const HighlightCtor = ToolClasses && typeof ToolClasses.highlight === 'function' ? ToolClasses.highlight : HighlightTool.Highlight;
      setHighlights(hs => [...hs, new HighlightCtor({
        author: 'me',
        page: imgPage,
        x, y, width, height
      })]);
    }
    setDrawingHighlight(null);
  }
};

export default HighlightTool;
