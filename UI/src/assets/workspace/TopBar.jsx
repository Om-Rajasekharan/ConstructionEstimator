import React from 'react';

export default function TopBar({ projectName, onUpload }) {
  return (
    <div className="top-bar" style={{ display: 'flex', alignItems: 'center', padding: '0 16px', height: 56, background: '#f5f5f5', borderBottom: '1px solid #eee' }}>
      <h2 style={{ flex: 1, margin: 0 }}>{projectName}</h2>
      <button onClick={onUpload}>Upload Document</button>
    </div>
  );
}
