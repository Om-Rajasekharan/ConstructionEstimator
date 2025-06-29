import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Grid, Paper, Avatar, Divider, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CloseIcon from '@mui/icons-material/Close';
import './Dashboard.css';

const Dashboard = ({ user, onProjectSelect }) => {
  const [projects, setProjects] = useState([]);
  const [newProject, setNewProject] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  useEffect(() => {
    async function fetchProjects() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(import.meta.env.VITE_API_URL + '/api/projects', {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects || []);
        } else {
          setError('Failed to load projects.');
        }
      } catch {
        setError('Failed to load projects.');
      }
      setLoading(false);
    }
    if (user && user.token) fetchProjects();
  }, [user]);

  const handleAddProject = async () => {
    if (!newProject.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ name: newProject.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
        setNewProject('');
        setAddDialogOpen(false);
      } else {
        setError('Could not add project.');
      }
    } catch {
      setError('Could not add project.');
    }
    setLoading(false);
  };

  return (
    <Box className="dashboard-bg" sx={{ height: '100vh', overflow: 'hidden', background: 'linear-gradient(120deg, #f5f6fa 0%, #e3e4e8 100%)' }}>
      <Box className="dashboard-container" style={{ paddingTop: 88, maxWidth: '1400px', width: '90vw', height: 'calc(100vh - 88px)', overflowY: 'auto', borderRadius: 24, boxShadow: '0 8px 32px 0 #bfc2c733', background: '#fff', margin: '0 auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, mt: 2 }}>
          <Typography className="dashboard-title" sx={{ flexGrow: 1, fontFamily: 'Inter, Segoe UI, Arial, sans-serif', fontWeight: 800, fontSize: '2.1rem', color: '#232526', letterSpacing: 0.5 }}>
            Welcome, {user.name || 'User'}
          </Typography>
          <Tooltip title="Add Project">
            <IconButton sx={{ bgcolor: '#f5f6fa', border: '1.5px solid #e3e4e8', boxShadow: '0 2px 8px #bfc2c733', color: '#1976d2', '&:hover': { bgcolor: '#e3e4e8', color: '#232526' }, transition: 'all 0.18s' }} onClick={() => setAddDialogOpen(true)}>
              <AddCircleOutlineIcon fontSize="large" />
            </IconButton>
          </Tooltip>
        </Box>
        <Typography className="dashboard-section-title" sx={{ fontWeight: 700, fontSize: '1.2rem', color: '#232526', mb: 2, letterSpacing: 0.2 }}>Your Projects</Typography>
        <Grid container spacing={4} className="dashboard-projects-grid" sx={{ pb: 4 }}>
          {projects.map((proj, idx) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={proj._id || idx}>
              <Paper
                className="dashboard-project-card"
                elevation={3}
                onClick={() => onProjectSelect(proj)}
                sx={{
                  borderRadius: 4,
                  p: 2.5,
                  cursor: 'pointer',
                  background: 'linear-gradient(120deg, #f5f6fa 0%, #e3e4e8 100%)',
                  boxShadow: '0 4px 24px 0 #bfc2c733',
                  transition: 'box-shadow 0.18s, transform 0.18s',
                  '&:hover': { boxShadow: '0 8px 32px 0 #1976d233', transform: 'translateY(-4px) scale(1.03)' },
                  display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 180
                }}
              >
                <Avatar className="dashboard-project-avatar" sx={{ bgcolor: '#1976d2', width: 56, height: 56, mb: 1, boxShadow: '0 2px 8px #1976d233' }}>
                  <FolderOpenIcon fontSize="large" />
                </Avatar>
                <Typography className="dashboard-project-title" sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#232526', mb: 0.5, textAlign: 'center' }}>
                  {proj.name}
                </Typography>
                <Typography className="dashboard-project-desc" sx={{ color: '#888', fontSize: '0.98rem', textAlign: 'center' }}>
                  Click to open
                </Typography>
              </Paper>
            </Grid>
          ))}
          {/* Dotted add project card at end */}
          <Grid item xs={12} sm={6} md={4} lg={3} key="add-project-card">
            <Paper
              className="dashboard-project-card dashboard-add-dotted"
              elevation={0}
              onClick={() => setAddDialogOpen(true)}
              sx={{
                border: '2.5px dashed #bfc2c7',
                background: 'linear-gradient(120deg, #f5f6fa 0%, #e3e4e8 100%)',
                color: '#bfc2c7',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 180,
                borderRadius: 4,
                boxShadow: '0 2px 8px #bfc2c733',
                transition: 'border 0.18s, color 0.18s, background 0.18s, box-shadow 0.18s',
                '&:hover': { border: '2.5px solid #1976d2', color: '#1976d2', background: '#fff', boxShadow: '0 8px 32px 0 #1976d233' },
              }}
            >
              <AddCircleOutlineIcon fontSize="large" />
              <Typography sx={{ mt: 1, fontWeight: 700, fontSize: '1.08rem' }}>Add Project</Typography>
            </Paper>
          </Grid>
        </Grid>
        {/* Add Project Dialog */}
        <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4, p: 1 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: '1.25rem', color: '#232526', pb: 1 }}>
            Add New Project
            <IconButton
              aria-label="close"
              onClick={() => setAddDialogOpen(false)}
              sx={{ position: 'absolute', right: 8, top: 8, color: '#888' }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <TextField
              label="Project Name"
              value={newProject}
              onChange={e => setNewProject(e.target.value)}
              variant="outlined"
              size="medium"
              fullWidth
              autoFocus
              disabled={loading}
              sx={{ mt: 1, mb: 1.5 }}
            />
            {error && <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>}
          </DialogContent>
          <DialogActions sx={{ pb: 2, pr: 2 }}>
            <Button onClick={() => setAddDialogOpen(false)} disabled={loading} sx={{ color: '#888' }}>Cancel</Button>
            <Button onClick={handleAddProject} disabled={loading || !newProject.trim()} variant="contained" sx={{ bgcolor: '#1976d2', fontWeight: 700, borderRadius: 2, px: 3, '&:hover': { bgcolor: '#232526' } }}>Add</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default Dashboard;
