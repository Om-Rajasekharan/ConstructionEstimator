import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, Typography, Box, Paper } from '@mui/material';

const SECTION_ORDER = [
  'metadata',
  'materials',
  'labor',
  'equipment',
  'permits_and_licenses',
  'insurance_and_bonds',
  'subcontractors_and_vendors',
  'timeline_and_scheduling',
  'site_conditions_and_preparation',
  'safety_and_compliance',
  'overhead_and_profit',
  'contingencies_and_allowances',
  'quality_control_and_testing',
  'closeout_and_warranty',
];

function Response({ sections, streamDone }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const cardRefs = useRef([]);
  const costSectionRef = useRef();

  useEffect(() => {
    const container = document.getElementById('vertical-scroll-container');
    if (!container) return;
    const handleScroll = () => {
      const containerRect = container.getBoundingClientRect();
      let minDiff = Infinity;
      let focusedIdx = 0;
      cardRefs.current.forEach((ref, idx) => {
        if (!ref) return;
        const rect = ref.getBoundingClientRect();
        let diff;
        if (idx === 0) {
          diff = Math.abs(rect.top - containerRect.top);
        } else if (idx === cardRefs.current.length - 1) {
          diff = Math.abs(rect.bottom - containerRect.bottom);
        } else {
          const cardCenter = rect.top + rect.height / 2;
          const containerCenter = containerRect.top + containerRect.height / 2;
          diff = Math.abs(cardCenter - containerCenter);
        }
        if (diff < minDiff) {
          minDiff = diff;
          focusedIdx = idx;
        }
      });
      setCurrentIdx(focusedIdx);
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => container.removeEventListener('scroll', handleScroll);
  }, [sections]);

  const scrollToCard = idx => {
    const card = cardRefs.current[idx];
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  function renderSectionBlock(key, value, idx) {
    const isActive = idx === currentIdx;
    const renderObjectList = (arr, labelMap) => (
      <Box sx={{ width: '100%', overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 17, lineHeight: 1.7, wordBreak: 'break-word', overflowWrap: 'break-word', maxWidth: '100%' }}>
          {arr.map((item, i) =>
            typeof item === 'object' && item !== null ? (
              <li key={i} style={{ marginBottom: 4 }}>
                {Object.entries(item).map(([k, v], j) => (
                  <span key={j} style={{ display: 'inline-block', marginRight: 8, maxWidth: 220, verticalAlign: 'top', whiteSpace: 'pre-line', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                    <strong>{labelMap?.[k] || k.replace(/_/g, ' ')}:</strong> {String(v)}
                  </span>
                ))}
              </li>
            ) : (
              <li key={i} style={{ marginBottom: 4 }}>{String(item)}</li>
            )
          )}
        </ul>
      </Box>
    );
    return (
      <Card
        key={key}
        ref={el => (cardRefs.current[idx] = el)}
        data-idx={idx}
        onClick={() => scrollToCard(idx)}
        sx={{
          cursor: 'pointer',
          minHeight: 180,
          maxHeight: isActive ? 1200 : 320,
          height: isActive ? 'auto' : 180,
          width: '100%',
          my: 2,
          mx: 'auto',
          transition: 'all 0.35s cubic-bezier(.4,2,.6,1)',
          transform: isActive ? 'scale(1.06) translateY(-6px)' : 'scale(0.96)',
          boxShadow: isActive ? '0 8px 32px 0 rgba(25, 118, 210, 0.18), 0 1.5px 6px 0 rgba(0,0,0,0.08)' : '0 1.5px 6px 0 rgba(0,0,0,0.06)',
          opacity: isActive ? 1 : 0.7,
          zIndex: isActive ? 2 : 1,
          border: isActive ? '2.5px solid #1976d2' : '1px solid #e3eafc',
          background: isActive ? 'linear-gradient(120deg, #fafdff 60%, #e3eafc 100%)' : 'linear-gradient(120deg, #f5f7fa 60%, #e3eafc 100%)',
          overflow: 'auto',
          display: 'block',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          scrollSnapAlign: 'center',
          backdropFilter: isActive ? 'blur(0.5px)' : 'none',
          wordBreak: 'break-word',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <CardContent sx={{ width: '100%', p: isActive ? 2 : 1, overflow: 'auto', maxHeight: isActive ? 1100 : 220, display: 'block', wordBreak: 'break-word', scrollbarWidth: 'none', msOverflowStyle: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
          <Typography variant={isActive ? 'h5' : 'subtitle1'} color="primary" gutterBottom sx={{ minHeight: 28, letterSpacing: 1, fontWeight: 700, wordBreak: 'break-word', whiteSpace: 'pre-line', overflowWrap: 'break-word', fontSize: isActive ? 18 : 15 }}>
            {key === 'metadata'
              ? 'Project Info'
              : key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Typography>
          {isActive ? (
            key === 'metadata' ? (
              <Box sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#222', whiteSpace: 'pre-wrap', lineHeight: 1.6, wordBreak: 'break-word', overflowWrap: 'break-word', width: '100%' }}>
                {Object.entries(value || {}).map(([k, v]) => {
                  if (Array.isArray(v)) {
                    return (
                      <div key={k} style={{ marginBottom: 8 }}>
                        <strong style={{ color: '#1976d2' }}>{k.replace(/_/g, ' ')}:</strong>
                        <Box sx={{ pl: 2 }}>
                          {v.length === 0 ? (
                            <span style={{ color: '#888' }}>None</span>
                          ) : (
                            v.map((item, idx) =>
                              typeof item === 'object' && item !== null ? (
                                <div key={idx} style={{ marginBottom: 2 }}>
                                  {Object.entries(item).map(([ik, iv], j) => (
                                    <span key={j} style={{ display: 'inline-block', marginRight: 12 }}>
                                      <span style={{ color: '#1976d2', fontWeight: 500 }}>{ik.replace(/_/g, ' ')}:</span> {iv}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div key={idx}>{item}</div>
                              )
                            )
                          )}
                        </Box>
                      </div>
                    );
                  } else if (typeof v === 'object' && v !== null) {
                    return (
                      <div key={k} style={{ marginBottom: 8 }}>
                        <strong style={{ color: '#1976d2' }}>{k.replace(/_/g, ' ')}:</strong>
                        <Box sx={{ pl: 2 }}>
                          {Object.entries(v).map(([ik, iv], j) => (
                            <div key={j}>
                              <span style={{ color: '#1976d2', fontWeight: 500 }}>{ik.replace(/_/g, ' ')}:</span> {iv}
                            </div>
                          ))}
                        </Box>
                      </div>
                    );
                  } else {
                    return (
                      <div key={k}>
                        <span style={{ color: '#1976d2', fontWeight: 500 }}>{k.replace(/_/g, ' ')}:</span> {v}
                      </div>
                    );
                  }
                })}
              </Box>
            ) : (key === 'materials' || key === 'labor' || key === 'equipment') && Array.isArray(value) && value.length > 0 ? (
              renderObjectList(value, key === 'materials' ? {material: 'Material', estimated_amount: 'Amount', units: 'Units'} : key === 'labor' ? {labor_type: 'Labor Type', manhours: 'Manhours', certifications: 'Certifications'} : {equipment: 'Equipment', quantity: 'Quantity', usage: 'Usage'})
            ) : Array.isArray(value) && value.length > 0 ? (
              <Box sx={{ width: '100%', overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.6, wordBreak: 'break-word', overflowWrap: 'break-word', maxWidth: '100%' }}>
                  {value.map((item, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>{typeof item === 'object' ? JSON.stringify(item) : String(item)}</li>
                  ))}
                </ul>
              </Box>
            ) : typeof value === 'string' && value ? (
              <Typography variant="body2" sx={{ color: '#333', fontWeight: 500, wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-line', width: '100%', fontSize: 13 }}>{value}</Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">No data.</Typography>
            )
          ) : (
            <Box sx={{ width: '100%', height: 24, bgcolor: '#e0e0e0', borderRadius: 1 }} />
          )}
        </CardContent>
      </Card>
    );
  }

  function renderSectionCosts() {
    if (!sections.section_costs && !sections.total_bid) return null;
    const costs = sections.section_costs || {};
    return (
      <Box sx={{
        width: '100%',
        bgcolor: '#e3eafc',
        borderRadius: 2,
        p: 2,
        mb: 2,
        boxShadow: '0 2px 8px 0 #1976d211',
        border: '1.5px solid #d1eaff',
        fontFamily: 'JetBrains Mono, monospace',
      }}>
        <Typography variant="h6" color="primary" sx={{ mb: 1, fontWeight: 700, letterSpacing: 1 }}>
          Section Cost Estimates
        </Typography>
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, fontSize: 15 }}>
          {Object.entries(costs).map(([section, cost]) => (
            <li key={section} style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#1976d2', fontWeight: 600 }}>{section.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
              <span style={{ color: '#222', fontWeight: 500 }}>${Number(cost).toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
            </li>
          ))}
        </Box>
        {sections.total_bid !== undefined && (
          <Box sx={{ mt: 2, pt: 1, borderTop: '1.5px solid #1976d2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#1976d2', fontWeight: 700, fontSize: 18 }}>Total Bid</span>
            <span style={{ color: '#1976d2', fontWeight: 700, fontSize: 18 }}>${Number(sections.total_bid).toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Paper elevation={0} sx={{
      bgcolor: '#f4f6fa',
      p: 2,
      height: '80vh',
      position: 'fixed',
      top: '10vh',
      right: 48,
      width: 520,
      maxWidth: '95vw',
      zIndex: 1000,
      boxShadow: '0 8px 32px 0 rgba(25, 118, 210, 0.10), 0 1.5px 6px 0 rgba(0,0,0,0.08)',
      borderRadius: 4,
      border: '1.5px solid #e3eafc',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      pointerEvents: 'auto',
      left: 'unset',
    }}>
      <Box
        id="vertical-scroll-container"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          maxHeight: '70vh',
          minHeight: 400,
          alignItems: 'center',
          scrollSnapType: 'y mandatory',
          py: 2,
          px: 1,
          width: '100%',
          maxWidth: 500,
          margin: '0 auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {SECTION_ORDER.map((key, idx) =>
          sections[key] !== undefined ? renderSectionBlock(key, sections[key], idx) : null
        )}
        {(sections.section_costs || sections.total_bid) && (
          <Card
            ref={costSectionRef}
            sx={{
              width: '100%',
              my: 2,
              scrollSnapAlign: 'center',
              boxShadow: '0 8px 32px 0 rgba(25, 118, 210, 0.10), 0 1.5px 6px 0 rgba(0,0,0,0.08)',
              border: '2.5px solid #1976d2',
              background: 'linear-gradient(120deg, #fafdff 60%, #e3eafc 100%)',
              fontFamily: 'JetBrains Mono, monospace',
              minHeight: 180,
              maxHeight: 420,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
            }}
          >
            <CardContent sx={{
              width: '100%',
              p: 2,
              overflowY: 'auto',
              maxHeight: 360,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              wordBreak: 'break-word',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
            }}>
              <Box sx={{
                width: '92%',
                maxWidth: 370,
                bgcolor: '#e3eafc',
                borderRadius: 2,
                p: 2,
                mb: 2,
                boxShadow: '0 2px 8px 0 #1976d211',
                border: '1.5px solid #d1eaff',
                fontFamily: 'JetBrains Mono, monospace',
              }}>
                <Typography variant="h6" color="primary" sx={{ mb: 1, fontWeight: 700, letterSpacing: 1 }}>
                  Section Cost Estimates
                </Typography>
                <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, fontSize: 15 }}>
                  {Object.entries(sections.section_costs || {}).map(([section, cost]) => (
                    <li key={section} style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#1976d2', fontWeight: 600 }}>{section.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                      <span style={{ color: '#222', fontWeight: 500 }}>${Number(cost).toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                    </li>
                  ))}
                </Box>
                {sections.total_bid !== undefined && (
                  <Box sx={{ mt: 2, pt: 1, borderTop: '1.5px solid #1976d2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#1976d2', fontWeight: 700, fontSize: 18 }}>Total Bid</span>
                    <span style={{ color: '#1976d2', fontWeight: 700, fontSize: 18 }}>${Number(sections.total_bid).toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>
      <Box sx={{ textAlign: 'center', mt: 2, width: '100%' }}>
        {!streamDone && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 1 }}>
            <Box sx={{ position: 'relative', width: 44, height: 44, mb: 1 }}>
              <Box
                sx={{
                  position: 'absolute',
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  border: '3.5px solid #e3eafc',
                  borderTop: '3.5px solid #1976d2',
                  animation: 'mui-spin 1.1s linear infinite',
                  boxShadow: '0 0 8px #1976d233',
                  zIndex: 2,
                  '@keyframes mui-spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                  },
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  top: 0,
                  left: 0,
                  background: 'radial-gradient(circle at 50% 50%, #1976d211 0%, transparent 80%)',
                  zIndex: 1,
                }}
              />
            </Box>
            <Typography variant="subtitle1" sx={{ color: '#1976d2', fontWeight: 700, letterSpacing: 1, mb: 0.5 }}>
              Processing PDF...
            </Typography>
            <Typography variant="body2" sx={{ color: '#888', fontWeight: 500, letterSpacing: 0.5 }}>
              Please wait while we extract and analyze all bid sections.
            </Typography>
          </Box>
        )}
        <Typography variant="caption" color="text.secondary">
          Scroll to review all sections.
        </Typography>
      </Box>
    </Paper>
  );
}

export default Response;
