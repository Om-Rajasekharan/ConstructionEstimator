import React, { useState, useEffect } from 'react';
import Conversation from './conversation.jsx';
import { Paper, Typography, Box, Button, TextField, Divider } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';

function Response({ projectId, initialSections = {}, streamDone }) {
  if (!projectId) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', color: 'red' }}>
        Error: No projectId provided to Response component. Please supply a valid projectId prop.
      </Paper>
    );
  }

  const API_BASE = import.meta.env.VITE_API_URL || '';
  const [sections, setSections] = useState(initialSections);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedSections, setEditedSections] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function fetchSections() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/postresponse/${projectId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!res.ok) throw new Error('Failed to load project data');
        const data = await res.json();
        if (!ignore) {
          const answer = data.answer_json && typeof data.answer_json === 'object' ? data.answer_json : {};
          setSections(answer);
          setEditedSections(answer);
        }
      } catch (e) {
        if (!ignore) setError(e.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    fetchSections();
    return () => { ignore = true; };
  }, [projectId]);

  const handleFieldChange = (section, key, value) => {
    setEditedSections(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const handleArrayChange = (section, idx, key, value) => {
    setEditedSections(prev => ({
      ...prev,
      [section]: prev[section].map((item, i) =>
        i === idx ? { ...item, [key]: value } : item
      )
    }));
  };

  const handleSimpleChange = (section, value) => {
    setEditedSections(prev => ({
      ...prev,
      [section]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/postresponse/${projectId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answer_json: editedSections }),
      });
      if (!res.ok) throw new Error('Failed to save changes');
      setSaveSuccess(true);
      setSections(editedSections);
      setEditMode(false);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  if (loading) return <Paper sx={{ p: 4, textAlign: 'center' }}>Loading...</Paper>;
  if (error) return <Paper sx={{ p: 4, textAlign: 'center', color: 'red' }}>Error: {error}</Paper>;

  function renderSectionCard(key, value) {
    if (value == null || (Array.isArray(value) && value.length === 0) || (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0)) {
      return null;
    }
    const sectionTitle = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return (
      <Paper key={key} elevation={2} sx={{ mb: 3, p: 2.5, width: '100%', bgcolor: '#23263a', borderRadius: 3, boxShadow: '0 2px 8px #0002' }}>
        <Typography variant="h6" sx={{ color: '#7a8cff', fontWeight: 700, mb: 1 }}>{sectionTitle}</Typography>
        <Divider sx={{ mb: 2, borderColor: '#1976d2', opacity: 0.3 }} />
        {renderEditableSection(key, value)}
      </Paper>
    );
  }

  function renderPrettyValue(val, depth = 0) {
    if (val == null) return <i style={{ color: '#b3c6e0' }}>(None)</i>;
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
      return <span style={{ color: '#e0e6ff' }}>{String(val)}</span>;
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return <i style={{ color: '#b3c6e0' }}>(Empty)</i>;
      return (
        <Box sx={{ pl: depth * 2 }}>
          {val.map((item, idx) => (
            <Box key={idx} sx={{ mb: 1 }}>
              {renderPrettyValue(item, depth + 1)}
            </Box>
          ))}
        </Box>
      );
    }
    if (typeof val === 'object') {
      return (
        <Box sx={{ pl: depth * 2 }}>
          {Object.entries(val).map(([k, v]) => (
            <Box key={k} sx={{ mb: 0.5 }}>
              <b style={{ color: '#7a8cff' }}>{k.replace(/_/g, ' ')}:</b> {renderPrettyValue(v, depth + 1)}
            </Box>
          ))}
        </Box>
      );
    }
    return <span>{String(val)}</span>;
  }

  function renderEditableValue(val, path, parentType = null, keyLabel = null) {
    if (typeof val === 'string' || typeof val === 'number') {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {keyLabel && <b style={{ color: '#7a8cff', minWidth: 160 }}>{keyLabel}:</b>}
          <TextField
            fullWidth
            multiline
            minRows={2}
            value={getValueByPath(editedSections, path) ?? ''}
            onChange={e => setValueByPath(path, e.target.value)}
            sx={{ bgcolor: '#181a2a', color: '#fff', borderRadius: 1, '& .MuiInputBase-root': { color: '#fff' } }}
          />
        </Box>
      );
    }
    if (Array.isArray(val)) {
      return (
        <Box sx={{ pl: 1 }}>
          {val.map((item, idx) => (
            <Box key={idx} sx={{ mb: 1, p: 1, bgcolor: '#23263a', borderRadius: 1, border: '1px solid #333' }}>
              {renderEditableValue(item, [...path, idx], Array.isArray(item) ? 'array' : typeof item)}
            </Box>
          ))}
          <Button
            variant="outlined"
            size="small"
            sx={{ mt: 1, color: '#7a8cff', borderColor: '#7a8cff' }}
            onClick={() => {
              setEditedSections(prev => setValueByPath([...path], [...(getValueByPath(prev, path) || []), typeof val[0] === 'object' && val[0] !== null ? {} : ''], true));
            }}
          >
            + Add Item
          </Button>
        </Box>
      );
    }
    if (typeof val === 'object' && val !== null) {
      return (
        <Box sx={{ pl: 1 }}>
          {Object.entries(val).map(([k, v]) => (
            <Box key={k} sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  label={k.replace(/_/g, ' ')}
                  value={getValueByPath(editedSections, [...path, k]) ?? (typeof v === 'object' ? '' : v)}
                  onChange={e => setValueByPath([...path, k], e.target.value)}
                  sx={{ m: 0.5, bgcolor: '#181a2a', color: '#fff', borderRadius: 1, '& .MuiInputBase-root': { color: '#fff' } }}
                  size="small"
                />
                {(typeof v === 'object' && v !== null) ? (
                  <Box sx={{ ml: 2, mt: 1, width: '100%' }}>{renderEditableValue(v, [...path, k], Array.isArray(v) ? 'array' : typeof v, null)}</Box>
                ) : null}
              </Box>
            </Box>
          ))}
          <Button
            variant="outlined"
            size="small"
            sx={{ mt: 1, color: '#7a8cff', borderColor: '#7a8cff' }}
            onClick={() => {
              const newField = prompt('Enter new field name:');
              if (newField && !Object.keys(val).includes(newField)) {
                setEditedSections(prev => setValueByPath([...path, newField], '', true));
              }
            }}
          >
            + Add Field
          </Button>
        </Box>
      );
    }
    return <Typography color="#b3c6e0">(No data)</Typography>;
  }

  function getValueByPath(obj, path) {
    return path.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : ''), obj);
  }
  function setValueByPath(path, value, returnNew = false) {
    setEditedSections(prev => {
      const newObj = JSON.parse(JSON.stringify(prev));
      let cur = newObj;
      for (let i = 0; i < path.length - 1; i++) {
        if (cur[path[i]] === undefined) cur[path[i]] = typeof path[i + 1] === 'number' ? [] : {};
        cur = cur[path[i]];
      }
      cur[path[path.length - 1]] = value;
      return returnNew ? newObj : newObj;
    });
    if (returnNew) {
      const newObj = JSON.parse(JSON.stringify(editedSections));
      let cur = newObj;
      for (let i = 0; i < path.length - 1; i++) {
        if (cur[path[i]] === undefined) cur[path[i]] = typeof path[i + 1] === 'number' ? [] : {};
        cur = cur[path[i]];
      }
      cur[path[path.length - 1]] = value;
      return newObj;
    }
  }

  function renderEditableSection(key, value) {
    if (!editMode) {
      return renderPrettyValue(value);
    }
    return renderEditableValue(value, [key]);
  }



  return (
    <Box sx={{
      width: '100%',
      minWidth: 0,
      maxWidth: '100%',
      height: '100%',
      bgcolor: 'transparent',
      color: '#fff',
      p: 0,
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 14,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      overflowY: 'auto',
      overflowX: 'hidden',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      '&::-webkit-scrollbar': { display: 'none' },
      boxSizing: 'border-box',
    }}>
      <Box sx={{ mb: 2, width: '100%', display: 'flex', gap: 1 }}>
        <Button
          variant={editMode ? 'contained' : 'outlined'}
          color="primary"
          size="small"
          startIcon={editMode ? <SaveIcon /> : <EditIcon />}
          onClick={() => {
            if (editMode) handleSave();
            else setEditMode(true);
          }}
          disabled={saving}
        >
          {editMode ? (saving ? 'Saving...' : 'Save Changes') : 'Edit'}
        </Button>
        {saveSuccess && <Typography sx={{ color: 'lightgreen', fontSize: 13, mt: 1 }}>Saved!</Typography>}
        {saveError && <Typography sx={{ color: 'red', fontSize: 13, mt: 1 }}>{saveError}</Typography>}
        {editMode && !saving && (
          <Button size="small" color="secondary" variant="outlined" sx={{ ml: 1 }} onClick={() => { setEditMode(false); setEditedSections(sections); }}>Cancel</Button>
        )}
      </Box>
      {sections && Object.keys(sections).length > 0 ? (
        Object.entries(sections).map(([key, value]) => renderSectionCard(key, value))
      ) : (
        <Typography color="#b3c6e0">No data loaded.</Typography>
      )}
      {/* Conversation component removed: now handled as floating panel in App.jsx */}

    </Box>
  );
}

export default Response;
