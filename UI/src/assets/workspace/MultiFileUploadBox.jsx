import React, { useRef, useState } from 'react';
import { Box, Typography, Button, List, ListItem, IconButton, LinearProgress, CircularProgress } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

export default function MultiFileUploadBox({ onConfirm, error, onUploadComplete, projectId }) {
  const fileInputRef = useRef();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [localError, setLocalError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progressArr, setProgressArr] = useState([]);
  // ...existing code...

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
    setLocalError('');
  };

  const handleRemove = (idx) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleConfirm = async () => {
    if (!selectedFiles.length) {
      setLocalError('Please select at least one file.');
      return;
    }
    setUploading(true);
    setLocalError('');
    setProgressArr(Array(selectedFiles.length).fill(0));
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const formData = new FormData();
          formData.append('pdf', file);
          if (projectId) {
            formData.append('projectId', projectId);
          }
          xhr.open('POST', `${import.meta.env.VITE_API_URL}/api/pdf/processPdf`, true);
          xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              setProgressArr(prev => {
                const arr = [...prev];
                arr[i] = Math.round((event.loaded / event.total) * 100);
                return arr;
              });
            }
          };
          xhr.onload = () => {
            setProgressArr(prev => {
              const arr = [...prev];
              arr[i] = 100;
              return arr;
            });
            setTimeout(() => setProgressArr(prev => {
              const arr = [...prev];
              arr[i] = 0;
              return arr;
            }), 500);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error('Upload failed'));
            }
          };
          xhr.onerror = () => reject(new Error('Upload failed'));
          xhr.send(formData);
        });
      }
      setSelectedFiles([]);
      setProgressArr([]);
      if (onUploadComplete) onUploadComplete();
    } catch {
      setLocalError('Upload failed.');
    }
    setUploading(false);
  };

  return (
    <Box sx={{
      minHeight: '70vh',
      width: 480,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      border: '6px solid',
      borderColor: '#fff',
      borderRadius: 6,
      bgcolor: '#111',
      boxShadow: '0 0 60px 10px #fff8, 0 0 120px 20px #000c',
      p: 5,
      margin: 'auto',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated black and white background */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        background: 'radial-gradient(circle at 20% 30%, #fff2 0%, transparent 60%), radial-gradient(circle at 80% 70%, #0008 0%, transparent 60%)',
        animation: 'bgPulseBW 10s infinite alternate',
      }} />
      <style>{`
        @keyframes bgPulseBW {
          0% { filter: blur(0px) brightness(1); }
          100% { filter: blur(8px) brightness(1.2); }
        }
        .bw-title {
          color: #fff;
          font-weight: 900;
          letter-spacing: 2px;
          text-shadow: 0 0 24px #fff, 0 0 48px #000;
        }
        .glow-btn {
          box-shadow: 0 0 20px 5px #fff8, 0 0 40px 10px #000c;
          animation: btnPulseBW 1.5s infinite alternate;
        }
        @keyframes btnPulseBW {
          0% { filter: brightness(1); }
          100% { filter: brightness(1.5); }
        }
        .file-list-item {
          background: linear-gradient(90deg, #fff2, #0002);
          border-radius: 8px;
          margin-bottom: 8px;
          box-shadow: 0 0 12px 2px #fff4;
          position: relative;
        }
        .delete-btn-absurd {
          color: #fff;
          background: linear-gradient(135deg, #fff 0%, #000 100%);
          border-radius: 50%;
          box-shadow: 0 0 10px 2px #fff8;
          transition: transform 0.2s;
        }
        .delete-btn-absurd:hover {
          transform: scale(1.2) rotate(-15deg);
          background: linear-gradient(135deg, #000 0%, #fff 100%);
        }
      `}</style>
      <Typography variant="h3" className="bw-title" sx={{ mb: 3, zIndex: 2 }}>
        🚀 Upload Project Documents 🚀
      </Typography>
      <Button
        variant="contained"
        component="span"
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        disabled={uploading}
        className="glow-btn"
        sx={{ mb: 3, bgcolor: '#fff', color: '#111', fontWeight: 900, fontSize: 22, px: 4, py: 1.5, borderRadius: 4, border: '2px solid #000', textTransform: 'uppercase', letterSpacing: 2, zIndex: 2 }}
      >
        <span style={{ filter: 'drop-shadow(0 0 8px #fff)' }}>Select PDF Files</span>
      </Button>
      <input
        type="file"
        multiple
        accept="application/pdf"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <List sx={{ width: '100%', bgcolor: 'transparent', mb: 2, zIndex: 2 }}>
        {selectedFiles.map((file, idx) => (
          <ListItem key={idx} className="file-list-item" secondaryAction={
            <IconButton edge="end" aria-label="delete" onClick={() => handleRemove(idx)} disabled={uploading} className="delete-btn-absurd">
              <DeleteIcon />
            </IconButton>
          } sx={{ flexDirection: 'column', alignItems: 'flex-start', gap: 0.5, py: 2, px: 2 }}>
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 18, textShadow: '0 0 8px #fff' }}>{file.name}</Typography>
            {uploading && (
              <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                <LinearProgress variant="determinate" value={progressArr[idx] || 0} sx={{ flex: 1, height: 12, borderRadius: 6, bgcolor: '#fff4', boxShadow: '0 0 8px #fff' }} />
                <Typography variant="caption" sx={{ minWidth: 36, color: '#fff', fontWeight: 900, fontSize: 16, textShadow: '0 0 8px #000' }}>{progressArr[idx] || 0}%</Typography>
                {progressArr[idx] < 100 && <CircularProgress size={24} sx={{ ml: 2, color: '#fff', filter: 'drop-shadow(0 0 8px #fff)' }} />}
              </Box>
            )}
          </ListItem>
        ))}
      </List>
      {(error || localError) && <Typography color="error" sx={{ mt: 2, fontWeight: 900, fontSize: 20, textShadow: '0 0 8px #fff' }}>{error || localError}</Typography>}
      <Button
        variant="contained"
        onClick={handleConfirm}
        disabled={uploading || !selectedFiles.length}
        className="glow-btn"
        sx={{ mt: 3, bgcolor: '#000', color: '#fff', fontWeight: 900, fontSize: 22, px: 4, py: 1.5, borderRadius: 4, border: '2px solid #fff', textTransform: 'uppercase', letterSpacing: 2, zIndex: 2 }}
      >
        <span style={{ color: '#fff', filter: 'drop-shadow(0 0 8px #fff)' }}>Takeoff</span>
      </Button>
      {/* ...existing code... */}
      {/* Absurd animated confetti when upload is complete (black and white) */}
      {(!uploading && progressArr.length === 0 && selectedFiles.length === 0) && (
        <Box sx={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
          {[...Array(30)].map((_, i) => (
            <Box key={i} sx={{
              position: 'absolute',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: `linear-gradient(135deg, #fff, #000)`,
              boxShadow: '0 0 12px 2px #fff8',
              opacity: 0.7,
              animation: `confettiDropBW 2.5s linear ${Math.random()}s infinite`,
            }} />
          ))}
          <style>{`
            @keyframes confettiDropBW {
              0% { transform: translateY(-40px) scale(1) rotate(0deg); opacity: 0.7; }
              50% { transform: translateY(40px) scale(1.2) rotate(180deg); opacity: 1; }
              100% { transform: translateY(120px) scale(0.8) rotate(360deg); opacity: 0.5; }
            }
          `}</style>
        </Box>
      )}
    </Box>
  );
}
