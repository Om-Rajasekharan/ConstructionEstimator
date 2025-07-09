import React, { useState, useEffect } from 'react';
const Spinner = () => (
  <span
    style={{
      display: 'inline-block',
      width: 18,
      height: 18,
      border: '2.5px solid #fff',
      borderTop: '2.5px solid #1976d2',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
      marginRight: 8,
      verticalAlign: 'middle',
    }}
  />
);

const spinnerStyle = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;


const Conversation = ({ aiResponsePath, onAIResponse, projectId, docId, pageNum }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiReply, setAiReply] = useState(null);
  const [conversation, setConversation] = useState([]);

  useEffect(() => {
    async function fetchHistory() {
      if (!projectId) return;
      const API_BASE = import.meta.env.VITE_API_URL || '';
      const aiResponsePath = `project_${projectId}/ai_response.json`;
      const url = `${API_BASE.replace(/\/$/, '')}/api/image/${aiResponsePath}`;
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.conversation) setConversation(data.conversation);
      } catch {}
    }
    fetchHistory();
  }, [projectId]);
  const [contextScope] = useState('current-page');



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
    if (!prompt.trim() || (!aiResponsePath && contextScope !== 'current-page')) {
      return;
    }
    let cleanAiResponsePath = aiResponsePath;
    if (cleanAiResponsePath.startsWith('pdfs_and_responses/')) {
      cleanAiResponsePath = cleanAiResponsePath.replace(/^pdfs_and_responses\//, '');
    }
    console.log('[AI Assistant] Ask AI button pressed');
    setLoading(true);
    setError(null);
    setAiReply(null);
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
      console.log('[AI Assistant] Sending to backend:', payload);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI request failed');
      setAiReply(data);
      if (onAIResponse) onAIResponse(data);
      if (data && data.conversation) {
        setConversation(data.conversation);
      } else if (data && data.content && data.content.conversation) {
        setConversation(data.content.conversation);
      } else if (data && data.answer_json && data.answer_json.conversation) {
        setConversation(data.answer_json.conversation);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 0, padding: 0, border: 'none', borderRadius: 0, background: 'none' }}>
      <div style={{ fontWeight: 700, fontSize: 20, color: '#1976d2', marginBottom: 12, marginTop: 8, textAlign: 'left', letterSpacing: 0.5 }}>Ask AI about this estimate</div>
      <div style={{ marginBottom: 10, display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ fontWeight: 500, color: '#222' }}>Context:</span>
        <span style={{
          background: 'linear-gradient(90deg, #0f2027 0%, #2c5364 100%)',
          color: '#fff',
          borderRadius: 8,
          padding: '4px 16px',
          fontWeight: 700,
          fontSize: 15,
          letterSpacing: 0.3,
          boxShadow: '0 2px 8px #0ff2',
          border: '1.5px solid #21a1e1',
          textShadow: '0 1px 8px #21a1e1cc',
        }}>Current Page</span>
      </div>
      <form
        onSubmit={e => {
          e.preventDefault();
          handleAskAI();
        }}
        style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}
        autoComplete="off"
      >
        <input
          type="text"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Ask a question or request a change..."
          style={{
            flex: 1,
            padding: '12px 16px',
            border: '2px solid #1976d2',
            borderRadius: 10,
            fontSize: 17,
            outline: 'none',
            background: loading ? '#e9f1fb' : '#f8fafc',
            color: '#232526',
            transition: 'border 0.2s',
            boxShadow: loading ? 'none' : '0 2px 8px #1976d211',
            fontWeight: 500,
            letterSpacing: 0.2,
          }}
          disabled={loading}
          autoFocus
        />
        <button
          type="submit"
          onClick={e => {
            e.preventDefault();
            let cleanAiResponsePath = aiResponsePath;
            if (cleanAiResponsePath && cleanAiResponsePath.startsWith('pdfs_and_responses/')) {
              cleanAiResponsePath = cleanAiResponsePath.replace(/^pdfs_and_responses\//, '');
            }
            const payload = {
              prompt,
              aiResponsePath: cleanAiResponsePath,
              contextScope,
              context: getContextForScope(),
              projectId,
              docId,
              pageNum
            };
            console.log('[AI Assistant] Button clicked');
            console.log('[AI Assistant] Payload to backend:', payload);
            handleAskAI();
          }}
          disabled={loading || !prompt.trim()}
          style={{
            background: loading ? 'linear-gradient(90deg, #b3c6e0 0%, #b3c6e0 100%)' : 'linear-gradient(90deg, #1976d2 0%, #21a1e1 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '12px 22px',
            fontWeight: 700,
            fontSize: 17,
            cursor: (!loading && prompt.trim()) ? 'pointer' : 'not-allowed',
            boxShadow: loading ? 'none' : '0 2px 8px #1976d244',
            transition: 'background 0.2s',
            outline: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 120,
            letterSpacing: 0.2,
          }}
        >
          {loading && <Spinner />}
          {loading ? 'Asking...' : 'Ask AI'}
        </button>
      </form>
      {error && <div style={{ color: '#d32f2f', marginTop: 8, fontWeight: 500 }}>{error}</div>}
      {/* Spinner style for animation */}
      <style>{spinnerStyle}</style>

      {/* Conversation history */}
      {conversation && conversation.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h4 style={{ color: '#1976d2', fontWeight: 700, marginBottom: 10 }}>Conversation History</h4>
          <div style={{ maxHeight: 300, overflowY: 'auto', background: '#f4f8fd', padding: 16, borderRadius: 10, color: '#232526', boxShadow: '0 2px 8px #1976d211' }}>
            {conversation.map((entry, idx) => (
              <div key={idx} style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ background: 'linear-gradient(90deg, #1976d2 0%, #21a1e1 100%)', color: '#fff', borderRadius: 8, padding: '10px 16px', fontWeight: 600, marginBottom: 4, maxWidth: '80%', alignSelf: 'flex-end', boxShadow: '0 2px 8px #1976d244' }}>
                  You: <span style={{ color: '#fff', fontWeight: 500 }}>{entry.question}</span>
                </div>
                <div style={{ background: 'linear-gradient(90deg, #232526 0%, #43484d 100%)', color: '#fff', borderRadius: 8, padding: '10px 16px', fontWeight: 600, marginBottom: 2, maxWidth: '80%', alignSelf: 'flex-start', boxShadow: '0 2px 8px #23252644' }}>
                  AI: <span style={{ color: '#fff', fontWeight: 500 }}>{entry.answer}</span>
                </div>
                {entry.timestamp && <div style={{ fontSize: 12, color: '#888', marginLeft: 4 }}>{new Date(entry.timestamp).toLocaleString()}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {aiReply && (
        <div style={{
          marginTop: 28,
          background: 'linear-gradient(120deg, #232526 0%, #0f2027 60%, #21a1e1 100%)',
          border: '2.5px solid #21a1e1',
          padding: 28,
          borderRadius: 22,
          color: '#e3f6ff',
          boxShadow: '0 8px 32px #21a1e188, 0 1.5px 8px #0ff2',
          fontWeight: 600,
          fontSize: 18,
          letterSpacing: 0.15,
          maxWidth: 700,
          marginLeft: 'auto',
          marginRight: 'auto',
          position: 'relative',
          overflow: 'hidden',
          borderTopLeftRadius: 60,
          borderBottomRightRadius: 60,
          borderTopRightRadius: 22,
          borderBottomLeftRadius: 22,
          transition: 'box-shadow 0.2s',
        }}>
          <div style={{
            position: 'absolute',
            top: -22,
            left: 32,
            background: 'linear-gradient(90deg, #21a1e1 0%, #232526 100%)',
            color: '#fff',
            padding: '4px 22px',
            borderRadius: 14,
            fontWeight: 800,
            fontSize: 16,
            boxShadow: '0 2px 12px #21a1e1cc',
            border: '1.5px solid #21a1e1',
            textShadow: '0 1px 8px #21a1e1cc',
            textTransform: 'uppercase',
            letterSpacing: 1.5,
          }}>AI Response</div>
          <pre style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            color: '#e3f6ff',
            background: 'transparent',
            margin: 0,
            fontSize: 17,
            fontWeight: 600,
            letterSpacing: 0.13,
            textShadow: '0 1px 8px #21a1e144',
            fontFamily: 'Fira Mono, Menlo, Monaco, Consolas, monospace',
          }}>
            {typeof aiReply.content === 'object' ? JSON.stringify(aiReply.content, null, 2) : aiReply.content}
          </pre>
        </div>
      )}
    </div>
  );
};

export default Conversation;
