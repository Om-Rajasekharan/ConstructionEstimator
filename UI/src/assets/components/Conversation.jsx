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

const Conversation = ({ aiResponsePath, onAIResponse, projectId }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiReply, setAiReply] = useState(null);
  const [conversation, setConversation] = useState([]);
  useEffect(() => {
    const fetchConversation = async () => {
      const pid = projectId || window.projectIdForConversation;
      if (!pid) return;
      const API_BASE = import.meta.env.VITE_API_URL || '';
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`${API_BASE}/api/postresponse/${pid}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        let convo = [];
        if (data && data.conversation) {
          convo = data.conversation;
        } else if (data && data.content && data.content.conversation) {
          convo = data.content.conversation;
        } else if (data && data.answer_json && data.answer_json.conversation) {
          convo = data.answer_json.conversation;
        }
        setConversation(Array.isArray(convo) ? convo : []);
      } catch (e) {
        setConversation([]);
      }
    };
    fetchConversation();
  }, [aiResponsePath, projectId]);

  const handleAskAI = async () => {
    if (!prompt.trim() || !aiResponsePath) {
      return;
    }
    // Ensure aiResponsePath does not include the bucket name (just the object path)
    let cleanAiResponsePath = aiResponsePath;
    if (cleanAiResponsePath.startsWith('pdfs_and_responses/')) {
      cleanAiResponsePath = cleanAiResponsePath.replace(/^pdfs_and_responses\//, '');
    }
    setLoading(true);
    setError(null);
    setAiReply(null);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || '';
      const url = `${API_BASE.replace(/\/$/, '')}/api/conversation/ask`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, aiResponsePath: cleanAiResponsePath })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI request failed');
      setAiReply(data);
      if (onAIResponse) onAIResponse(data);
      // Refresh conversation after posting
      const pid = projectId || window.projectIdForConversation;
      if (pid) {
        const token = localStorage.getItem('token');
        fetch(`${API_BASE}/api/postresponse/${pid}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => {
            if (data && data.conversation) setConversation(data.conversation);
          });
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
      <form
        onSubmit={e => { e.preventDefault(); handleAskAI(); }}
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
            padding: '10px 12px',
            border: '1.5px solid #1976d2',
            borderRadius: 6,
            fontSize: 16,
            outline: 'none',
            background: loading ? '#f6f8fa' : '#fff',
            color: '#222',
            transition: 'border 0.2s',
            boxShadow: loading ? 'none' : '0 1px 4px #1976d211',
          }}
          disabled={loading}
          autoFocus
        />
        <button
          type="submit"
          onClick={handleAskAI}
          disabled={loading || !prompt.trim()}
          style={{
            background: loading ? '#b3c6e0' : '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '10px 18px',
            fontWeight: 700,
            fontSize: 16,
            cursor: (!loading && prompt.trim()) ? 'pointer' : 'not-allowed',
            boxShadow: loading ? 'none' : '0 1px 4px #1976d244',
            transition: 'background 0.2s',
            outline: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 100,
          }}
        >
          {loading && <Spinner />}
          {loading ? 'Asking...' : 'Ask AI'}
        </button>
      </form>
      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
      {/* Spinner style for animation */}
      <style>{spinnerStyle}</style>

      {/* Conversation history */}
      {conversation && conversation.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h4>Conversation History</h4>
          <div style={{ maxHeight: 300, overflowY: 'auto', background: '#f6f8fa', padding: 12, borderRadius: 6, color: '#222' }}>
            {conversation.map((entry, idx) => (
              <div key={idx} style={{ marginBottom: 16 }}>
                <div><strong>You:</strong> <span style={{ color: '#00529B' }}>{entry.question}</span></div>
                <div><strong>AI:</strong> <span style={{ color: '#008000' }}>{entry.answer}</span></div>
                {entry.timestamp && <div style={{ fontSize: 12, color: '#888' }}>{new Date(entry.timestamp).toLocaleString()}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {aiReply && (
        <div style={{ marginTop: 16, background: '#fafbfc', padding: 12, borderRadius: 6, color: '#222' }}>
          <strong>AI Response:</strong>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#00529B', background: 'inherit', margin: 0 }}>
            {typeof aiReply.content === 'object' ? JSON.stringify(aiReply.content, null, 2) : aiReply.content}
          </pre>
        </div>
      )}
    </div>
  );
};

export default Conversation;
