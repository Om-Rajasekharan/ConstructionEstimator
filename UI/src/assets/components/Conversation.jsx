import React, { useState, useEffect, useRef } from 'react';
import './Conversation.css';

const Spinner = () => (
  <div className="ai-spinner">
    <div className="spinner-ring"></div>
    <div className="spinner-ring"></div>
    <div className="spinner-ring"></div>
  </div>
);

const Conversation = ({ aiResponsePath, onAIResponse, projectId, docId, pageNum, onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [contextScope, setContextScope] = useState('current-page');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(null);
  const lastEntryRef = useRef(null);
  const [windowPos, setWindowPos] = useState({ x: 200, y: 120 });
  const [windowSize, setWindowSize] = useState({ width: 700, height: 600 });
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizing, setResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 700, height: 600 });
  const windowRef = useRef(null);

  useEffect(() => {
    async function fetchHistory() {
      if (!projectId) return;
      const API_BASE = import.meta.env.VITE_API_URL || '';
      const url = `${API_BASE.replace(/\/$/, '')}/api/image/conversation/${projectId}`;
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.conversation) setConversation(data.conversation);
      } catch {}
    }
    fetchHistory();
  }, [projectId]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  const getContextForScope = () => {
    if (contextScope === 'current-page') {
      return 'Context: current page content.';
    } else if (contextScope === 'current-file') {
      return 'Context: current file content.';
    } else if (contextScope === 'whole-workspace') {
      return 'Context: whole workspace content.';
    }
    return '';
  };

  const handleAskAI = async () => {
    if (!prompt.trim()) {
      return;
    }
    let cleanAiResponsePath = aiResponsePath;
    if (cleanAiResponsePath.startsWith('pdfs_and_responses/')) {
      cleanAiResponsePath = cleanAiResponsePath.replace(/^pdfs_and_responses\//, '');
    }
    setLoading(true);
    setError(null);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || '';
      const url = `${API_BASE.replace(/\/$/, '')}/api/conversation/ask`;
      const context = getContextForScope();
      const payload = {
        prompt,
        aiResponsePath: cleanAiResponsePath,
        contextScope,
        context,
        projectId,
        docId,
        pageNum
      };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI request failed');
      if (onAIResponse) onAIResponse(data);
      if (data && data.conversation) {
        setConversation(data.conversation);
        setHighlightIdx(data.conversation.length - 1);
      } else if (data && data.content && data.content.conversation) {
        setConversation(data.content.conversation);
        setHighlightIdx(data.content.conversation.length - 1);
      } else if (data && data.answer_json && data.answer_json.conversation) {
        setConversation(data.answer_json.conversation);
        setHighlightIdx(data.answer_json.conversation.length - 1);
      } else if (data && data.content) {
        setConversation(prev => {
          const idx = prev.length;
          setHighlightIdx(idx);
          return [
            ...prev,
            {
              isUser: true,
              question: prompt,
              answer: typeof data.content === 'object' ? JSON.stringify(data.content, null, 2) : data.content,
              timestamp: Date.now(),
            },
          ];
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (highlightIdx !== null) {
      const timeout = setTimeout(() => setHighlightIdx(null), 2200);
      return () => clearTimeout(timeout);
    }
  }, [highlightIdx]);


  useEffect(() => {
    if (lastEntryRef.current) {
      lastEntryRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [conversation, highlightIdx]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const fullscreenOffset = 64;
  const glassyStyle = isFullscreen
    ? {
        background: 'linear-gradient(135deg, rgba(30,30,30,0.92) 0%, rgba(60,60,60,0.88) 100%)',
        border: '1.5px solid rgba(255,255,255,0.10)',
        borderRadius: 24,
        boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
        backdropFilter: 'blur(16px)',
        color: '#f3f3f3',
        zIndex: 3000,
        position: 'fixed',
        left: 0,
        top: fullscreenOffset,
        width: '100vw',
        height: `calc(100vh - ${fullscreenOffset}px)`,
        minHeight: 340,
        maxHeight: '100vh',
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        alignItems: 'stretch',
        justifyContent: 'center',
      }
    : {
        background: 'linear-gradient(135deg, rgba(30,30,30,0.97) 0%, rgba(60,60,60,0.97) 100%)',
        border: '1.5px solid rgba(255,255,255,0.13)',
        borderRadius: 18,
        boxShadow: '0 8px 32px rgba(0,0,0,0.32)',
        backdropFilter: 'blur(14px)',
        color: '#f3f3f3',
        zIndex: 3001,
        position: 'fixed',
        left: windowPos.x,
        top: windowPos.y,
        width: windowSize.width,
        height: windowSize.height,
        minWidth: 340,
        minHeight: 340,
        maxWidth: '98vw',
        maxHeight: '95vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s',
        userSelect: dragging || resizing ? 'none' : 'auto',
        cursor: dragging ? 'move' : 'default',
      };
  const glassyButton = {
    background: 'rgba(30,30,30,0.75)',
    color: '#fff',
    border: '1.5px solid rgba(255,255,255,0.18)',
    borderRadius: 16,
    padding: '6px 16px',
    fontSize: 18,
    fontWeight: 700,
    boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
    backdropFilter: 'blur(8px)',
    cursor: 'pointer',
    marginLeft: 8,
    transition: 'all 0.2s',
    outline: 'none',
  };

  function onDragStart(e) {
    if (!isFullscreen && (e.target.classList.contains('ai-header') || e.target.classList.contains('ai-title'))) {
      setDragging(true);
      setDragOffset({ x: e.clientX - windowPos.x, y: e.clientY - windowPos.y });
    }
  }
  function onDrag(e) {
    if (dragging && !isFullscreen) {
      setWindowPos({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    }
  }
  function onDragEnd() {
    setDragging(false);
  }

  function onResizeStart(e) {
    if (!isFullscreen) {
      setResizing(true);
      setResizeStart({ x: e.clientX, y: e.clientY, width: windowSize.width, height: windowSize.height });
      e.stopPropagation();
    }
  }
  function onResize(e) {
    if (resizing && !isFullscreen) {
      const dx = e.clientX - resizeStart.x;
      const dy = e.clientY - resizeStart.y;
      setWindowSize({
        width: Math.max(340, Math.min(resizeStart.width + dx, window.innerWidth - windowPos.x - 10)),
        height: Math.max(340, Math.min(resizeStart.height + dy, window.innerHeight - windowPos.y - 10)),
      });
    }
  }
  function onResizeEnd() {
    setResizing(false);
  }

  useEffect(() => {
    if (!isFullscreen && (dragging || resizing)) {
      window.addEventListener('mousemove', dragging ? onDrag : onResize);
      window.addEventListener('mouseup', dragging ? onDragEnd : onResizeEnd);
      return () => {
        window.removeEventListener('mousemove', dragging ? onDrag : onResize);
        window.removeEventListener('mouseup', dragging ? onDragEnd : onResizeEnd);
      };
    }
  }, [dragging, resizing, isFullscreen, dragOffset, resizeStart, windowPos, windowSize]);

  return (
    <div
      ref={windowRef}
      className={`ai-conversation ${isFullscreen ? 'fullscreen' : ''}`}
      style={glassyStyle}
      onMouseDown={onDragStart}
    >
      {/* Main content and right panel split for fullscreen */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          width: '100%',
          height: '100%',
          flexDirection: isFullscreen ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: isFullscreen ? 'hidden' : 'visible',
          position: 'relative',
        }}
      >
        {/* Main conversation/history area */}
        <div
          style={{
            flex: isFullscreen ? 2.5 : 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: isFullscreen ? '100%' : '100%',
            maxWidth: isFullscreen ? 'none' : '1240px',
            margin: isFullscreen ? '0 auto' : '0 auto',
            height: isFullscreen ? '100%' : '100%',
            minHeight: 0,
            overflow: isFullscreen ? 'hidden' : 'visible',
            background: 'none',
            position: 'relative',
          }}
        >
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}



          {conversation && conversation.length > 0 && (
            <div
              className={`conversation-history${isFullscreen ? '' : ' nonfullscreen'}`}
              style={isFullscreen ? {
                width: '90vw',
                maxWidth: '1400px',
                margin: '32px auto 0 auto',
                flex: 1,
                overflowY: 'auto',
                padding: '0 0 32px 0',
                display: 'flex',
                flexDirection: 'column',
                gap: 28,
                background: 'none',
                alignSelf: 'center',
                height: '90vh',
                minHeight: 0,
              } : {
                width: '100%',
                maxWidth: '1240px',
                margin: 0,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                background: 'none',
                alignSelf: 'center',
                minHeight: 0,
                position: 'absolute',
                top: 96, // header (56) + context (40)
                left: 0,
                right: 0,
                height: 'calc(100% - 96px - 80px)', // fill between header/context and input
                padding: '0 0 0 0',
              }}
            >
              {conversation.map((entry, idx) => (
                <div
                  key={idx}
                  ref={idx === conversation.length - 1 ? lastEntryRef : null}
                  className="conversation-item"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: entry.isUser ? 'flex-end' : 'flex-start',
                    gap: 6,
                    border: (highlightIdx === idx && !entry.isUser)
                      ? '2.5px solid'
                      : undefined,
                    borderImage: (highlightIdx === idx && !entry.isUser)
                      ? 'linear-gradient(90deg, #a18cd1 0%, #fbc2eb 50%, #fad0c4 100%) 1'
                      : undefined,
                    transition: 'border 0.5s',
                  }}
                >
                  <div
                    className="conversation-question"
                    style={{
                      alignSelf: 'flex-end',
                      background: 'linear-gradient(90deg, #a18cd1 0%, #fbc2eb 50%, #fad0c4 100%)',
                      color: '#232526',
                      fontSize: isFullscreen ? 22 : 17,
                      fontWeight: 600,
                      borderRadius: 18,
                      padding: isFullscreen ? '18px 32px' : '10px 18px',
                      marginBottom: 2,
                      maxWidth: '80%',
                      boxShadow: '0 2px 16px 0 rgba(161,140,209,0.18)',
                      border: '1.5px solid rgba(161,140,209,0.18)',
                      backdropFilter: 'blur(6px)',
                    }}
                  >
                    <span style={{ opacity: 0.7, fontWeight: 400, fontSize: isFullscreen ? 16 : 13, marginRight: 8 }}>You</span>
                    {entry.question}
                  </div>
                  <div
                    className="conversation-answer"
                    style={{
                      alignSelf: 'flex-start',
                      background: 'linear-gradient(90deg, #232526 0%, #414345 100%)',
                      color: '#fff',
                      fontSize: isFullscreen ? 22 : 17,
                      fontWeight: 600,
                      borderRadius: 18,
                      padding: isFullscreen ? '18px 32px' : '10px 18px',
                      marginTop: 2,
                      maxWidth: '80%',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
                      border: '1.5px solid rgba(60,60,60,0.18)',
                      backdropFilter: 'blur(6px)',
                    }}
                  >
                    <span style={{ opacity: 0.7, fontWeight: 400, fontSize: isFullscreen ? 16 : 13, marginRight: 8 }}>AI</span>
                    {entry.answer}
                  </div>
                  {entry.timestamp && (
                    <div
                      className="conversation-timestamp"
                      style={{
                        fontSize: isFullscreen ? 15 : 11,
                        color: '#b0b8c7',
                        marginTop: 2,
                        alignSelf: 'center',
                      }}
                    >
                      {new Date(entry.timestamp).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Right-side panel for fullscreen controls and context */}
        {isFullscreen && (
          <div style={{
            flex: 1,
            minWidth: 320,
            maxWidth: 420,
            background: 'rgba(30,30,30,0.85)',
            borderLeft: '1.5px solid rgba(255,255,255,0.10)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: '32px 18px 0 18px',
            gap: 32,
            height: '100%',
          }}>
            <h2
              className="ai-title"
              style={{
                color: '#f3f3f3',
                fontWeight: 700,
                fontSize: 32,
                margin: 0,
                letterSpacing: 0.2,
                textAlign: 'center',
                width: '100%',
              }}
            >
              AI Assistant
            </h2>
            <div className="ai-controls" style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'center' }}>
              <button style={glassyButton} onClick={toggleFullscreen} title="Exit Fullscreen">⤢</button>
              <button style={glassyButton} onClick={() => {
                setIsFullscreen(false);
                if (onClose) onClose();
              }} title="Close">✕</button>
            </div>
            <div className="context-selector" style={{ width: '100%', marginTop: 24 }}>
              <button
                className={`context-button ${contextScope === 'current-page' ? 'active' : ''}`}
                onClick={() => setContextScope('current-page')}
                style={{ width: '100%', marginBottom: 8 }}
              >
                Current Page
              </button>
              <button
                className={`context-button ${contextScope === 'current-file' ? 'active' : ''}`}
                onClick={() => setContextScope('current-file')}
                style={{ width: '100%', marginBottom: 8 }}
              >
                Current File
              </button>
              <button
                className={`context-button ${contextScope === 'whole-workspace' ? 'active' : ''}`}
                onClick={() => setContextScope('whole-workspace')}
                style={{ width: '100%' }}
              >
                Whole Workspace
              </button>
            </div>
          </div>
        )}
      </div>
      {/* For non-fullscreen, keep header and context selector at top*/}
      {!isFullscreen && (
        <>
          <div
            className="ai-header"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 20px 8px 20px',
              background: 'rgba(30,30,30,0.97)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              width: '100%',
              margin: 0,
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 10,
              cursor: dragging ? 'move' : 'grab',
              userSelect: 'none',
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
            }}
          >
            <h2
              className="ai-title"
              style={{
                color: '#f3f3f3',
                fontWeight: 700,
                fontSize: 20,
                margin: 0,
                letterSpacing: 0.2,
                textAlign: 'center',
                flex: 1,
                userSelect: 'none',
              }}
            >
              AI Assistant
            </h2>
            <div className="ai-controls" style={{ position: 'absolute', right: 24, top: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <button style={glassyButton} onClick={toggleFullscreen} title="Fullscreen">⤢</button>
              <button style={glassyButton} onClick={onClose} title="Close">✕</button>
            </div>
          </div>
          <div className="context-selector" style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            position: 'absolute',
            top: 56,
            left: 0,
            zIndex: 9,
            background: 'rgba(30,30,30,0.97)',
            padding: '6px 0 6px 0',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}>
            <button
              className={`context-button ${contextScope === 'current-page' ? 'active' : ''}`}
              onClick={() => setContextScope('current-page')}
            >
              Current Page
            </button>
            <button
              className={`context-button ${contextScope === 'current-file' ? 'active' : ''}`}
              onClick={() => setContextScope('current-file')}
            >
              Current File
            </button>
            <button
              className={`context-button ${contextScope === 'whole-workspace' ? 'active' : ''}`}
              onClick={() => setContextScope('whole-workspace')}
            >
              Whole Workspace
            </button>
          </div>
        </>
      )}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleAskAI();
        }}
        className="input-container"
        style={{
          width: isFullscreen ? '90vw' : '100%',
          maxWidth: isFullscreen ? '1400px' : '1240px',
          margin: isFullscreen ? '0 auto' : '16px auto 0 auto',
          position: isFullscreen ? 'absolute' : 'fixed',
          bottom: isFullscreen ? 24 : 16,
          left: isFullscreen ? 0 : undefined,
          right: isFullscreen ? 0 : undefined,
          zIndex: 11,
        }}
      >
        <input
          type="text"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Ask about construction details, measurements, materials..."
          className="ai-input"
          disabled={loading}
          autoFocus
        />
        <button
          type="submit"
          className="send-button"
          disabled={loading || !prompt.trim()}
        >
          {loading ? (
            <>
              <Spinner />
              Analyzing...
            </>
          ) : (
            'Ask AI'
          )}
        </button>
      </form>
      {!isFullscreen && (
        <div
          className="resize-handle"
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: 24,
            height: 24,
            cursor: 'nwse-resize',
            zIndex: 20,
            background: 'rgba(255,255,255,0.08)',
            borderBottomRightRadius: 18,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            userSelect: 'none',
          }}
          onMouseDown={onResizeStart}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" style={{ opacity: 0.5 }}><path d="M2 16h14M6 12h10M10 8h6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
        </div>
      )}
    </div>
  );
};

export default Conversation;
