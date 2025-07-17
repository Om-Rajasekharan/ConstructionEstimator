import React, { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// Helper to fetch the mask overlay from backend
async function fetchMaskOverlay({ projectId, docId, pageNum }) {
  const res = await fetch(`${API_BASE}/api/imagemasks/mask-page`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, docId, pageNum })
  });
  if (!res.ok) throw new Error('Failed to generate mask');
  return await res.json();
}

export default function FloorplanMasker({
  imageUrl,
  projectId,
  docId,
  pageNum,
  style
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleMask = async () => {
    setLoading(true);
    setError('');
    try {
      await fetchMaskOverlay({ projectId, docId, pageNum });
    } catch (e) {
      setError('Failed to generate mask');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', ...style }}>
      <button
        onClick={handleMask}
        disabled={loading}
        style={{
          marginTop: 12,
          background: 'linear-gradient(90deg, #1e3c72 0%, #2a5298 100%)',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          padding: '10px 28px',
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: 0.5,
          boxShadow: '0 2px 12px rgba(30,60,114,0.10)',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.18s',
        }}
      >
        {loading ? 'Generating Mask...' : 'Blueprint Mask'}
      </button>
      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
    </div>
  );
}
