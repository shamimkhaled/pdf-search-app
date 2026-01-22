import React, { useState, useEffect, useCallback } from 'react';
import PDFViewer from './components/PDFViewer';
import PDFList from './components/PDFList';
import VoterInfoModal from './components/VoterInfoModal';
import ProgressIndicator from './components/ProgressIndicator';
import PDFUpload from './components/PDFUpload';
import SearchFilters from './components/SearchFilters';
import { 
  searchOptimized, 
  getPageText, 
  extractVoterInfo,
  indexPDFOptimized,
  getIndexingStatus
} from './services/optimizedIndexService';
import { isVoterIdSearch, getPrivacySafeContext } from './services/privacyService';
import { searchWithFilters, getFilteredVoterInfo } from './services/filterSearchService';
import { parsePDFFilename } from './services/pdfFileService';
import { discoverPDFFiles } from './utils/pdfDiscovery';
import { useDebounce } from './hooks/useDebounce';
import './App.css';

function App() {
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText] = useDebounce(searchText, 300);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPDF, setSelectedPDF] = useState(null);
  const [selectedPage, setSelectedPage] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  const [voterInfo, setVoterInfo] = useState(null);
  const [showVoterModal, setShowVoterModal] = useState(false);
  const [pdfFiles, setPdfFiles] = useState([]);
  const [isLoadingPDFs, setIsLoadingPDFs] = useState(true);
  const [indexingProgress, setIndexingProgress] = useState({ current: 0, total: 0, isIndexing: false });
  const [indexingStatus, setIndexingStatus] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState({
    name: '',
    birthDate: '',
    fatherName: '',
    motherName: '',
    areaName: ''
  });
  const [searchMode, setSearchMode] = useState('simple'); // 'simple' or 'filter'

  // Initialize PDF files list and check indexing status
  useEffect(() => {
    const loadPDFs = async () => {
      try {
        const pdfs = await discoverPDFFiles();
        setPdfFiles(pdfs);
        
        // Check indexing status
        const status = await getIndexingStatus();
        setIndexingStatus(status);
      } catch (error) {
        console.error('Error loading PDFs:', error);
        setPdfFiles([
          { filename: '261229_com_2_hijra_without_photo_1_2025-11-24.pdf', path: '/261229_com_2_hijra_without_photo_1_2025-11-24.pdf' },
          { filename: '261225_com_1235_male_without_photo_70_2025-11-24.pdf', path: '/261225_com_1235_male_without_photo_70_2025-11-24.pdf' }
        ]);
      } finally {
        setIsLoadingPDFs(false);
      }
    };

    loadPDFs();
  }, []);

  // Progressive indexing in background
  useEffect(() => {
    if (pdfFiles.length === 0) {
      return;
    }

    const indexedCount = indexingStatus?.indexedCount || 0;
    if (indexedCount >= pdfFiles.length) {
      return;
    }

    let isCancelled = false;

    const indexAllPDFs = async () => {
      setIndexingProgress({ current: 0, total: pdfFiles.length, isIndexing: true });
      
      for (let i = 0; i < pdfFiles.length && !isCancelled; i++) {
        const pdf = pdfFiles[i];
        const status = await getIndexingStatus();
        
        // Skip if already indexed
        if (status.indices.some(idx => idx.filename === pdf.filename)) {
          setIndexingProgress(prev => ({ ...prev, current: i + 1 }));
          continue;
        }

        if (isCancelled) break;

        try {
          await indexPDFOptimized(
            pdf.path,
            pdf.filename,
            (currentPage, totalPages) => {
              if (!isCancelled) {
                // Update progress
                const progress = i + (currentPage / totalPages);
                setIndexingProgress(prev => ({ ...prev, current: progress }));
              }
            }
          );
        } catch (error) {
          if (!isCancelled) {
            console.error(`Error indexing ${pdf.filename}:`, error);
          }
        }
        
        if (!isCancelled) {
          setIndexingProgress(prev => ({ ...prev, current: i + 1 }));
        }
        
        // Yield to browser to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      if (!isCancelled) {
        setIndexingProgress(prev => ({ ...prev, isIndexing: false }));
        const finalStatus = await getIndexingStatus();
        setIndexingStatus(finalStatus);
      }
    };

    // Start indexing after a short delay
    const timer = setTimeout(() => {
      indexAllPDFs();
    }, 1000);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [pdfFiles, indexingStatus?.indexedCount]);

  // Optimized search with debouncing
  const performSearch = useCallback(async (query) => {
    // Safely check if we should use filter search
    const useFilterSearch = filters && 
      typeof filters.name === 'string' && 
      typeof filters.birthDate === 'string' && 
      filters.name.trim() !== '' && 
      filters.birthDate.trim() !== '' &&
      searchMode === 'filter';
    
    // Use filter search if filters are active
    if (useFilterSearch) {
      setIsSearching(true);
      try {
        const filterResults = await searchWithFilters(pdfFiles, filters);
        
        if (filterResults.error) {
          alert(filterResults.error);
          setSearchResults([]);
          return;
        }
        
        // Convert filter results to match expected format
        const formattedResults = filterResults.results.map(result => ({
          filename: result.filename,
          filePath: result.filePath,
          numPages: 0,
          matches: result.pages.flatMap(page => 
            page.matchedVoters.map(voter => ({
              pageNumber: page.pageNumber,
              previewText: `${voter.voterName} - ${voter.voterId}`,
              hasMore: false,
              voter: voter
            }))
          ),
          totalMatches: result.totalMatches
        }));
        
        setSearchResults(formattedResults);
        
        if (formattedResults.length > 0) {
          const firstResult = formattedResults[0];
          setSelectedPDF(firstResult.filePath);
          setSelectedPage(firstResult.matches[0]?.pageNumber || 1);
        } else {
          setSelectedPDF(null);
        }
      } catch (error) {
        console.error('Filter search error:', error);
        alert('Filter search failed. Please try again.');
      } finally {
        setIsSearching(false);
      }
      return;
    }

    // Simple search
    if (!query.trim()) {
      setSearchResults([]);
      setSelectedPDF(null);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchOptimized(query);
      
      // Convert results to match expected format
      const formattedResults = results.map(result => ({
        filename: result.filename,
        filePath: result.filePath,
        numPages: 0, // Will be loaded when PDF is opened
        matches: result.pages.map(page => ({
          pageNumber: page,
          previewText: `Found on page ${page}`,
          hasMore: false
        })),
        totalMatches: result.totalMatches,
        score: result.score
      }));
      
      setSearchResults(formattedResults);
      
      // Auto-select first result if available
      if (formattedResults.length > 0) {
        const firstResult = formattedResults[0];
        setSelectedPDF(firstResult.filePath);
        setSelectedPage(firstResult.matches[0]?.pageNumber || 1);
      } else {
        setSelectedPDF(null);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [pdfFiles, filters, searchMode]);

  // Auto-search when debounced text changes or filters change
  useEffect(() => {
    // Safely check if we should use filter search
    const useFilterSearch = filters && 
      typeof filters.name === 'string' && 
      typeof filters.birthDate === 'string' && 
      filters.name.trim() !== '' && 
      filters.birthDate.trim() !== '' &&
      searchMode === 'filter';
    
    if (useFilterSearch) {
      performSearch('');
    } else if (debouncedSearchText) {
      performSearch(debouncedSearchText);
    }
  }, [debouncedSearchText, filters, searchMode, performSearch]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      performSearch(searchText);
    }
  };

  const handleSelectPDF = (filePath, pageNumber = 1) => {
    setSelectedPDF(filePath);
    setSelectedPage(pageNumber);
  };

  const handleVoterInfoClick = async (pageNumber, searchTerm) => {
    if (!selectedPDF) return;

    try {
      // Use filtered search if filters are active
      const useFilterSearch = filters && 
        typeof filters.name === 'string' && 
        typeof filters.birthDate === 'string' && 
        filters.name.trim() !== '' && 
        filters.birthDate.trim() !== '' &&
        searchMode === 'filter';
      
      if (useFilterSearch) {
        const filteredInfo = await getFilteredVoterInfo(selectedPDF, pageNumber, filters);
        if (filteredInfo) {
          const pdfMeta = parsePDFFilename(selectedPDF.split('/').pop());
          setVoterInfo({
            ...filteredInfo,
            context: filteredInfo.fullLine,
            pdfInfo: {
              filename: selectedPDF.split('/').pop(),
              pageNumber: pageNumber,
              centerName: pdfMeta.centerNumber ? `Center ${pdfMeta.centerNumber}` : null
            }
          });
          setShowVoterModal(true);
        }
        return;
      }

      // Regular search
      const pageText = await getPageText(selectedPDF, pageNumber);
      const info = extractVoterInfo(pageText, searchTerm);
      const pdfMeta = parsePDFFilename(selectedPDF.split('/').pop());
      
      // For privacy mode (ID searches), get privacy-safe context
      const isIdSearch = isVoterIdSearch(searchTerm);
      let privacySafeContext = info.context;
      
      if (isIdSearch && info.isPrivacyMode) {
        privacySafeContext = getPrivacySafeContext(pageText, searchTerm);
      }
      
      setVoterInfo({
        ...info,
        context: privacySafeContext, // Use privacy-safe context
        pdfInfo: {
          filename: selectedPDF.split('/').pop(),
          pageNumber: pageNumber,
          centerName: pdfMeta.centerNumber ? `Center ${pdfMeta.centerNumber}` : null
        }
      });
      
      setShowVoterModal(true);
    } catch (error) {
      console.error('Error extracting voter info:', error);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    // Switch to filter mode if name and birthdate are filled
    if (newFilters && newFilters.name && newFilters.birthDate && 
        newFilters.name.trim() && newFilters.birthDate.trim()) {
      setSearchMode('filter');
    } else {
      setSearchMode('simple');
    }
  };

  const handlePDFAdded = async (newPDFs) => {
    // Refresh PDF list
    const updatedPDFs = await discoverPDFFiles();
    setPdfFiles(updatedPDFs);
    
    // Update indexing status
    const status = await getIndexingStatus();
    setIndexingStatus(status);
    
    // Show success message
    setShowUpload(false);
  };

  return (
    <div className="App">
      <ProgressIndicator
        progress={indexingProgress.current}
        total={indexingProgress.total}
        message="Indexing PDFs for fast search..."
        isVisible={indexingProgress.isIndexing}
      />

      <header className="App-header">
        <div className="header-content">
          <div className="header-title">
            <h1>
              <span className="gradient-text">Bengali PDF</span> Voter Search
            </h1>
            <p className="header-subtitle">
              {isLoadingPDFs ? (
                <span className="loading-dots">Loading PDFs</span>
              ) : (
                <>
                  Search across <strong>{pdfFiles.length}</strong> voter list PDFs
                  {indexingStatus && (
                    <span className="index-status">
                      {' • '}
                      {indexingStatus.indexedCount} indexed
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
        </div>
      </header>
      
      <main className="App-main">
        <div className="search-section">
          <div className="global-search-container">
            <div className="search-header">
              <div className="search-input-group">
                <div className="search-icon">🔍</div>
                <input
                  type="text"
                  className="search-input"
                  placeholder={
                    filters && 
                    typeof filters.name === 'string' && 
                    typeof filters.birthDate === 'string' && 
                    filters.name.trim() !== '' && 
                    filters.birthDate.trim() !== '' && 
                    searchMode === 'filter'
                      ? "Using advanced filters..." 
                      : "Search by voter name, ID, or keyword... (নাম, আইডি, বা কীওয়ার্ড দিয়ে খুঁজুন...)"
                  }
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={
                    filters && 
                    typeof filters.name === 'string' && 
                    typeof filters.birthDate === 'string' && 
                    filters.name.trim() !== '' && 
                    filters.birthDate.trim() !== '' && 
                    searchMode === 'filter'
                  }
                />
                {isSearching && (
                  <div className="search-spinner">
                    <div className="spinner"></div>
                  </div>
                )}
              </div>
              <button 
                className="upload-toggle-button"
                onClick={() => setShowUpload(!showUpload)}
                title="Add more PDFs to search"
              >
                {showUpload ? '✕' : '📤'} {showUpload ? 'Close' : 'Upload PDFs'}
              </button>
            </div>
            {filters && 
             typeof filters.name === 'string' && 
             typeof filters.birthDate === 'string' && 
             filters.name.trim() !== '' && 
             filters.birthDate.trim() !== '' && 
             searchMode === 'filter' && (
              <div className="filter-active-indicator">
                🔍 Filter Search Active: {filters.name} | {filters.birthDate}
              </div>
            )}
            {searchResults.length > 0 && (
              <div className="search-stats">
                Found {searchResults.length} PDF{searchResults.length !== 1 ? 's' : ''} with matches
              </div>
            )}
          </div>

          <SearchFilters
            onFilterChange={handleFilterChange}
            filters={filters}
            isAdvancedMode={showAdvancedFilters}
            onToggleAdvanced={() => setShowAdvancedFilters(!showAdvancedFilters)}
          />

          {showUpload && (
            <PDFUpload
              onPDFAdded={handlePDFAdded}
              existingPDFs={pdfFiles}
            />
          )}

          <PDFList
            searchResults={searchResults}
            onSelectPDF={handleSelectPDF}
            selectedPDF={selectedPDF}
            isSearching={isSearching}
            totalPDFs={pdfFiles.length}
          />
        </div>

        <div className="viewer-section">
          {selectedPDF ? (
            <PDFViewer
              pdfFile={selectedPDF}
              initialPage={selectedPage}
              searchText={searchText}
              onVoterInfoClick={handleVoterInfoClick}
            />
          ) : (
            <div className="no-pdf-selected">
              <div className="welcome-message">
                <div className="welcome-icon">📄</div>
                <h2>Welcome to Bengali PDF Voter Search</h2>
                <p>Enter a search term above to find voter information across all PDF files.</p>
                <div className="search-tips">
                  <h3>Search Tips</h3>
                  <ul>
                    <li>🔍 Search by Bengali voter name (বাংলা নাম)</li>
                    <li>🆔 Search by Voter ID number</li>
                    <li>🔑 Search by any Bengali keyword</li>
                    <li>👆 Click on highlighted text to see detailed voter information</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <VoterInfoModal
        isOpen={showVoterModal}
        onClose={() => setShowVoterModal(false)}
        voterInfo={voterInfo}
        pdfInfo={voterInfo?.pdfInfo}
      />
    </div>
  );
}

export default App;
