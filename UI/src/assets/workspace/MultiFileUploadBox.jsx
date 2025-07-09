import React, { useRef, useState } from 'react';
import { Box, Typography, Button, List, ListItem, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

export default function MultiFileUploadBox({ onConfirm, error }) {
  const fileInputRef = useRef();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [localError, setLocalError] = useState('');
  const [uploading, setUploading] = useState(false);

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
    try {
      await onConfirm(selectedFiles);
      setSelectedFiles([]);
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
            <IconButton edge="end" aria-label="delete" onClick={() => handleRemove(idx)}>
              <DeleteIcon />
            </IconButton>
          }>
            <Typography sx={{ color: '#232526' }}>{file.name}</Typography>
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
