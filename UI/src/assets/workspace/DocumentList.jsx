import React, { useState } from 'react';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import MenuIcon from '@mui/icons-material/Menu';

export default function DocumentList({ documents, onSelect, selectedDocId, collapsed, setCollapsed }) {
  const [expandedDocId, setExpandedDocId] = useState(null);
  if (collapsed) {
    return (
      <div style={{ width: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16, background: '#f5f6fa', height: '100%' }}>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8 }}
          onClick={() => setCollapsed(false)}
          title="Expand document list"
        >
          <MenuIcon style={{ color: '#1976d2', fontSize: 28 }} />
        </button>
      </div>
    );
  }

  return (
    <div className="document-list" style={{ padding: 16, width: 250, background: '#f5f6fa', height: '100%', boxSizing: 'border-box', borderRight: '1px solid #bfc2c7' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ color: '#232526', fontWeight: 700, flex: 1, margin: 0 }}>Documents</h3>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8 }}
          onClick={() => setCollapsed(true)}
          title="Collapse document list"
        >
          <MenuOpenIcon style={{ color: '#1976d2', fontSize: 24 }} />
        </button>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
        {documents.map(doc => (
          <li key={doc.id} style={{ marginBottom: 4 }}>
            <div
              style={{
                background: expandedDocId === doc.id ? '#e3eafc' : 'transparent',
                color: '#232526',
                fontWeight: 700,
                borderRadius: 6,
                padding: '8px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                border: doc.id === selectedDocId ? '2px solid #1976d2' : '1px solid #bfc2c7',
                transition: 'background 0.18s, color 0.18s',
              }}
              onClick={() => setExpandedDocId(expandedDocId === doc.id ? null : doc.id)}
            >
              <span style={{ flex: 1 }}>{doc.name}</span>
              <span style={{ fontSize: '0.85em', color: '#1976d2', marginLeft: 8 }}>
                ({doc.type})
              </span>
            </div>
            {expandedDocId === doc.id && Array.isArray(doc.pages) && doc.pages.length > 0 && (
              <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0 0' }}>
                {doc.pages.map((page, idx) => (
                  <li
                    key={page.pageNumber}
                    className={selectedDocId === `${doc.id}-page-${page.pageNumber}` ? 'selected' : ''}
                    onClick={e => { e.stopPropagation(); onSelect(`${doc.id}-page-${page.pageNumber}`); }}
                    style={{
                      background: selectedDocId === `${doc.id}-page-${page.pageNumber}` ? '#1976d2' : 'transparent',
                      color: selectedDocId === `${doc.id}-page-${page.pageNumber}` ? '#fff' : '#232526',
                      fontWeight: selectedDocId === `${doc.id}-page-${page.pageNumber}` ? 700 : 500,
                      borderRadius: 3,
                      padding: '3px 18px',
                      marginBottom: 2,
                      cursor: 'pointer',
                      fontSize: '0.93em',
                    }}
                  >
                    Page {page.pageNumber}
                  </li>
                ))}
              </ul>
            )}

            {expandedDocId === doc.id && Array.isArray(doc.pageImages) && doc.pageImages.length > 0 && (
              <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0 0' }}>
                {doc.pageImages.map((img, idx) => {
                  const pageNum = idx + 1;
                  return (
                    <li
                      key={pageNum}
                      className={selectedDocId === `${doc.id}-page-${pageNum}` ? 'selected' : ''}
                      onClick={e => { e.stopPropagation(); onSelect(`${doc.id}-page-${pageNum}`); }}
                      style={{
                        background: selectedDocId === `${doc.id}-page-${pageNum}` ? '#1976d2' : 'transparent',
                        color: selectedDocId === `${doc.id}-page-${pageNum}` ? '#fff' : '#232526',
                        fontWeight: selectedDocId === `${doc.id}-page-${pageNum}` ? 700 : 500,
                        borderRadius: 3,
                        padding: '3px 18px',
                        marginBottom: 2,
                        cursor: 'pointer',
                        fontSize: '0.93em',
                      }}
                    >
                      Page {pageNum}
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
