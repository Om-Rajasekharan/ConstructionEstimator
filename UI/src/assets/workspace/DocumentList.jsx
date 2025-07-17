
import React, { useState } from 'react';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import MenuIcon from '@mui/icons-material/Menu';
import DescriptionIcon from '@mui/icons-material/Description';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

export default function DocumentList({ documents, onSelect, selectedDocId, collapsed, setCollapsed }) {
  const [expandedDocId, setExpandedDocId] = useState(null);
  if (collapsed) {
    return (
      <div style={{
        width: 48,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 16,
        background: 'linear-gradient(135deg, #e3eafc 0%, #f5f6fa 100%)',
        height: '100%',
        borderRight: '1.5px solid #d0d7e6',
        boxShadow: '2px 0 8px 0 rgba(30,40,80,0.04)',
      }}>
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
    <div className="document-list" style={{
      padding: 0,
      width: 250,
      background: 'linear-gradient(135deg, #e3eafc 0%, #f5f6fa 100%)',
      height: '100%',
      boxSizing: 'border-box',
      borderRight: '1.5px solid #d0d7e6',
      boxShadow: '2px 0 8px 0 rgba(30,40,80,0.04)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '18px 18px 10px 18px',
        borderBottom: '1.5px solid #e3eafc',
        background: 'rgba(255,255,255,0.92)',
        boxShadow: '0 2px 8px 0 rgba(30,40,80,0.03)',
      }}>
        <h3 style={{
          color: '#232526',
          fontWeight: 800,
          flex: 1,
          margin: 0,
          fontSize: 19,
          letterSpacing: 0.1,
          textShadow: '0 1px 0 #fff, 0 2px 8px #e3eafc',
        }}>Documents</h3>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8, padding: 0 }}
          onClick={() => setCollapsed(true)}
          title="Collapse document list"
        >
          <MenuOpenIcon style={{ color: '#1976d2', fontSize: 24 }} />
        </button>
      </div>
      <ul style={{
        listStyle: 'none',
        padding: 0,
        margin: 0,
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto',
        flex: 1,
        background: 'none',
      }}>
        {documents.map(doc => {
          let icon = <InsertDriveFileIcon style={{ color: '#b0b8c7', fontSize: 20, marginRight: 10 }} />;
          if (doc.type && doc.type.includes('pdf')) icon = <PictureAsPdfIcon style={{ color: '#e57373', fontSize: 20, marginRight: 10 }} />;
          else if (doc.type && doc.type.includes('image')) icon = <DescriptionIcon style={{ color: '#64b5f6', fontSize: 20, marginRight: 10 }} />;
          return (
            <li key={doc.id} style={{ marginBottom: 2 }}>
              <div
                style={{
                  background: expandedDocId === doc.id ? 'linear-gradient(90deg, #e3eafc 0%, #f5f6fa 100%)' : 'transparent',
                  color: '#232526',
                  fontWeight: 700,
                  borderRadius: 8,
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  border: doc.id === selectedDocId ? '2.5px solid #1976d2' : '1.5px solid #e3eafc',
                  boxShadow: doc.id === selectedDocId ? '0 2px 12px 0 #1976d220' : 'none',
                  transition: 'background 0.18s, color 0.18s, border 0.18s, box-shadow 0.18s',
                  marginBottom: 2,
                  gap: 6,
                }}
                onClick={() => setExpandedDocId(expandedDocId === doc.id ? null : doc.id)}
                onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(90deg, #e3eafc 0%, #f5f6fa 100%)'}
                onMouseLeave={e => e.currentTarget.style.background = expandedDocId === doc.id ? 'linear-gradient(90deg, #e3eafc 0%, #f5f6fa 100%)' : 'transparent'}
              >
                {icon}
                <span style={{ flex: 1, fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</span>
                <span style={{ fontSize: '0.85em', color: '#1976d2', marginLeft: 8, fontWeight: 600, letterSpacing: 0.1 }}>
                  {doc.type && doc.type.includes('pdf') ? 'PDF' : doc.type ? doc.type.split('/')[1]?.toUpperCase() : 'FILE'}
                </span>
              </div>
              {expandedDocId === doc.id && Array.isArray(doc.pages) && doc.pages.length > 0 && (
                <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0 0', background: 'none' }}>
                  {doc.pages.map((page, idx) => (
                    <li
                      key={page.pageNumber}
                      className={selectedDocId === `${doc.id}-page-${page.pageNumber}` ? 'selected' : ''}
                      onClick={e => { e.stopPropagation(); onSelect(`${doc.id}-page-${page.pageNumber}`); }}
                      style={{
                        background: selectedDocId === `${doc.id}-page-${page.pageNumber}` ? 'linear-gradient(90deg, #1976d2 0%, #64b5f6 100%)' : 'transparent',
                        color: selectedDocId === `${doc.id}-page-${page.pageNumber}` ? '#fff' : '#232526',
                        fontWeight: selectedDocId === `${doc.id}-page-${page.pageNumber}` ? 700 : 500,
                        borderRadius: 4,
                        padding: '4px 22px',
                        marginBottom: 2,
                        cursor: 'pointer',
                        fontSize: '0.97em',
                        transition: 'background 0.18s, color 0.18s',
                      }}
                    >
                      Page {page.pageNumber}
                    </li>
                  ))}
                </ul>
              )}
              {expandedDocId === doc.id && Array.isArray(doc.pageImages) && doc.pageImages.length > 0 && (
                <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0 0', background: 'none' }}>
                  {doc.pageImages.map((img, idx) => {
                    const pageNum = idx + 1;
                    return (
                      <li
                        key={pageNum}
                        className={selectedDocId === `${doc.id}-page-${pageNum}` ? 'selected' : ''}
                        onClick={e => { e.stopPropagation(); onSelect(`${doc.id}-page-${pageNum}`); }}
                        style={{
                          background: selectedDocId === `${doc.id}-page-${pageNum}` ? 'linear-gradient(90deg, #1976d2 0%, #64b5f6 100%)' : 'transparent',
                          color: selectedDocId === `${doc.id}-page-${pageNum}` ? '#fff' : '#232526',
                          fontWeight: selectedDocId === `${doc.id}-page-${pageNum}` ? 700 : 500,
                          borderRadius: 4,
                          padding: '4px 22px',
                          marginBottom: 2,
                          cursor: 'pointer',
                          fontSize: '0.97em',
                          transition: 'background 0.18s, color 0.18s',
                        }}
                      >
                        Page {pageNum}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
