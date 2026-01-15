import React, { useState, useEffect } from 'react';
import './PDFList.css';

const PDFList = ({ 
  searchResults, 
  onSelectPDF, 
  selectedPDF, 
  isSearching,
  totalPDFs 
}) => {
  const [expandedResults, setExpandedResults] = useState({});

  const toggleExpand = (filename) => {
    setExpandedResults(prev => ({
      ...prev,
      [filename]: !prev[filename]
    }));
  };

  if (isSearching) {
    return (
      <div className="pdf-list-container">
        <div className="pdf-list-header">
          <h3>Search Results</h3>
          <div className="searching-indicator">Searching...</div>
        </div>
      </div>
    );
  }

  if (searchResults.length === 0) {
    return (
      <div className="pdf-list-container">
        <div className="pdf-list-header">
          <h3>PDF Files</h3>
          <span className="pdf-count">{totalPDFs} PDFs available</span>
        </div>
        <div className="no-results">
          <p>Enter a search term to find voter information across all PDFs.</p>
          <p className="hint">You can search by:</p>
          <ul>
            <li>Bengali voter name (বাংলা নাম)</li>
            <li>Voter ID number</li>
            <li>Any Bengali keyword</li>
          </ul>
        </div>
      </div>
    );
  }

  const totalMatches = searchResults.reduce((sum, result) => sum + result.totalMatches, 0);

  return (
    <div className="pdf-list-container">
      <div className="pdf-list-header">
        <h3>Search Results</h3>
        <span className="results-count">
          {totalMatches} match{totalMatches !== 1 ? 'es' : ''} in {searchResults.length} PDF{searchResults.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="pdf-results-list">
        {searchResults.map((result, index) => (
          <div 
            key={index} 
            className={`pdf-result-item ${selectedPDF === result.filePath ? 'selected' : ''}`}
            onClick={() => onSelectPDF(result.filePath, result.matches[0]?.pageNumber || 1)}
          >
            <div className="pdf-result-header">
              <div className="pdf-result-info">
                <h4 className="pdf-filename">{result.filename}</h4>
                <span className="pdf-match-count">
                  {result.totalMatches} match{result.totalMatches !== 1 ? 'es' : ''} • {result.numPages} pages
                </span>
              </div>
              <button
                className="expand-button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(result.filename);
                }}
              >
                {expandedResults[result.filename] ? '▼' : '▶'}
              </button>
            </div>

            {expandedResults[result.filename] && (
              <div className="pdf-result-details">
                <div className="matches-list">
                  {result.matches.map((match, matchIndex) => (
                    <div 
                      key={matchIndex}
                      className="match-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPDF(result.filePath, match.pageNumber);
                      }}
                    >
                      <span className="match-page">Page {match.pageNumber}</span>
                      <span className="match-preview">
                        {match.previewText.substring(0, 100)}
                        {match.previewText.length > 100 ? '...' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PDFList;
