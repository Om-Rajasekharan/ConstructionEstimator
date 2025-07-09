import React, { useRef, useState } from 'react';
import { Box, Typography, Button } from '@mui/material';

export default function FileUploadBox({ onFilesUploaded, error }) {
  const fileInputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    setLocalError('');
    try {
      await onFilesUploaded(files);
    } catch (err) {
      setLocalError('Upload failed.');
    }
    setUploading(false);
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
      {(error || localError) && <Typography color="error" sx={{ mt: 2 }}>{error || localError}</Typography>}
    </Box>
  );
}
