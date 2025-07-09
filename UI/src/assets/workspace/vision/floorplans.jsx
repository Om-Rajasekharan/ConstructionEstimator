import React, { useState } from 'react';

async function segmentFloorplan(imageFile) {
  const formData = new FormData();
  formData.append('file', imageFile);
  const res = await fetch('/api/vision/segment-floorplan', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to segment floorplan');
  return await res.json();
}

export default function FloorplanSegmenter() {
  const [image, setImage] = useState(null);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = e => {
    setImage(e.target.files[0]);
    setAreas([]);
    setError('');
  };

  const handleSegment = async () => {
    if (!image) return;
    setLoading(true);
    setError('');
    try {
      const result = await segmentFloorplan(image);
      setAreas(result.areas || []);
    } catch (err) {
      setError('Segmentation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Floorplan Room Segmentation (AI)</h2>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      <button onClick={handleSegment} disabled={!image || loading} style={{ marginLeft: 8 }}>
        {loading ? 'Analyzing...' : 'Segment Floorplan'}
      </button>
      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
      <div style={{ marginTop: 24 }}>
        {image && (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img
              src={URL.createObjectURL(image)}
              alt="Floorplan"
              style={{ maxWidth: 600, maxHeight: 400, border: '1px solid #ccc' }}
            />
            <svg
              style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
              width={600}
              height={400}
            >
              {areas.map((area, i) => (
                <polygon
                  key={i}
                  points={area.polygon.map(pt => pt.join(',')).join(' ')}
                  fill={area.color || 'rgba(0,128,255,0.2)'}
                  stroke={area.color || '#0080ff'}
                  strokeWidth={2}
                />
              ))}
            </svg>
          </div>
        )}
        {areas.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h4>Detected Areas:</h4>
            <ul>
              {areas.map((area, i) => (
                <li key={i}>{area.type || 'Room'} (points: {area.polygon.length})</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
