import React, { useRef, useState } from 'react';
import { Box, Typography, Button, LinearProgress, CircularProgress } from '@mui/material';

export default function FileUploadBox({ onFilesUploaded, error }) {
  const fileInputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [progress, setProgress] = useState(0); 
  const [currentFile, setCurrentFile] = useState('');

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    setLocalError('');
    setProgress(0);
    setCurrentFile('');
    try {

      if (onFilesUploaded.length > 1) {
        await onFilesUploaded(files, setProgress, setCurrentFile);
      } else {

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setCurrentFile(file.name);
          await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            formData.append('pdf', file);
            xhr.open('POST', `${import.meta.env.VITE_API_URL}/api/pdf/processPdf`, true);
            xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                setProgress(Math.round((event.loaded / event.total) * 100));
              }
            };
            xhr.onload = () => {
              setProgress(100);
              setTimeout(() => setProgress(0), 500);
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
        await onFilesUploaded(files);
      }
    } catch (err) {
      setLocalError('Upload failed.');
    }
    setUploading(false);
    setCurrentFile('');
    setProgress(0);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4, border: '2.5px dashed #1976d2', borderRadius: 3, width: 400, bgcolor: 'transparent', boxShadow: 6 }}>
      <Typography variant="h6" color="primary" gutterBottom>
        Upload Project Documents
      </Typography>
      <Button
        variant="contained"
        component="span"
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        disabled={uploading}
        sx={{ mb: 2 }}
      >
        Select Files
      </Button>
      <input
        type="file"
        multiple
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      {uploading && (
        <Box sx={{ width: '100%', mt: 2, mb: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <CircularProgress size={36} sx={{ mb: 1, color: '#1976d2' }} />
          <LinearProgress variant="determinate" value={progress} sx={{ width: '100%', height: 8, borderRadius: 2, mb: 1 }} />
          <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }}>{currentFile ? `Uploading: ${currentFile}` : 'Uploading...'} ({progress}%)</Typography>
        </Box>
      )}
      {(error || localError) && <Typography color="error" sx={{ mt: 2 }}>{error || localError}</Typography>}
    </Box>
  );
}
