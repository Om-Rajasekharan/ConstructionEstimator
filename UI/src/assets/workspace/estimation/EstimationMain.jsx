// EstimationMain.jsx
// This component provides a tabbed interface with an interactive estimation table.

import React, { useEffect, useState } from 'react';
import { Tabs, Tab, Box, Button, TextField, Paper } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';

function EstimationMain({ projectId }) {
  const [tab, setTab] = useState(0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newItem, setNewItem] = useState({ description: '', quantity: '', unit: '', cost: '' });

  useEffect(() => {
    async function fetchTable() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const API_BASE = import.meta.env.VITE_API_URL || '';
        const url = `${API_BASE}/api/estimation/${projectId}`;
        console.log('[EstimationMain] Fetching estimation table:', url);
        const res = await fetch(url, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        console.log('[EstimationMain] Response status:', res.status, 'Content-Type:', res.headers.get('content-type'));
        const contentType = res.headers.get('content-type');
        if (!res.ok) {
          let errMsg = `Failed to fetch estimation table (${res.status})`;
          if (contentType && contentType.includes('application/json')) {
            const errJson = await res.json();
            console.log('[EstimationMain] Error JSON:', errJson);
            errMsg = errJson.error || errMsg;
          } else {
            const text = await res.text();
            console.log('[EstimationMain] Error response text:', text);
          }
          throw new Error(errMsg);
        }
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          console.log('[EstimationMain] Table data:', data);
          setRows(data.items || []);
        } else {
          const text = await res.text();
          console.log('[EstimationMain] Non-JSON response:', text);
          throw new Error('Server returned non-JSON response');
        }
      } catch (err) {
        console.error('[EstimationMain] Fetch error:', err);
        setError(err.message);
      }
      setLoading(false);
    }
    if (projectId) fetchTable();
  }, [projectId]);

  const handleTabChange = (e, newValue) => setTab(newValue);

  const handleAdd = async () => {
    const updatedRows = [...rows, { ...newItem, id: Date.now().toString() }];
    setRows(updatedRows);
    setNewItem({ description: '', quantity: '', unit: '', cost: '' });
    await saveTable(updatedRows);
  };

  const handleDelete = async (id) => {
    const updatedRows = rows.filter(row => row.id !== id);
    setRows(updatedRows);
    await saveTable(updatedRows);
  };

  const handleEditCell = async (params) => {
    const updatedRows = rows.map(row => row.id === params.id ? { ...row, [params.field]: params.value } : row);
    setRows(updatedRows);
    await saveTable(updatedRows);
  };

  async function saveTable(updatedRows) {
    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_URL || '';
      const url = `${API_BASE}/api/estimation/${projectId}`;
      console.log('[EstimationMain] Saving estimation table:', updatedRows);
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ items: updatedRows })
      });
      console.log('[EstimationMain] Save response status:', res.status, 'Content-Type:', res.headers.get('content-type'));
      const contentType = res.headers.get('content-type');
      if (!res.ok) {
        let errMsg = 'Failed to save changes';
        if (contentType && contentType.includes('application/json')) {
          const errJson = await res.json();
          console.log('[EstimationMain] Save error JSON:', errJson);
          errMsg = errJson.error || errMsg;
        } else {
          const text = await res.text();
          console.log('[EstimationMain] Save error response text:', text);
        }
        throw new Error(errMsg);
      }
    } catch (err) {
      console.error('[EstimationMain] Save error:', err);
      setError(err.message || 'Failed to save changes');
    }
  }

  const columns = [
    { field: 'description', headerName: 'Description', flex: 2, editable: true },
    { field: 'quantity', headerName: 'Quantity', flex: 1, editable: true },
    { field: 'unit', headerName: 'Unit', flex: 1, editable: true },
    { field: 'cost', headerName: 'Cost', flex: 1, editable: true },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1,
      renderCell: (params) => (
        <Button color="error" onClick={() => handleDelete(params.id)}>Delete</Button>
      ),
      sortable: false,
      filterable: false,
    },
  ];

  return (
    <Box sx={{ width: '100%' }}>
      <Tabs value={tab} onChange={handleTabChange}>
        <Tab label="Estimation Table" />
        <Tab label="Other" />
      </Tabs>
      {tab === 0 && (
        <Box sx={{ mt: 2 }}>
          <Paper sx={{ p: 2 }}>
            {error && <div style={{ color: 'red' }}>{error}</div>}
            <DataGrid
              rows={rows}
              columns={columns}
              autoHeight
              loading={loading}
              disableSelectionOnClick
              processRowUpdate={handleEditCell}
              experimentalFeatures={{ newEditingApi: true }}
            />
            {/* Total Cost Calculation */}
            <Box sx={{ mt: 2, mb: 2, fontWeight: 'bold', fontSize: 18 }}>
              Total Cost: $
              {rows.reduce((sum, row) => {
                let val = row.cost;
                if (val === undefined || val === null) val = 0;
                if (typeof val === 'string') val = val.replace(/[^\d.\-]/g, '');
                const num = parseFloat(val);
                return !isNaN(num) ? sum + num : sum;
              }, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <TextField
                label="Description"
                value={newItem.description}
                onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                size="small"
              />
              <TextField
                label="Quantity"
                value={newItem.quantity}
                onChange={e => setNewItem({ ...newItem, quantity: e.target.value })}
                size="small"
              />
              <TextField
                label="Unit"
                value={newItem.unit}
                onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
                size="small"
              />
              <TextField
                label="Cost"
                value={newItem.cost}
                onChange={e => setNewItem({ ...newItem, cost: e.target.value })}
                size="small"
              />
              <Button variant="contained" onClick={handleAdd}>Add Item</Button>
            </Box>
          </Paper>
        </Box>
      )}
      {tab === 1 && (
        <Box sx={{ mt: 2 }}>
          {/* Placeholder for other estimation features */}
          <Paper sx={{ p: 2 }}>Other estimation features coming soon.</Paper>
        </Box>
      )}
    </Box>
  );
}

export default EstimationMain;
