const express = require('express');
const cors = require('cors');
const path = require('path');
const pdfparserRoutes = require('./routes/pdfparser');

const app = express();
const PORT = process.env.PORT || 5001;

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
}));

app.use(express.json());

app.use('/api/pdf', (req, res, next) => {
  console.log(`[server.js] Incoming request: ${req.method} ${req.originalUrl}`);
  if (req.file) {
    console.log(`[server.js] Uploaded file:`, req.file);
  }
  const originalWrite = res.write;
  res.write = function(chunk, encoding, callback) {
    try {
      const str = chunk.toString();
      if (str.startsWith('data: ')) {
        const jsonStr = str.replace('data: ', '').trim();
        console.log('[server.js] Streaming SSE data to frontend:', jsonStr);
      }
    } catch {}
    return originalWrite.apply(this, arguments);
  };
  next();
}, pdfparserRoutes);

app.listen(PORT, () => {
  console.log(`PDF backend server running on port ${PORT}`);
});
