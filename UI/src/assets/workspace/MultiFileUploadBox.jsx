import React, { useRef, useState } from 'react';
import { Box, Typography, Button, List, ListItem, IconButton, LinearProgress, CircularProgress } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

export default function MultiFileUploadBox({ onConfirm, error, onUploadComplete, projectId }) {
  const fileInputRef = useRef();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [localError, setLocalError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progressArr, setProgressArr] = useState([]);

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
      minHeight: '60vh',
      width: 420,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      border: '2.5px dashed #1976d2',
      borderRadius: 3,
      bgcolor: '#fff',
      boxShadow: 6,
      p: 5,
      margin: 'auto',
    }}>
      <Typography variant="h5" sx={{ color: '#1976d2', fontWeight: 700, mb: 2 }}>
        Upload Project Documents
      </Typography>
      <Button
        variant="contained"
        component="span"
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        disabled={uploading}
        sx={{ mb: 2, bgcolor: '#1976d2', color: '#fff', fontWeight: 700 }}
      >
        Select PDF Files
      </Button>
      <input
        type="file"
        multiple
        accept="application/pdf"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <List sx={{ width: '100%', bgcolor: 'transparent', mb: 2 }}>
        {selectedFiles.map((file, idx) => (
          <ListItem key={idx} secondaryAction={
            <IconButton edge="end" aria-label="delete" onClick={() => handleRemove(idx)} disabled={uploading}>
              <DeleteIcon />
            </IconButton>
          } sx={{ flexDirection: 'column', alignItems: 'flex-start', gap: 0.5 }}>
            <Typography sx={{ color: '#232526', mb: 0.5 }}>{file.name}</Typography>
            {uploading && (
              <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinearProgress variant="determinate" value={progressArr[idx] || 0} sx={{ flex: 1, height: 8, borderRadius: 2 }} />
                <Typography variant="caption" sx={{ minWidth: 36, color: '#1976d2', fontWeight: 500 }}>{progressArr[idx] || 0}%</Typography>
                {progressArr[idx] < 100 && <CircularProgress size={18} sx={{ ml: 1, color: '#1976d2' }} />}
              </Box>
            )}
          </ListItem>
        ))}
      </List>
      {(error || localError) && <Typography color="error" sx={{ mt: 1 }}>{error || localError}</Typography>}
      <Button
        variant="contained"
        onClick={handleConfirm}
        disabled={uploading || !selectedFiles.length}
        sx={{ mt: 2, bgcolor: '#232526', color: '#fff', fontWeight: 700 }}
      >
        Confirm Upload
      </Button>
    </Box>
  );
}
