import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { pdfjs } from 'react-pdf';

const API_URL = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:5001';

// ForwardRef to allow parent to trigger startProcessing
const VisualsPDF = forwardRef(function VisualsPDF({ pdfFile, externalChunks, onProgress, isProcessing }, ref) {
  const [numPages, setNumPages] = useState(null);
  const [processedChunks, setProcessedChunks] = useState([]); // [{chunkIndex, chunkText, answer}]
  const [currentChunk, setCurrentChunk] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isLocalProcessing, setIsProcessing] = useState(false);

  useImperativeHandle(ref, () => ({
    startProcessing,
    setNumPages
  }));

  // Upload PDF and start processing (SSE)
  async function startProcessing() {
    if (!pdfFile) return;
    setIsProcessing(true);
    setProcessedChunks([]);
    setCurrentChunk(null);
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/api/pdf/calculate`, true);
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
            setProcessedChunks(prev => {
              const next = [...prev, data];
              if (onProgress) onProgress(next);
              return next;
            });
            setCurrentChunk(data.chunkIndex);
          } catch {}
        }
      });
    };
    xhr.onloadend = function () {
      setIsProcessing(false);
    };
    xhr.send(formData);
  }

  // Always set pdfUrl when pdfFile changes, so preview works
  useEffect(() => {
    if (pdfFile) {
      setPdfUrl(URL.createObjectURL(pdfFile));
    } else {
      setPdfUrl(null);
    }
  }, [pdfFile]);

  // Highlighting logic: highlight the chunk text in the PDF text layer for the correct page

  // Helper to highlight text in the text layer (fuzzy, case-insensitive, ignores whitespace)
  function highlightTextLayer(pageDiv, chunkText) {
    const pdfPageContainer = pageDiv && pageDiv.parentElement;
    if (!pdfPageContainer || !chunkText) {
      return;
    }
    const normChunk = chunkText.replace(/\s+/g, '').toLowerCase();
    const spans = pdfPageContainer.querySelectorAll('.react-pdf__Page__textContent span');
    if (!spans.length) {
      return;
    }
    let anyHighlighted = false;
    spans.forEach(span => {
      const normSpan = span.textContent.replace(/\s+/g, '').toLowerCase();
      if (normChunk.includes(normSpan) && normSpan.length > 2) {
        span.style.background = 'rgba(255,255,0,0.5)';
        anyHighlighted = true;
      } else {
        span.style.background = '';
      }
    });
  }

  function highlightTextLayerProgress(pageDiv, processedChunksForPage, totalChunksForPage) {
    if (!pageDiv || !totalChunksForPage || isNaN(totalChunksForPage)) {
      return;
    }
    const textLayer = pageDiv.querySelector('.react-pdf__Page__textContent');
    if (!textLayer) {
      const observer = new MutationObserver((mutations, obs) => {
        const tl = pageDiv.querySelector('.react-pdf__Page__textContent');
        if (tl) {
          obs.disconnect();
          highlightTextLayerProgress(pageDiv, processedChunksForPage, totalChunksForPage);
        }
      });
      observer.observe(pageDiv, { childList: true, subtree: true });
      return;
    }
    const spans = textLayer.querySelectorAll('span');
    if (!spans.length) {
      return;
    }
    spans.forEach(span => {
      span.style.background = '';
    });
    const percent = Math.max(0, Math.min(1, processedChunksForPage / totalChunksForPage));
    const highlightCount = Math.floor(spans.length * percent);
    spans.forEach((span, i) => {
      if (i < highlightCount) {
        span.style.background = 'rgba(255,255,0,0.5)';
      }
    });
  }

  // Highlight overlay component for each page
  function HighlightOverlay({
    pageNumber,
    chunks
  }) {
    // All chunks for this page
    const pageChunks = chunks.filter(chunk => chunk.page === pageNumber);
    // For progress, use the max chunkIndex+1 for this page as total, or estimate
    const allPageChunkIndices = chunks.filter(chunk => chunk.page === pageNumber).map(chunk => chunk.chunkIndex);
    const processedChunksForPage = pageChunks.length;
    const totalChunksForPage = allPageChunkIndices.length > 0 ? Math.max(...allPageChunkIndices) + 1 : 1;
    const pageRef = useRef();
    useEffect(() => {
      if (pageRef.current) {
        // Only highlight if at least one chunk is processed for this page
        if (processedChunksForPage > 0) {
          // Highlight the latest chunk text for this page
          const lastChunkForPage = pageChunks[pageChunks.length - 1];
          if (lastChunkForPage && lastChunkForPage.chunkText) {
            highlightTextLayer(pageRef.current, lastChunkForPage.chunkText);
          } else {
            highlightTextLayerProgress(pageRef.current, processedChunksForPage, totalChunksForPage);
          }
        } else {
          // Remove all highlights if nothing processed yet
          const textLayer = pageRef.current.querySelector('.react-pdf__Page__textContent');
          if (textLayer) {
            textLayer.querySelectorAll('span').forEach(span => {
              span.style.background = '';
            });
          }
        }
      }
    }, [processedChunksForPage, totalChunksForPage, pageRef.current, chunks.length]);
    return <div ref={pageRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 10 }} />;
  };

  return (
    <div style={{ width: '100%', overflowY: 'auto', background: 'none', padding: 0, position: 'relative' }}>
      <Document
        file={pdfUrl}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        loading="Loading PDF..."
      >
        {Array.from(new Array(numPages || 0), (el, index) => (
          <div key={`pagewrap_${index+1}`} style={{ position: 'relative', marginBottom: 16 }}>
            <Page pageNumber={index + 1} width={600} />
            <HighlightOverlay pageNumber={index + 1} chunks={externalChunks || processedChunks} />
          </div>
        ))}
      </Document>
    </div>
  );
});

export default VisualsPDF;
