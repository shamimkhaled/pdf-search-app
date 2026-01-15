import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { isVoterIdSearch } from '../services/privacyService';
import './PDFViewer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const PDFViewer = ({ 
  pdfFile, 
  initialPage = 1, 
  searchText = '', 
  onVoterInfoClick 
}) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(initialPage);
  const [searchResults, setSearchResults] = useState([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [pageWidth, setPageWidth] = useState(null);
  const documentRef = useRef(null);
  const pageRefs = useRef({});

  // Update page when initialPage changes
  useEffect(() => {
    if (initialPage && initialPage !== pageNumber) {
      setPageNumber(initialPage);
    }
  }, [initialPage]);

  // Calculate page width based on container
  useEffect(() => {
    const updatePageWidth = () => {
      if (documentRef.current) {
        const containerWidth = documentRef.current.offsetWidth - 40;
        setPageWidth(Math.min(containerWidth, 800));
      }
    };

    updatePageWidth();
    window.addEventListener('resize', updatePageWidth);
    return () => window.removeEventListener('resize', updatePageWidth);
  }, []);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    if (initialPage) {
      setPageNumber(Math.min(initialPage, numPages));
    } else {
      setPageNumber(1);
    }
    setSearchResults([]);
    setCurrentResultIndex(-1);
  };

  // Search within the current PDF
  const handleSearch = async () => {
    if (!searchText.trim()) {
      setSearchResults([]);
      setCurrentResultIndex(-1);
      return;
    }

    if (!numPages) {
      return;
    }

    setIsSearching(true);
    try {
      const loadingTask = pdfjs.getDocument(pdfFile);
      const pdf = await loadingTask.promise;
      const results = [];

      // Search through all pages
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items.map(item => item.str).join(' ');
        const searchRegex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        
        if (searchRegex.test(pageText)) {
          const positions = [];
          const cleanRegex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
          let matchIndex;
          let searchText2 = pageText;
          
          while ((matchIndex = cleanRegex.exec(searchText2)) !== null) {
            positions.push({
              index: matchIndex.index,
              length: matchIndex[0].length
            });
          }

          results.push({
            page: pageNum,
            positions: positions,
            count: positions.length
          });
        }
      }

      setSearchResults(results);
      if (results.length > 0) {
        setCurrentResultIndex(0);
        setPageNumber(results[0].page);
      } else {
        setCurrentResultIndex(-1);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Auto-search when searchText changes
  useEffect(() => {
    if (searchText && pdfFile && numPages) {
      handleSearch();
    } else if (!searchText) {
      setSearchResults([]);
      setCurrentResultIndex(-1);
    }
  }, [searchText, pdfFile, numPages]);

  const goToNextResult = () => {
    if (searchResults.length === 0) return;

    let nextResult = null;
    let nextPage = null;

    for (let i = 0; i < searchResults.length; i++) {
      const result = searchResults[i];
      if (result.page > pageNumber || (result.page === pageNumber && i > currentResultIndex)) {
        nextPage = result.page;
        nextResult = { ...result, resultIndex: i };
        break;
      }
    }

    if (!nextResult && searchResults.length > 0) {
      nextResult = { ...searchResults[0], resultIndex: 0 };
      nextPage = searchResults[0].page;
    }

    if (nextPage) {
      setPageNumber(nextPage);
      setCurrentResultIndex(nextResult.resultIndex);
      setTimeout(() => highlightTextOnPage(nextPage), 300);
    }
  };

  const goToPreviousResult = () => {
    if (searchResults.length === 0) return;

    let prevResult = null;
    let prevPage = null;

    for (let i = searchResults.length - 1; i >= 0; i--) {
      const result = searchResults[i];
      if (result.page < pageNumber || (result.page === pageNumber && i < currentResultIndex)) {
        prevPage = result.page;
        prevResult = { ...result, resultIndex: i };
        break;
      }
    }

    if (!prevResult && searchResults.length > 0) {
      const lastResult = searchResults[searchResults.length - 1];
      prevResult = { ...lastResult, resultIndex: searchResults.length - 1 };
      prevPage = lastResult.page;
    }

    if (prevPage) {
      setPageNumber(prevPage);
      setCurrentResultIndex(prevResult.resultIndex);
      setTimeout(() => highlightTextOnPage(prevPage), 300);
    }
  };

  const highlightTextOnPage = (pageNum) => {
    const pageElement = document.querySelector(`[data-page-number="${pageNum}"]`);
    if (pageElement) {
      const textLayer = pageElement.querySelector('.react-pdf__Page__textContent');
      if (textLayer) {
        const marks = textLayer.querySelectorAll('mark');
        if (marks.length > 0) {
          marks[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  };

  // Highlight text when page changes or search results change
  useEffect(() => {
    if (searchText && searchResults.length > 0 && currentResultIndex >= 0) {
      const timer = setTimeout(() => {
        highlightSearchText();
      }, 800);
      return () => clearTimeout(timer);
    } else if (!searchText || searchResults.length === 0) {
      clearHighlights();
    }
  }, [pageNumber, searchText, searchResults, currentResultIndex]);

  const clearHighlights = () => {
    const pageElement = document.querySelector(`[data-page-number="${pageNumber}"]`);
    if (pageElement) {
      const textLayer = pageElement.querySelector('.react-pdf__Page__textContent');
      if (textLayer) {
        const existingMarks = textLayer.querySelectorAll('mark.search-highlight');
        existingMarks.forEach(mark => {
          const parent = mark.parentNode;
          if (parent) {
            parent.replaceChild(document.createTextNode(mark.textContent), mark);
            parent.normalize();
          }
        });
      }
    }
  };

  const highlightSearchText = () => {
    const pageElement = document.querySelector(`[data-page-number="${pageNumber}"]`);
    if (!pageElement) return;

    const textLayer = pageElement.querySelector('.react-pdf__Page__textContent');
    if (!textLayer) return;

    clearHighlights();

    if (!searchText.trim()) return;

    const isIdSearch = isVoterIdSearch(searchText);
    const textSpans = Array.from(textLayer.querySelectorAll('span'));
    const escapedSearch = searchText.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // For ID searches, use exact match; for name searches, use case-insensitive
    const regex = isIdSearch 
      ? new RegExp(escapedSearch.replace(/\s/g, ''), 'g') // Exact match for IDs
      : new RegExp(escapedSearch, 'gi'); // Case-insensitive for names
    
    const textData = [];
    let currentText = '';
    
    textSpans.forEach((span) => {
      const text = span.textContent || '';
      currentText += text;
      textData.push({
        span,
        startIndex: currentText.length - text.length,
        endIndex: currentText.length,
        text
      });
    });

    const matches = [];
    let match;
    while ((match = regex.exec(currentText)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length
      });
    }

    matches.forEach(match => {
      textData.forEach(data => {
        const spanStart = data.startIndex;
        const spanEnd = data.endIndex;
        
        if (match.start < spanEnd && match.end > spanStart) {
          const span = data.span;
          if (span && span.parentNode && !span.classList.contains('search-highlight')) {
            const mark = document.createElement('mark');
            mark.className = 'search-highlight';
            
            mark.style.position = span.style.position || 'absolute';
            mark.style.left = span.style.left;
            mark.style.top = span.style.top;
            mark.style.fontSize = span.style.fontSize;
            mark.style.fontFamily = span.style.fontFamily;
            mark.style.transform = span.style.transform;
            mark.style.transformOrigin = span.style.transformOrigin;
            mark.style.whiteSpace = span.style.whiteSpace;
            mark.textContent = span.textContent;
            
            // Add click handler for voter info
            if (onVoterInfoClick) {
              mark.style.cursor = 'pointer';
              mark.onclick = () => {
                onVoterInfoClick(pageNumber, searchText);
              };
            }
            
            try {
              span.parentNode.replaceChild(mark, span);
            } catch (e) {
              span.classList.add('search-highlight');
            }
          }
        }
      });
    });

    const firstHighlight = textLayer.querySelector('mark.search-highlight');
    if (firstHighlight) {
      firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
  };

  const getTotalMatches = () => {
    return searchResults.reduce((total, result) => total + result.count, 0);
  };

  return (
    <div className="pdf-viewer-container" ref={documentRef}>
      <div className="pdf-container">
        <div className="page-controls">
          <button
            onClick={() => setPageNumber(prev => Math.max(1, prev - 1))}
            disabled={pageNumber <= 1}
            className="page-button"
          >
            ‹ Previous
          </button>
          <span className="page-info">
            Page {pageNumber} of {numPages || '--'}
          </span>
          <button
            onClick={() => setPageNumber(prev => Math.min(numPages || 1, prev + 1))}
            disabled={pageNumber >= (numPages || 1)}
            className="page-button"
          >
            Next ›
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="search-results-info">
            <span>
              {getTotalMatches()} match{getTotalMatches() !== 1 ? 'es' : ''} in this PDF
              {currentResultIndex >= 0 && (
                <span> (Page {searchResults[currentResultIndex].page})</span>
              )}
            </span>
            <div className="navigation-buttons">
              <button 
                onClick={goToPreviousResult}
                disabled={searchResults.length === 0}
                className="nav-button"
              >
                ↑ Previous
              </button>
              <button 
                onClick={goToNextResult}
                disabled={searchResults.length === 0}
                className="nav-button"
              >
                Next ↓
              </button>
            </div>
          </div>
        )}

        <div className="pdf-document-wrapper">
          <Document
            file={pdfFile}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<div className="loading">Loading PDF...</div>}
            error={<div className="error">Failed to load PDF. Please check if the file exists.</div>}
            className="pdf-document"
          >
            <Page
              pageNumber={pageNumber}
              width={pageWidth}
              className="pdf-page"
              data-page-number={pageNumber}
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </Document>
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;
