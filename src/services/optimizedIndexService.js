// Optimized Index Service - Uses inverted index for O(1) lookup complexity
import { pdfjs } from 'react-pdf';
import { extractVoterInfoPrivacyAware } from './privacyService';

const DB_NAME = 'pdfSearchIndexV2';
const DB_VERSION = 2;
const INDEX_STORE = 'pdfIndex';
const INVERTED_INDEX_STORE = 'invertedIndex';

let db = null;

// Initialize IndexedDB with inverted index store
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
      
      // PDF metadata store
      if (!database.objectStoreNames.contains(INDEX_STORE)) {
        const pdfStore = database.createObjectStore(INDEX_STORE, { keyPath: 'filename' });
        pdfStore.createIndex('indexedAt', 'indexedAt', { unique: false });
      }
      
      // Inverted index store (word -> [pdfs, pages])
      if (!database.objectStoreNames.contains(INVERTED_INDEX_STORE)) {
        const invertedStore = database.createObjectStore(INVERTED_INDEX_STORE, { keyPath: 'word' });
        invertedStore.createIndex('word', 'word', { unique: true });
      }
    };
  });
};

// Tokenize text into words (handles Bengali and English)
const tokenize = (text) => {
  // Remove punctuation and split by whitespace
  // This works for both Bengali and English text
  return text
    .toLowerCase()
    .replace(/[^\u0980-\u09FF\u0020-\u007E]/g, ' ') // Keep Bengali and ASCII
    .split(/\s+/)
    .filter(word => word.length > 0);
};

// Build n-grams for partial matching (for Bengali names)
const buildNGrams = (text, minLength = 2) => {
  const ngrams = new Set();
  const words = tokenize(text);
  
  words.forEach(word => {
    if (word.length >= minLength) {
      // Add full word
      ngrams.add(word);
      
      // Add character n-grams for partial matching
      for (let i = 0; i <= word.length - minLength; i++) {
        ngrams.add(word.substring(i, i + minLength));
      }
    }
  });
  
  return Array.from(ngrams);
};

// Get cached PDF index
const getCachedPDFIndex = async (filename) => {
  try {
    const database = await initDB();
    const transaction = database.transaction([INDEX_STORE], 'readonly');
    const store = transaction.objectStore(INDEX_STORE);
    const request = store.get(filename);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    return null;
  }
};

// Cache PDF index
const cachePDFIndex = async (filename, indexData) => {
  try {
    const database = await initDB();
    const transaction = database.transaction([INDEX_STORE], 'readwrite');
    const store = transaction.objectStore(INDEX_STORE);
    store.put({ filename, ...indexData, timestamp: Date.now() });
  } catch (error) {
    console.error('Error caching PDF index:', error);
  }
};

// Update inverted index (word -> list of PDFs and pages)
const updateInvertedIndex = async (filename, pageNumber, words) => {
  try {
    const database = await initDB();
    const transaction = database.transaction([INVERTED_INDEX_STORE], 'readwrite');
    const store = transaction.objectStore(INVERTED_INDEX_STORE);
    
    const wordMap = new Map();
    
    // Count word frequencies
    words.forEach(word => {
      wordMap.set(word, (wordMap.get(word) || 0) + 1);
    });
    
    // Update index for each word
    for (const [word, count] of wordMap.entries()) {
      const request = store.get(word);
      
      await new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const existing = request.result;
          const entry = existing || { word, occurrences: [] };
          
          // Check if this PDF/page already indexed
          const existingIndex = entry.occurrences.findIndex(
            occ => occ.filename === filename && occ.page === pageNumber
          );
          
          if (existingIndex >= 0) {
            entry.occurrences[existingIndex].count += count;
          } else {
            entry.occurrences.push({
              filename,
              page: pageNumber,
              count
            });
          }
          
          store.put(entry);
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    }
  } catch (error) {
    console.error('Error updating inverted index:', error);
  }
};

// Extract text from page
const extractPageText = async (page) => {
  try {
    const textContent = await page.getTextContent();
    return textContent.items.map(item => item.str).join(' ');
  } catch (error) {
    return '';
  }
};

// Index a single PDF with inverted index
export const indexPDFOptimized = async (pdfFile, filename, onProgress = null) => {
  try {
    // Check cache first
    const cached = await getCachedPDFIndex(filename);
    if (cached && cached.pages) {
      return cached;
    }

    const loadingTask = pdfjs.getDocument(pdfFile);
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const pages = [];

    // Index pages in batches for better performance
    const batchSize = 5;
    for (let startPage = 1; startPage <= numPages; startPage += batchSize) {
      const endPage = Math.min(startPage + batchSize - 1, numPages);
      
      for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const fullText = await extractPageText(page);
        
        // Tokenize and build inverted index
        const words = tokenize(fullText);
        await updateInvertedIndex(filename, pageNum, words);
        
        pages.push({
          pageNumber: pageNum,
          previewText: fullText.substring(0, 500),
          fullTextLength: fullText.length
        });
        
        if (onProgress) {
          onProgress(pageNum, numPages);
        }
      }
    }

    const indexData = {
      filename,
      numPages,
      pages,
      indexedAt: Date.now()
    };

    await cachePDFIndex(filename, indexData);
    return indexData;
  } catch (error) {
    console.error(`Error indexing PDF ${filename}:`, error);
    return null;
  }
};

// Fast search using inverted index (O(1) lookup per word)
export const searchOptimized = async (searchText) => {
  if (!searchText || !searchText.trim()) {
    return [];
  }

  try {
    const database = await initDB();
    const transaction = database.transaction([INVERTED_INDEX_STORE], 'readonly');
    const store = transaction.objectStore(INVERTED_INDEX_STORE);
    
    // Tokenize search query
    const searchWords = tokenize(searchText);
    const searchNGrams = buildNGrams(searchText, 2);
    
    // Combine words and n-grams for better matching
    const allSearchTerms = [...new Set([...searchWords, ...searchNGrams])];
    
    // Collect results from inverted index
    const resultMap = new Map(); // filename -> { pages: Set, score: number }
    
    for (const term of allSearchTerms) {
      const request = store.get(term);
      
      await new Promise((resolve) => {
        request.onsuccess = () => {
          const indexEntry = request.result;
          if (indexEntry && indexEntry.occurrences) {
            indexEntry.occurrences.forEach(occ => {
              if (!resultMap.has(occ.filename)) {
                resultMap.set(occ.filename, {
                  filename: occ.filename,
                  pages: new Set(),
                  score: 0
                });
              }
              
              const result = resultMap.get(occ.filename);
              result.pages.add(occ.page);
              result.score += occ.count; // Weight by frequency
            });
          }
          resolve();
        };
        request.onerror = () => resolve();
      });
    }
    
    // Convert to array and sort by score
    const results = Array.from(resultMap.values())
      .map(result => ({
        filename: result.filename,
        filePath: `/${result.filename}`,
        pages: Array.from(result.pages).sort((a, b) => a - b),
        score: result.score,
        totalMatches: result.pages.size
      }))
      .sort((a, b) => b.score - a.score); // Sort by relevance
    
    return results;
  } catch (error) {
    console.error('Error in optimized search:', error);
    return [];
  }
};

// Get page text for highlighting
export const getPageText = async (pdfFile, pageNumber) => {
  try {
    const loadingTask = pdfjs.getDocument(pdfFile);
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(pageNumber);
    return await extractPageText(page);
  } catch (error) {
    return '';
  }
};

// Extract voter information with privacy protection
export const extractVoterInfo = (pageText, searchText) => {
  return extractVoterInfoPrivacyAware(pageText, searchText);
};

// Clear all indices
export const clearAllIndices = async () => {
  try {
    const database = await initDB();
    const pdfTransaction = database.transaction([INDEX_STORE], 'readwrite');
    await pdfTransaction.objectStore(INDEX_STORE).clear();
    
    const invertedTransaction = database.transaction([INVERTED_INDEX_STORE], 'readwrite');
    await invertedTransaction.objectStore(INVERTED_INDEX_STORE).clear();
    
    return true;
  } catch (error) {
    console.error('Error clearing indices:', error);
    return false;
  }
};

// Get indexing progress
export const getIndexingStatus = async () => {
  try {
    const database = await initDB();
    const transaction = database.transaction([INDEX_STORE], 'readonly');
    const store = transaction.objectStore(INDEX_STORE);
    const request = store.getAll();
    
    return new Promise((resolve) => {
      request.onsuccess = () => {
        resolve({
          indexedCount: request.result.length,
          indices: request.result
        });
      };
      request.onerror = () => resolve({ indexedCount: 0, indices: [] });
    });
  } catch (error) {
    return { indexedCount: 0, indices: [] };
  }
};
