// PDF Index Service - Builds and maintains an index of PDF content for fast search
import { pdfjs } from 'react-pdf';

// IndexedDB setup for caching
const DB_NAME = 'pdfSearchIndex';
const DB_VERSION = 1;
const STORE_NAME = 'pdfIndex';

let db = null;

// Initialize IndexedDB
const initDB = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'filename' });
      }
    };
  });
};

// Get cached index for a PDF
const getCachedIndex = async (filename) => {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(filename);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting cached index:', error);
    return null;
  }
};

// Cache index for a PDF
const cacheIndex = async (filename, indexData) => {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put({ filename, ...indexData, timestamp: Date.now() });
  } catch (error) {
    console.error('Error caching index:', error);
  }
};

// Extract text from a single page (lightweight extraction)
const extractPageText = async (page) => {
  try {
    const textContent = await page.getTextContent();
    return textContent.items.map(item => item.str).join(' ');
  } catch (error) {
    console.error('Error extracting page text:', error);
    return '';
  }
};

// Build index for a single PDF (page-level indexing for speed)
export const indexPDF = async (pdfFile, filename) => {
  try {
    // Check cache first
    const cached = await getCachedIndex(filename);
    if (cached && cached.pages) {
      return cached;
    }

    const loadingTask = pdfjs.getDocument(pdfFile);
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const pages = [];

    // Extract text from each page (lightweight - just first 500 chars for indexing)
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const fullText = await extractPageText(page);
      
      // Store first 1000 characters for quick search (enough for voter info)
      const previewText = fullText.substring(0, 1000);
      const hasMore = fullText.length > 1000;
      
      pages.push({
        pageNumber: pageNum,
        previewText: previewText,
        fullTextLength: fullText.length,
        hasMore: hasMore
      });
    }

    const indexData = {
      filename,
      numPages,
      pages,
      indexedAt: Date.now()
    };

    // Cache the index
    await cacheIndex(filename, indexData);

    return indexData;
  } catch (error) {
    console.error(`Error indexing PDF ${filename}:`, error);
    return null;
  }
};

// Search across multiple PDFs using the index
export const searchPDFs = async (pdfFiles, searchText) => {
  if (!searchText || !searchText.trim()) {
    return [];
  }

  const searchTerm = searchText.trim();
  const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const results = [];

  // Search through all indexed PDFs
  for (const pdfFile of pdfFiles) {
    const filename = pdfFile.filename || pdfFile.name || pdfFile;
    const filePath = pdfFile.path || pdfFile;
    
    try {
      const index = await indexPDF(filePath, filename);
      if (!index || !index.pages) continue;

      const matches = [];
      
      // Search through indexed pages
      for (const page of index.pages) {
        if (regex.test(page.previewText)) {
          matches.push({
            pageNumber: page.pageNumber,
            previewText: page.previewText,
            hasMore: page.hasMore
          });
        }
      }

      if (matches.length > 0) {
        results.push({
          filename,
          filePath,
          numPages: index.numPages,
          matches,
          totalMatches: matches.length
        });
      }
    } catch (error) {
      console.error(`Error searching PDF ${filename}:`, error);
    }
  }

  return results;
};

// Get detailed text from a specific page (for highlighting)
export const getPageText = async (pdfFile, pageNumber) => {
  try {
    const loadingTask = pdfjs.getDocument(pdfFile);
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(pageNumber);
    return await extractPageText(page);
  } catch (error) {
    console.error('Error getting page text:', error);
    return '';
  }
};

// Extract voter information from page text (simple pattern matching)
export const extractVoterInfo = (pageText, searchText) => {
  const info = {
    voterName: null,
    voterId: null,
    centerName: null,
    serialNumber: null,
    context: null
  };

  // Find the line containing the search text
  const lines = pageText.split('\n').filter(line => line.trim());
  const searchRegex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  
  for (let i = 0; i < lines.length; i++) {
    if (searchRegex.test(lines[i])) {
      const matchLine = lines[i];
      const contextLines = [
        lines[Math.max(0, i - 2)],
        lines[Math.max(0, i - 1)],
        matchLine,
        lines[Math.min(lines.length - 1, i + 1)],
        lines[Math.min(lines.length - 1, i + 2)]
      ].filter(Boolean);

      info.context = contextLines.join('\n');
      
      // Try to extract voter ID (usually numeric, 10-17 digits)
      const voterIdMatch = matchLine.match(/\d{10,17}/);
      if (voterIdMatch) {
        info.voterId = voterIdMatch[0];
      }

      // The matched line likely contains the voter name
      info.voterName = matchLine.trim();

      // Look for center name in nearby lines (usually contains "কেন্দ্র" or similar)
      for (let j = Math.max(0, i - 10); j < Math.min(lines.length, i + 10); j++) {
        if (lines[j].includes('কেন্দ্র') || lines[j].includes('Center')) {
          info.centerName = lines[j].trim();
          break;
        }
      }

      break;
    }
  }

  return info;
};

// Clear all cached indices
export const clearCache = async () => {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await store.clear();
    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
};
