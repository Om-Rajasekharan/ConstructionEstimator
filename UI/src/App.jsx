import { useState, useRef } from 'react';
import { Box, Button, Typography, Paper, Grid, Avatar } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import 'pdfjs-dist/web/pdf_viewer.css';
import './App.css';
import VisualsPDF from './assets/visuals/VisualsPDF';
import PDFProgressPopup from './assets/components/PDFProgressPopup';
import Response from './assets/components/Response';

function App() {
  console.log('[App] Rendered');

  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [error, setError] = useState('');
  const [showHighlighting, setShowHighlighting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [responseStarted, setResponseStarted] = useState(false);
  const [sseUrl, setSseUrl] = useState(null);
  const [sections, setSections] = useState({});
  const [streamDone, setStreamDone] = useState(false);
  const fileInputRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setPdfUrl(URL.createObjectURL(file));
      setError('');
      setShowHighlighting(false);
      setResponseStarted(false);
      setSseUrl(null);
    } else {
      setError('Please drop a valid PDF file.');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setPdfUrl(URL.createObjectURL(file));
      setError('');
      setShowHighlighting(false);
      setResponseStarted(false);
      setSseUrl(null);
    } else {
      setError('Please select a valid PDF file.');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleCalculate = () => {
    if (!pdfFile) return;
    setShowHighlighting(true);
    setProcessing(true);
    setResponseStarted(true);
    setSections({});
    setStreamDone(false);
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    const sseUrl = import.meta.env.VITE_API_URL + '/api/pdf/calculate';
    const xhr = new XMLHttpRequest();
    xhr.open('POST', sseUrl, true);
    xhr.responseType = 'text';
    xhr.setRequestHeader('Accept', 'text/event-stream');
    let lastIndex = 0;
    xhr.onprogress = function () {
      const newText = xhr.responseText.substring(lastIndex);
      lastIndex = xhr.responseText.length;
      const events = newText.split('\n\n').filter(Boolean);
      events.forEach(eventBlock => {
        const lines = eventBlock.split('\n');
        let dataLine = lines.find(l => l.startsWith('data: '));
        if (dataLine) {
          try {
            const data = JSON.parse(dataLine.replace('data: ', ''));
            if (data.answer_json) {
              setSections(prev => ({ ...prev, ...data.answer_json }));
            }
          } catch {}
        }
        if (eventBlock.startsWith('event: end')) {
          setStreamDone(true);
          setProcessing(false);
        }
      });
    };
    xhr.onloadend = function () {
      setStreamDone(true);
      setProcessing(false);
    };
    xhr.send(formData);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f4f6fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={4} sx={{ width: '90vw', maxWidth: 1200, minHeight: 600, p: 4, borderRadius: 4 }}>
        <Grid container spacing={4} alignItems="stretch" sx={{ height: '100%' }}>
          {!pdfFile ? (
            <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box
                onDrop={handleDrop}
                onDragOver={handleDragOver}
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
                  '&:hover': {
                    boxShadow: 12,
                    borderColor: '#00eaff',
                  },
                  animation: 'gradientBG 6s ease-in-out infinite',
                  background: 'linear-gradient(120deg, #e3eafc 0%, #d1eaff 50%, #e3eafc 100%)',
                  backgroundSize: '200% 200%',
                }}
                onClick={() => {
                  // Add a quick bounce effect
                  const el = document.getElementById('upload-cta');
                  if (el) {
                    el.classList.remove('bounce');
                    void el.offsetWidth; // trigger reflow
                    el.classList.add('bounce');
                  }
                  fileInputRef.current.click();
                }}
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
                    onChange={handleFileChange}
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
            </Grid>
          ) : (
            <>
              <Grid item xs={12} md={7} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box sx={{ width: '100%', height: 520, overflow: 'auto', p: 0, bgcolor: 'transparent', borderRadius: 0, boxShadow: 0, position: 'relative' }}>
                  {/* Show PDF preview only, with a beautiful loading animation if processing */}
                  <VisualsPDF pdfFile={pdfFile} loading={processing} />
                </Box>
                <Button variant="outlined" sx={{ mt: 2 }} onClick={() => { setPdfFile(null); setPdfUrl(null); setShowHighlighting(false); setResponseStarted(false); setSseUrl(null); }}>
                  Remove PDF
                </Button>
              </Grid>
              <Grid item xs={12} md={5} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                {!showHighlighting && !processing && !responseStarted && (
                  <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: '#e3eafc', width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Avatar sx={{ bgcolor: '#1976d2', mr: 1 }}>
                        <InfoOutlinedIcon />
                      </Avatar>
                      <Typography variant="h6" color="primary">
                        How does this work?
                      </Typography>
                    </Box>
                    <Typography variant="body1" color="textSecondary">
                      Upload your RFP PDF. Our AI-powered service will parse the document, extract all relevant construction requirements, and calculate a professional bid estimate for your project. Click 'Calculate' to get started!
                    </Typography>
                  </Paper>
                )}
                {processing && !responseStarted && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
                    <div className="loader" style={{ margin: 32 }} />
                    <Typography variant="subtitle1" color="primary" sx={{ mt: 2 }}>
                      Processing your PDF...
                    </Typography>
                  </Box>
                )}
                {responseStarted && pdfFile && (
                  <Response sections={sections} streamDone={streamDone} />
                )}
                {!processing && !responseStarted && (
                  <Button variant="contained" color="primary" size="large" onClick={handleCalculate} disabled={!pdfFile || showHighlighting || processing}>
                    Calculate
                  </Button>
                )}
              </Grid>
            </>
          )}
        </Grid>
      </Paper>
    </Box>
  );
}

export default App;
