import React from 'react';

/**
 * StickyNoteRender - Renders sticky notes as editable/resizable text boxes or styled divs.
 * @param {Object[]} stickyNotes - Array of sticky note objects
 * @param {Function} setStickyNotes - State setter for sticky notes
 * @param {boolean} isImage - True if rendering for image, false for PDF
 * @param {number} displayW - Display width (pixels)
 * @param {number} displayH - Display height (pixels)
 * @param {number} page - Current page number
 */
export default function StickyNoteRender({ stickyNotes, setStickyNotes, isImage, displayW, displayH, page }) {
  const [draggingIdx, setDraggingIdx] = React.useState(null);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });

  function handleMouseDown(note, i, e) {
    const rect = e.target.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    if (
      mouseX > rect.width - 18 &&
      mouseY > rect.height - 18
    ) return;
    if (e.target.tagName === 'TEXTAREA') return;
    e.stopPropagation();
    const left = isImage ? note.x * displayW : e.target.offsetLeft;
    const top = isImage ? note.y * displayH : e.target.offsetTop;
    const pageX = isImage ? e.clientX : e.pageX;
    const pageY = isImage ? e.clientY : e.pageY;
    setDraggingIdx(i);
    setDragOffset({
      x: pageX - left,
      y: pageY - top
    });
  }

  React.useEffect(() => {
    function handleMouseMove(e) {
      if (draggingIdx === null) return;
      let mouseX = isImage ? e.clientX : e.pageX;
      let mouseY = isImage ? e.clientY : e.pageY;
      let newX = isImage ? (mouseX - dragOffset.x) / displayW : (mouseX - dragOffset.x) / displayW;
      let newY = isImage ? (mouseY - dragOffset.y) / displayH : (mouseY - dragOffset.y) / displayH;
      setStickyNotes(notes => notes.map((n, idx) => idx === draggingIdx ? { ...n, x: newX, y: newY } : n));
    }
    function handleMouseUp() {
      setDraggingIdx(null);
    }
    if (draggingIdx !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingIdx, dragOffset, isImage, displayW, displayH, setStickyNotes]);

  return stickyNotes.filter(n => n.page === page).map((note, i) => {
    const left = isImage ? note.x * displayW : `${note.x * 100}%`;
    const top = isImage ? note.y * displayH : `${note.y * 100}%`;
    const width = isImage ? (note.width || 0.18) * displayW : `${(note.width || 0.18) * 100}%`;
    const height = isImage ? (note.height || 0.12) * displayH : `${(note.height || 0.12) * 100}%`;
    if (note.editing) {
      return (
        <div
          key={note.createdAt || i}
          className="sticky-note-div"
          style={{
            position: 'absolute', left, top, width,

            height: 'auto',
            background: `linear-gradient(135deg, #fffbe6 0%, ${note.color || '#ffe066'} 100%)`,
            border: '2px solid #ffd600', borderRadius: 12,
            zIndex: 10, fontSize: 15, padding: '10px 12px 32px 12px',
            boxShadow: '0 4px 16px #ffd60044, 0 2px 8px #0002', whiteSpace: 'pre-wrap',
            overflow: 'auto', opacity: 0.85,
            transition: 'box-shadow 0.2s, opacity 0.2s',
            backdropFilter: 'blur(1px)',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            resize: 'both', minWidth: 80, minHeight: 40,
          }}
          onClick={e => e.stopPropagation()}
        >
          <textarea
            autoFocus
            style={{
              width: '100%', minHeight: 32,
              background: 'transparent',
              border: 'none', outline: 'none', resize: 'none',
              fontSize: 15, fontWeight: 500, color: note.textColor || '#333',
              padding: 0, margin: 0,
              overflowY: 'auto',
            }}
            value={note.text}
            placeholder="Type your note..."
            onChange={e => setStickyNotes(notes => notes.map(n => n === note ? { ...n, text: e.target.value } : n))}
            onBlur={e => setStickyNotes(notes => notes.map(n => n === note ? { ...n, editing: false } : n))}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                setStickyNotes(notes => notes.map(n => n === note ? { ...n, editing: false } : n));
              } else if (e.key === 'Escape') {
                setStickyNotes(notes => notes.filter(n => n !== note));
              }
            }}
            onInput={e => {
              // Auto-expand textarea height
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
          />
          <button
            style={{
              background: 'rgba(255, 214, 0, 0.85)', border: 'none', borderRadius: 8, color: '#333', fontWeight: 700,
              fontSize: 16, padding: '2px 10px', cursor: 'pointer', boxShadow: '0 1px 4px #ffd60044',
              opacity: 0.8, transition: 'opacity 0.2s', marginLeft: 8, position: 'absolute', right: 6, bottom: 6
            }}
            title="Delete sticky note"
            onClick={e => {
              e.stopPropagation();
              setStickyNotes(notes => notes.filter(n => n !== note));
            }}
          >✕</button>
        </div>
      );
    } else {
      return (
        <div
          key={note.createdAt || i}
          className="sticky-note-div"
          style={{
            position: 'absolute', left, top, width, height,
            background: `linear-gradient(135deg, #fffbe6 0%, #ffe066 100%)`,
            border: '2px solid #ffd600', borderRadius: 12,
            zIndex: 9, fontSize: 15, padding: '10px 12px 32px 12px',
            boxShadow: '0 4px 16px #ffd60044, 0 2px 8px #0002', whiteSpace: 'pre-wrap',
            overflow: 'auto', cursor: draggingIdx === i ? 'grabbing' : 'pointer',
            opacity: 0.85,
            transition: 'box-shadow 0.2s, opacity 0.2s',
            backdropFilter: 'blur(1px)',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            resize: 'both', minWidth: 80, minHeight: 40,
          }}
          onMouseDown={e => handleMouseDown(note, i, e)}
          onClick={e => {
            e.stopPropagation();
            setStickyNotes(notes => notes.map(n => n === note ? { ...n, editing: true } : n));
          }}
        >
          <div style={{ flex: 1, width: '100%', minHeight: 24, wordBreak: 'break-word', color: note.textColor || '#333', fontWeight: 500 }}>
            {note.text || <span style={{ color: '#888' }}>Click to edit...</span>}
          </div>
          <button
            style={{
              position: 'absolute', right: 6, bottom: 6, background: 'rgba(255, 214, 0, 0.85)',
              border: 'none', borderRadius: 8, color: '#333', fontWeight: 700,
              fontSize: 16, padding: '2px 10px', cursor: 'pointer', boxShadow: '0 1px 4px #ffd60044',
              opacity: 0.8, transition: 'opacity 0.2s',
            }}
            title="Delete sticky note"
            onClick={e => {
              e.stopPropagation();
              setStickyNotes(notes => notes.filter(n => n !== note));
            }}
          >✕</button>
        </div>
      );
    }
  });
}
