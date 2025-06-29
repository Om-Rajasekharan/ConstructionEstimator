
import { Box, Typography } from '@mui/material';
import React from 'react';

const PDFUploadBox = ({ onDrop, onDragOver, onClick, fileInputRef, onFileChange, error }) => (
  <Box
    sx={{
      minHeight: '70vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Box
      onDrop={onDrop}
      onDragOver={onDragOver}
      sx={{
        border: '2.5px dashed #1976d2',
        borderRadius: 3,
        p: 6,
        width: 400,
        textAlign: 'center',
        bgcolor: 'transparent',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 6,
        transition: 'box-shadow 0.3s, border-color 0.3s',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        '&:hover': {
          boxShadow: 12,
          borderColor: '#00eaff',
        },
        animation: 'gradientBG 6s ease-in-out infinite',
        background: 'linear-gradient(120deg, #e3eafc 0%, #d1eaff 50%, #e3eafc 100%)',
        backgroundSize: '200% 200%',
      }}
      onClick={onClick}
    >
      <Box id="upload-cta" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'opacity 0.3s', opacity: 1 }}>
        <Box sx={{
          width: 64,
          height: 64,
          mb: 2,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #1976d2 60%, #00eaff 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 24px #00eaff99',
          animation: 'pulseGlow 2s infinite',
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V6M5 12l7-7 7 7"/><rect x="5" y="19" width="14" height="2" rx="1" fill="#fff" opacity=".2"/></svg>
        </Box>
        <Typography variant="h5" color="primary" gutterBottom>
          Drag & Drop your RFP PDF here
        </Typography>
        <Typography variant="body2" color="textSecondary">
          or click to select a file
        </Typography>
        <input
          type="file"
          accept="application/pdf"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={onFileChange}
        />
        {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
      </Box>
      <style>{`
        @keyframes gradientBG {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 24px #00eaff99, 0 0 0 0 #00eaff44; }
          70% { box-shadow: 0 0 32px #00eaffcc, 0 0 0 12px #00eaff22; }
          100% { box-shadow: 0 0 24px #00eaff99, 0 0 0 0 #00eaff44; }
        }
        .bounce {
          animation: bounceAnim 0.3s;
        }
        @keyframes bounceAnim {
          0% { transform: scale(1); }
          30% { transform: scale(1.08); }
          60% { transform: scale(0.96); }
          100% { transform: scale(1); }
        }
      `}</style>
    </Box>
  </Box>
);

export default PDFUploadBox;
