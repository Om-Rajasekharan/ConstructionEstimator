import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import RouteMain from './RouteMain.jsx'
import { pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.mjs';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouteMain />
  </StrictMode>,
)
