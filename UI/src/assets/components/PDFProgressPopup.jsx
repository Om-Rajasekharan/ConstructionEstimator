import React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';

function PDFProgressPopup({ progress, total, isProcessing }) {
  if (!isProcessing) return null;
  if (typeof total !== 'number' || isNaN(total) || total < 1) {
    return (
      <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
        <Paper elevation={6} sx={{ p: 2, borderRadius: 2, bgcolor: '#fffbe7', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 240, maxWidth: 400, width: '100%' }}>
          <Typography variant="subtitle1" color="primary" sx={{ mb: 1 }}>
            Preparing PDF for processing...
          </Typography>
          <CircularProgress size={32} sx={{ mt: 1, mb: 1 }} />
        </Paper>
      </Box>
    );
  }
  const percent = total > 0 ? Math.round((progress / total) * 100) : 0;
  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
      <Paper elevation={6} sx={{ p: 2, borderRadius: 2, bgcolor: '#fffbe7', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 240, maxWidth: 400, width: '100%' }}>
        <Typography variant="subtitle1" color="primary" sx={{ mb: 1 }}>
          Processing PDF: {progress} / {total} chunks ({percent}%)
        </Typography>
        <LinearProgress variant="determinate" value={percent} sx={{ width: '100%', height: 8, borderRadius: 2 }} />
      </Paper>
    </Box>
  );
}

export default PDFProgressPopup;
