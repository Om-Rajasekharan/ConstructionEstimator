require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const pdfparserRoutes = require('./routes/pdfparser');

const app = express();
const PORT = process.env.PORT || 5001;

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://precon-red.vercel.app/',
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

app.use('/api/auth', require('./routes/userverification'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/postresponse', require('./routes/postresponse'));
app.use('/api/conversation', require('./routes/conversation'));
app.use('/api/image', require('./routes/imageproxy'));
app.use('/api/imagemasks', require('./routes/imagemasks'));

mongoose.connect(process.env.MONGO_DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  app.listen(PORT, () => {
  });
})
.catch(err => {
  process.exit(1);
});

app.use('/api/pdf', (req, res, next) => {
  if (req.file) {
  }
  const originalWrite = res.write;
  res.write = function(chunk, encoding, callback) {
    try {
      const str = chunk.toString();
      if (str.startsWith('data: ')) {
        const jsonStr = str.replace('data: ', '').trim();
      }
    } catch {}
    return originalWrite.apply(this, arguments);
  };
  next();
}, pdfparserRoutes);
