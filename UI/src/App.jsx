import { useState, useRef, useEffect } from 'react';
import { Box, Button, Typography, Paper, Grid, Avatar, AppBar, Toolbar, IconButton, Menu, MenuItem } from '@mui/material';
import 'pdfjs-dist/web/pdf_viewer.css';
import './App.css';
import VisualsPDF from './assets/visuals/VisualsPDF';
import PDFProgressPopup from './assets/components/PDFProgressPopup';
import Response from './assets/components/Response';
import Conversation from './assets/components/conversation.jsx';
import SignInUp from './assets/users/SignInUp';
import AuthSuccess from './AuthSuccess';
import Settings from './assets/users/Settings';
import CompleteProfile from './assets/users/CompleteProfile';
import PDFUploadBox from './assets/components/PDFUploadBox';
import Navigation from './assets/tabs/Navigation';
import Dashboard from './assets/tabs/Dashboard';
import Calculate from './assets/components/Calculate';
import ProjectWorkspacePage from './assets/pages/ProjectWorkspacePage';

async function fetchUser(token) {
  const res = await fetch(import.meta.env.VITE_API_URL + '/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
  });
  if (res.ok) {
    const data = await res.json();
    return data.user;
  }
  return null;
}

function hasValidSections(sections) {
  if (!sections || typeof sections !== 'object') return false;
  if (sections.answer_json && typeof sections.answer_json === 'object' && Object.keys(sections.answer_json).length > 0) {
    return true;
  }
  const keys = Object.keys(sections);
  if (keys.length === 1 && keys[0] === 'error') return false;
  return keys.some(
    key => sections[key] !== undefined && sections[key] !== null && sections[key] !== '' && !(typeof sections[key] === 'object' && Object.keys(sections[key]).length === 0)
  );
}

function App() {
  const [showAIChat, setShowAIChat] = useState(true);

  const getProjectIdForConversation = () => {
    if (projectId) return projectId;
    if (selectedProject && (selectedProject._id || selectedProject.id)) return selectedProject._id || selectedProject.id;
    return null;
  };
  const [user, setUser] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [error, setError] = useState('');
  const [showHighlighting, setShowHighlighting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [responseStarted, setResponseStarted] = useState(false);
  const [sseUrl, setSseUrl] = useState(null);
  const [sections, setSections] = useState({});
  const [streamDone, setStreamDone] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [selectedProject, setSelectedProject] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const fileInputRef = useRef();
  const [projectId, setProjectId] = useState(null);
  const [projectMeta, setProjectMeta] = useState(null);
  const [pdfRemoteUrl, setPdfRemoteUrl] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && (!user || !user.token)) {
      fetchUser(token).then(userInfo => {
        if (userInfo) {
          setUser({ ...userInfo, token });
        } else {
          localStorage.removeItem('token');
          setUser(null);
        }
      });
    }
  }, []);

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

  const fetchProject = async (projId) => {
    setProcessing(true);
    setResponseStarted(true);
    setSections({});
    setStreamDone(false);
    setPdfFile(null);
    setPdfUrl(null);
    setProjectId(projId);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projId}`, {
        headers: { Authorization: `Bearer ${user.token}` },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setProjectMeta(data);
        setPdfRemoteUrl(data.pdfUrl || null);
        if (data.aiUrl) {
          try {
            const aiRes = await fetch(data.aiUrl);
            if (aiRes.ok) {
              const aiJson = await aiRes.json();
              setSections(aiJson);
            } else {
              setSections({ error: 'Failed to load AI response.' });
            }
          } catch (e) {
            setSections({ error: 'Failed to load AI response.' });
          }
        } else {
          setSections({});
        }
        setProcessing(false);
        setStreamDone(true);
      } else {
        setError('Failed to load project.');
        setProcessing(false);
      }
    } catch (e) {
      setError('Failed to load project.');
      setProcessing(false);
    }
  };

  const handleCalculate = async (model, temperature, customPrompt) => {
    if (!pdfFile) return;
    setShowHighlighting(true);
    setProcessing(true);
    setResponseStarted(true);
    setSections({});
    setStreamDone(false);
    if (!projectId && !selectedProject) {
      setProjectId(null);
      setProjectMeta(null);
      setPdfRemoteUrl(null);
    }
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    formData.append('model', model);
    formData.append('temperature', temperature);
    formData.append('customPrompt', customPrompt);
    if (projectId) {
      formData.append('projectId', projectId);
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pdf/calculate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` },
        credentials: 'include',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setProjectId(data.projectId);
        const pollForAI = async (retries = 30, delay = 2000) => {
          for (let i = 0; i < retries; i++) {
            const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${data.projectId}`, {
              headers: { Authorization: `Bearer ${user.token}` },
              credentials: 'include',
            });
            if (resp.ok) {
              const projData = await resp.json();
              if (projData.aiUrl) {
                setProjectMeta(projData);
                setPdfRemoteUrl(projData.pdfUrl || null);
                try {
                  const aiRes = await fetch(projData.aiUrl);
                  if (aiRes.ok) {
                    const aiJson = await aiRes.json();
                    setSections(aiJson);
                    setProcessing(false);
                    setStreamDone(true);
                    return;
                  }
                } catch {}
              }
            }
            await new Promise(r => setTimeout(r, delay));
          }
          setError('AI response not available after processing. Please try again.');
          setProcessing(false);
        };
        pollForAI();
      } else {
        setError('Failed to process PDF.');
        setProcessing(false);
      }
    } catch (e) {
      setError('Failed to process PDF.');
      setProcessing(false);
    }
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  const handleSettings = () => {
    setShowSettings(true);
    handleMenuClose();
  };
  const handleLogout = () => {
    localStorage.removeItem('token');
    setShowSettings(false);
    setUser(null);
    handleMenuClose();
  };

  const pdfScrollHideStyle = `
    .pdf-scroll-hide {
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    .pdf-scroll-hide::-webkit-scrollbar {
      display: none;
    }
  `;

  if (window.location.pathname === '/auth-success') return <AuthSuccess onAuth={setUser} />;
  if (!user) return <SignInUp onAuth={setUser} />;
  if (user && (!user.name || !user.company)) return <CompleteProfile token={user.token} onComplete={setUser} />;
  if (showSettings) return <Settings user={user} onLogout={handleLogout} />;

  let mainContent;
  if (currentTab === 'dashboard') {
    mainContent = (
      <Dashboard user={user} onProjectSelect={proj => {
        setSelectedProject(proj);
        setCurrentTab('workspace');
      }} />
    );
  } else if (currentTab === 'workspace' && selectedProject) {
    mainContent = (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f4f6fa', display: 'flex', flexDirection: 'column' }}>
        <ProjectWorkspacePage project={selectedProject} />
      </Box>
    );
  } else if (currentTab === 'pdf' && (selectedProject || pdfFile)) {
    mainContent = (
      <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: '#f4f6fa', display: 'flex', flexDirection: 'row', alignItems: 'stretch', justifyContent: 'center' }}>
        <style>{pdfScrollHideStyle}</style>
        <Paper elevation={4} sx={{ width: '90vw', maxWidth: 1200, minHeight: 600, p: 0, borderRadius: 4, position: 'relative', display: 'flex', flexDirection: 'row', height: '80vh', overflow: 'hidden' }}>
          <Box sx={{ flex: 1.2, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', bgcolor: 'transparent', p: 0, position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 30 }}>
              {showAIChat && (
                <Box sx={{
                  position: 'absolute',
                  top: 32,
                  left: 32,
                  zIndex: 40,
                  width: 400,
                  maxWidth: '90vw',
                  bgcolor: '#fff',
                  color: '#222',
                  borderRadius: 3,
                  boxShadow: 6,
                  p: 0,
                  border: '2px solid #1976d2',
                  minHeight: 200,
                  maxHeight: '80vh',
                  overflow: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  pointerEvents: 'auto',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, borderBottom: '1px solid #eee', bgcolor: '#1976d2', color: '#fff', borderTopLeftRadius: 10, borderTopRightRadius: 10 }}>
                    <span style={{ fontWeight: 600 }}>AI Chat</span>
                    <Button size="small" variant="contained" color="error" sx={{ minWidth: 32, minHeight: 32, borderRadius: '50%' }} onClick={() => setShowAIChat(false)}>X</Button>
                  </Box>
                  <Box sx={{ p: 2, flex: 1, overflow: 'auto' }}>
                    <Conversation
                      aiResponsePath={
                        sections && sections._gcsPath
                          ? sections._gcsPath
                          : (projectMeta && projectMeta.gcsAiUrl
                              ? projectMeta.gcsAiUrl.replace(/^gs:\/\//, '')
                              : null)
                      }
                      projectId={getProjectIdForConversation()}
                    />
                  </Box>
                </Box>
              )}
              {!showAIChat && (
                <Button size="small" variant="contained" sx={{ position: 'absolute', top: 32, left: 32, zIndex: 40, bgcolor: '#1976d2', color: '#fff', borderRadius: 2, pointerEvents: 'auto' }} onClick={() => setShowAIChat(true)}>
                  Open AI Chat
                </Button>
              )}
            </Box>
            <Box sx={{ width: '100%', height: '100%', overflow: 'auto', p: 0, bgcolor: 'transparent', borderRadius: 0, boxShadow: 0, position: 'relative' }}>
              {(pdfFile || pdfRemoteUrl) ? (
                <VisualsPDF pdfFile={pdfFile} pdfUrl={pdfRemoteUrl} loading={processing} />
              ) : (
                <PDFUploadBox
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  fileInputRef={fileInputRef}
                  onFileChange={handleFileChange}
                  error={error}
                />
              )}
            </Box>
            {(pdfFile || pdfRemoteUrl) && (
              <Button variant="outlined" sx={{ mt: 2 }} onClick={() => {
                setPdfFile(null); setPdfUrl(null); setShowHighlighting(false); setResponseStarted(false); setSseUrl(null); setProjectId(null); setProjectMeta(null); setPdfRemoteUrl(null);
              }}>
                Remove PDF
              </Button>
            )}
          </Box>
          <Box sx={{ flex: 1, minWidth: 320, maxWidth: 540, height: '100%', bgcolor: '#222', color: '#fff', borderLeft: '2px solid #1976d2', boxShadow: '-2px 0 16px 0 #1976d244', p: 0, position: 'relative', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
            <Box sx={{ width: '100%', height: '100%', p: 3 }}>
              <Calculate
                pdfFile={pdfFile}
                showHighlighting={showHighlighting}
                processing={processing}
                responseStarted={responseStarted}
                handleCalculate={handleCalculate}
                isExistingProject={!!projectId}
                projectMeta={projectMeta}
              />
              {hasValidSections(sections) && (
                <Response
                  initialSections={sections.answer_json ? sections.answer_json : sections}
                  streamDone={streamDone}
                  projectMeta={projectMeta}
                  projectId={projectId}
                />
              )}
            </Box>
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f4f6fa', display: 'flex' }}>
      <Navigation
        currentTab={currentTab}
        onTabChange={tab => {
          setCurrentTab(tab);
          if (tab === 'dashboard') setSelectedProject(null);
        }}
        navOpen={navOpen}
        onNavStateChange={setNavOpen}
      />
      <Box className={`app-main-content${navOpen ? ' nav-open' : ''}`}> 
        <AppBar
          position="fixed"
          elevation={2}
          color="default"
          sx={{
            width: '100vw',
            left: 0,
            top: 0,
            bgcolor: 'linear-gradient(120deg, #232526 0%, #232526 100%)',
            color: '#fff',
            boxShadow: '0 2px 16px 0 #23252633',
            borderBottom: '2px solid #232526',
            zIndex: 1301,
          }}
        >
          <Toolbar sx={{ minHeight: 64, px: 3, display: 'flex', alignItems: 'center', bgcolor: 'transparent' }}>
            <Navigation appBarMode navOpen={navOpen} onNavStateChange={setNavOpen} />
            <Box sx={{ flexGrow: 1 }} />
            {user && (
              <IconButton color="inherit" onClick={handleMenuOpen} sx={{ ml: 2 }}>
                <Avatar sx={{ bgcolor: '#fff', color: '#232526', fontWeight: 700 }}>
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </Avatar>
              </IconButton>
            )}
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
              <MenuItem onClick={handleSettings}>Settings</MenuItem>
              <MenuItem onClick={handleLogout}>Log Out</MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
        <Toolbar sx={{ minHeight: 64, bgcolor: 'transparent' }} />
        {mainContent}
      </Box>
    </Box>
  );
}

export default App;
