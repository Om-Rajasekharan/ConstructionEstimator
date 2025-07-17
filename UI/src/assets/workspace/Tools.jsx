import React from 'react';
import { FaStickyNote, FaHighlighter, FaPencilAlt, FaHandPaper } from 'react-icons/fa';
import StickyNote from './tools/stickyNote';
import Highlight from './tools/highlight';
import Drawing from './tools/drawing';
import Pan from './tools/pan';

export default function Tools({ activeTool, setActiveTool }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0 12px' }}>
      <button
        title="Pan/Move"
        onClick={() => setActiveTool('pan')}
        style={{
          background: activeTool === 'pan' ? '#e0e0e0' : '#fff',
          border: '1px solid #ccc',
          borderRadius: 6,
          padding: 6,
          cursor: 'inherit',
        }}
      >
        <FaHandPaper color={activeTool === 'pan' ? '#1976d2' : '#888'} size={20} />
      </button>
      <button
        title="Sticky Note"
        onClick={() => setActiveTool('stickyNote')}
        style={{
          background: activeTool === 'stickyNote' ? '#ffe066' : '#fff',
          border: '1px solid #ccc',
          borderRadius: 6,
          padding: 6,
          cursor: 'inherit',
        }}
      >
        <FaStickyNote color={activeTool === 'stickyNote' ? '#bfa600' : '#888'} size={20} />
      </button>
      <button
        title="Highlight"
        onClick={() => setActiveTool('highlight')}
        style={{
          background: activeTool === 'highlight' ? '#fffde7' : '#fff',
          border: '1px solid #ccc',
          borderRadius: 6,
          padding: 6,
          cursor: 'inherit',
        }}
      >
        <FaHighlighter color={activeTool === 'highlight' ? '#ffd600' : '#888'} size={20} />
      </button>
      <button
        title="Drawing"
        onClick={() => setActiveTool('drawing')}
        style={{
          background: activeTool === 'drawing' ? '#e3f2fd' : '#fff',
          border: '1px solid #ccc',
          borderRadius: 6,
          padding: 6,
          cursor: 'inherit',
        }}
      >
        <FaPencilAlt color={activeTool === 'drawing' ? '#1976d2' : '#888'} size={20} />
      </button>
    </div>
  );
}

export const ToolClasses = {
  pan: Pan,
  stickyNote: StickyNote,
  highlight: Highlight,
  drawing: Drawing,
};
