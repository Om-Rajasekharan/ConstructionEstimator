import React, { useState } from 'react';
import { Box, Paper, Button, Typography, Avatar, Fade, FormControl, InputLabel, Select, MenuItem, TextField } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const Calculate = ({
  pdfFile,
  showHighlighting,
  processing,
  responseStarted,
  handleCalculate,
  isExistingProject = false,
  projectMeta = null,
}) => {
  const [hover, setHover] = useState(false);
  const [model, setModel] = useState('gpt-4o');
  const [temperature, setTemperature] = useState(0.7);
  const [customPrompt, setCustomPrompt] = useState('');

  if (isExistingProject && projectMeta && projectMeta.gcsAiUrl) {
    return (
      <Paper elevation={4} sx={{ p: 3, mb: 3, borderRadius: 4, background: 'linear-gradient(120deg, #232526 60%, #35363a 100%)', boxShadow: '0 8px 32px 0 #23252699', width: '100%', maxWidth: 600, mx: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ color: '#ffd580', fontWeight: 700, mb: 1 }}>
          Project: {projectMeta.name}
        </Typography>
        <Typography variant="body2" sx={{ color: '#bfc2c7', mb: 1 }}>
          Uploaded: {projectMeta.createdAt ? new Date(projectMeta.createdAt).toLocaleString() : 'Unknown'}
        </Typography>
        <Typography variant="body2" sx={{ color: '#bfc2c7', mb: 1 }}>
          Model: {projectMeta.model || 'N/A'} | Temperature: {projectMeta.temperature ?? 'N/A'}
        </Typography>
        {projectMeta.customPrompt && (
          <Typography variant="body2" sx={{ color: '#bfc2c7', mb: 1 }}>
            Custom Prompt: {projectMeta.customPrompt}
          </Typography>
        )}
        <Typography variant="body2" sx={{ color: '#bfc2c7', fontSize: '0.98rem', mt: 2 }}>
          This project was previously processed. You can view the estimate below.
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <Box sx={{ width: '100%' }}>
        {!responseStarted && !processing && (
          <Paper elevation={4} sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            maxWidth: 600,
            mx: 'auto',
            p: 3,
            mb: 3,
            borderRadius: 4,
            background: 'linear-gradient(120deg, #232526 60%, #35363a 100%)',
            boxShadow: '0 8px 32px 0 #23252699',
          }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
              <FormControl sx={{ minWidth: 150, background: '#18191a', borderRadius: 2, boxShadow: '0 2px 8px #23252633', px: 1, py: 0.5 }} size="small">
                <InputLabel id="model-label" sx={{ color: '#bfc2c7' }}>Model</InputLabel>
                <Select
                  labelId="model-label"
                  value={model}
                  label="Model"
                  onChange={e => setModel(e.target.value)}
                  sx={{ bgcolor: 'transparent', color: '#fff', borderRadius: 2, '.MuiOutlinedInput-notchedOutline': { borderColor: '#444' } }}
                  inputProps={{ sx: { color: '#fff' } }}
                >
                  <MenuItem value="gpt-4o">GPT-4o</MenuItem>
                  <MenuItem value="gpt-4">GPT-4</MenuItem>
                  <MenuItem value="claude-3-opus">Claude 3 Opus</MenuItem>
                  <MenuItem value="claude-3-sonnet">Claude 3 Sonnet</MenuItem>
                  <MenuItem value="gpt-4.1">GPT-4.1</MenuItem>
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 120, background: '#18191a', borderRadius: 2, boxShadow: '0 2px 8px #23252633', px: 1, py: 0.5 }} size="small">
                <TextField
                  label="Temperature"
                  type="number"
                  value={temperature}
                  onChange={e => setTemperature(e.target.value)}
                  inputProps={{ min: 0, max: 2, step: 0.01, style: { color: '#fff' } }}
                  sx={{ bgcolor: 'transparent', borderRadius: 2, '& .MuiInputLabel-root': { color: '#bfc2c7' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' }, width: 120 }}
                  size="small"
                />
              </FormControl>
              <FormControl sx={{ minWidth: 220, flex: 1, background: '#18191a', borderRadius: 2, boxShadow: '0 2px 8px #23252633', px: 1, py: 0.5 }} size="small">
                <TextField
                  label="Custom Prompt (optional)"
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  sx={{ bgcolor: 'transparent', borderRadius: 2, '& .MuiInputLabel-root': { color: '#bfc2c7' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' } }}
                  size="small"
                  fullWidth
                />
              </FormControl>
            </Box>
            <Button
              variant="contained"
              sx={{
                bgcolor: '#232526',
                color: '#fff',
                fontWeight: 700,
                borderRadius: 2,
                px: 3,
                boxShadow: '0 2px 8px #23252633',
                letterSpacing: 1,
                fontSize: '1.1rem',
                '&:hover': { bgcolor: '#35363a' },
                mt: 1,
              }}
              size="large"
              onClick={() => handleCalculate(model, temperature, customPrompt)}
              disabled={!pdfFile || showHighlighting || processing}
            >
              Calculate
            </Button>
            <Fade in={hover && !showHighlighting && !processing && !responseStarted} timeout={200}>
              <Paper elevation={4} sx={{ p: 2.5, mt: 2, borderRadius: 3, bgcolor: '#232526', width: 270, maxWidth: '80vw', position: 'absolute', zIndex: 10, boxShadow: '0 8px 32px 0 #23252699', display: hover ? 'block' : 'none' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Avatar sx={{ bgcolor: '#444', mr: 1 }}>
                    <InfoOutlinedIcon />
                  </Avatar>
                  <Typography variant="h6" sx={{ color: '#fff', fontSize: '1.08rem' }}>
                    How does this work?
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: '#bfc2c7', fontSize: '0.98rem' }}>
                  Upload your RFP PDF. Our AI-powered service will parse the document, extract all relevant construction requirements, and calculate a professional bid estimate for your project. Click 'Calculate' to get started!
                </Typography>
              </Paper>
            </Fade>
          </Paper>
        )}
      </Box>
      {processing && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4, width: '100%' }}>
          <Paper elevation={6} sx={{ bgcolor: '#232526', p: 4, borderRadius: 4, boxShadow: '0 8px 32px 0 #23252699', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 320 }}>
            <Box sx={{ mb: 3 }}>
              {/* Modern glowing spinner */}
              <Box sx={{ position: 'relative', width: 64, height: 64 }}>
                <Box sx={{
                  position: 'absolute',
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  border: '6px solid #444',
                  borderTop: '6px solid #ffd580',
                  animation: 'spin 1.2s linear infinite',
                  boxShadow: '0 0 16px 2px #ffd58055',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                  },
                }} />
              </Box>
            </Box>
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, mb: 1, letterSpacing: 0.5 }}>
              Analyzing your RFP and preparing your estimate
            </Typography>
            <Typography variant="body2" sx={{ color: '#bfc2c7', fontSize: '1.05rem', mb: 0, display: 'flex', alignItems: 'center' }}>
              This may take a minute or two
              <Box component="span" sx={{ ml: 1, fontWeight: 700, color: '#ffd580', animation: 'ellipsis 1.5s steps(4,end) infinite' }}>
                ...
              </Box>
            </Typography>
          </Paper>
        </Box>
      )}
    </>
  );
};

export default Calculate;
