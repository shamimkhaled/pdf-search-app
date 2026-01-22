// Filter Search Service - Handles advanced multi-field filtering
import { searchOptimized, getPageText } from './optimizedIndexService';
import { extractVoterInfoPrivacyAware } from './privacyService';

/**
 * Parse date string to normalized format
 * Handles DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY formats
 */
export const parseDate = (dateString) => {
  if (!dateString || !dateString.trim()) return null;
  
  const cleaned = dateString.trim();
  
  // Try different date formats
  const formats = [
    /(\d{2})\/(\d{2})\/(\d{4})/,  // DD/MM/YYYY
    /(\d{2})-(\d{2})-(\d{4})/,    // DD-MM-YYYY
    /(\d{2})\.(\d{2})\.(\d{4})/,  // DD.MM.YYYY
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // D/M/YYYY
    /(\d{1,2})-(\d{1,2})-(\d{4})/,   // D-M-YYYY
  ];
  
  for (const format of formats) {
    const match = cleaned.match(format);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      const year = match[3];
      return `${day}/${month}/${year}`;
    }
  }
  
  return cleaned; // Return as-is if no format matched
};

/**
 * Extract structured voter data from page text
 */
export const extractStructuredVoterData = (pageText) => {
  const lines = pageText.split('\n').filter(line => line.trim());
  const voters = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip header lines
    if (line.includes('কেন্দ্র') || line.includes('Center') || 
        line.includes('ক্রমিক') || line.includes('Serial') ||
        line.length < 10) {
      continue;
    }
    
    // Extract voter ID (10-17 digits)
    const voterIdMatch = line.match(/\d{10,17}/);
    if (!voterIdMatch) continue;
    
    const voterId = voterIdMatch[0];
    
    // Extract date patterns
    const datePatterns = [
      /(\d{2}\/\d{2}\/\d{4})/,
      /(\d{2}-\d{2}-\d{4})/,
      /(\d{2}\.\d{2}\.\d{4})/,
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(\d{1,2}-\d{1,2}-\d{4})/,
    ];
    
    let birthDate = null;
    for (const pattern of datePatterns) {
      const dateMatch = line.match(pattern);
      if (dateMatch) {
        birthDate = parseDate(dateMatch[1]);
        break;
      }
    }
    
    // Extract Bengali text (voter name, father/mother name)
    const bengaliText = line.match(/[\u0980-\u09FF]+/g) || [];
    
    // Extract area/location (usually contains specific keywords)
    const areaKeywords = ['গ্রাম', 'মহল্লা', 'ওয়ার্ড', 'রোড', 'স্ট্রিট', 'ব্লক'];
    let areaName = null;
    for (let j = Math.max(0, i - 5); j < Math.min(lines.length, i + 5); j++) {
      const checkLine = lines[j];
      if (areaKeywords.some(keyword => checkLine.includes(keyword))) {
        areaName = checkLine.trim();
        break;
      }
    }
    
    // Try to identify father/mother names (usually patterns like "পিতা:", "মাতা:")
    const fatherPattern = /পিতা[:\s]+([\u0980-\u09FF\s]+)/i;
    const motherPattern = /মাতা[:\s]+([\u0980-\u09FF\s]+)/i;
    
    let fatherName = null;
    let motherName = null;
    
    // Check current line and nearby lines
    for (let j = Math.max(0, i - 2); j < Math.min(lines.length, i + 2); j++) {
      const checkLine = lines[j];
      if (!fatherName) {
        const fatherMatch = checkLine.match(fatherPattern);
        if (fatherMatch) {
          fatherName = fatherMatch[1].trim();
        }
      }
      if (!motherName) {
        const motherMatch = checkLine.match(motherPattern);
        if (motherMatch) {
          motherName = motherMatch[1].trim();
        }
      }
    }
    
    // Extract voter name (usually the main Bengali text in the line)
    const voterName = bengaliText.length > 0 ? bengaliText[0].trim() : null;
    
    if (voterId) {
      voters.push({
        voterId,
        voterName: voterName || line.replace(/\d+/g, '').trim(),
        birthDate,
        fatherName,
        motherName,
        areaName,
        lineIndex: i,
        fullLine: line
      });
    }
  }
  
  return voters;
};

/**
 * Match voter data against filters
 */
export const matchVoterFilters = (voter, filters) => {
  if (!filters || !voter) return false;
  
  // Name filter (required)
  if (filters.name && typeof filters.name === 'string' && filters.name.trim()) {
    const namePattern = new RegExp(
      filters.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'i'
    );
    if (!namePattern.test(voter.voterName || '')) {
      return false;
    }
  }
  
  // Birth date filter (required)
  if (filters.birthDate && typeof filters.birthDate === 'string' && filters.birthDate.trim()) {
    const searchDate = parseDate(filters.birthDate);
    if (!searchDate || voter.birthDate !== searchDate) {
      // Try fuzzy match (just check if date parts match)
      const searchParts = searchDate?.split('/') || [];
      const voterParts = voter.birthDate?.split('/') || [];
      
      if (searchParts.length === 3 && voterParts.length === 3) {
        // Check if day, month, year match
        if (searchParts[0] !== voterParts[0] || 
            searchParts[1] !== voterParts[1] || 
            searchParts[2] !== voterParts[2]) {
          return false;
        }
      } else {
        return false;
      }
    }
  }
  
  // Father's name filter (optional)
  if (filters.fatherName && typeof filters.fatherName === 'string' && filters.fatherName.trim()) {
    const fatherPattern = new RegExp(
      filters.fatherName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'i'
    );
    if (!voter.fatherName || !fatherPattern.test(voter.fatherName)) {
      return false;
    }
  }
  
  // Mother's name filter (optional)
  if (filters.motherName && typeof filters.motherName === 'string' && filters.motherName.trim()) {
    const motherPattern = new RegExp(
      filters.motherName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'i'
    );
    if (!voter.motherName || !motherPattern.test(voter.motherName)) {
      return false;
    }
  }
  
  // Area name filter (optional)
  if (filters.areaName && typeof filters.areaName === 'string' && filters.areaName.trim()) {
    const areaPattern = new RegExp(
      filters.areaName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'i'
    );
    if (!voter.areaName || !areaPattern.test(voter.areaName)) {
      return false;
    }
  }
  
  return true;
};

/**
 * Search with advanced filters
 */
export const searchWithFilters = async (pdfFiles, filters) => {
  // Validate filters object
  if (!filters) {
    return { error: 'Filters are required' };
  }
  
  // Validate required filters
  if (!filters.name || typeof filters.name !== 'string' || !filters.name.trim()) {
    return { error: 'Voter name is required' };
  }
  
  if (!filters.birthDate || typeof filters.birthDate !== 'string' || !filters.birthDate.trim()) {
    return { error: 'Birth date is required' };
  }
  
  // First, do a quick search using the name
  const nameResults = await searchOptimized(filters.name);
  
  if (nameResults.length === 0) {
    return { results: [], totalMatches: 0 };
  }
  
  // Then filter by detailed criteria
  const detailedResults = [];
  
  for (const result of nameResults) {
    const matchedPages = [];
    
    for (const pageNum of result.pages) {
      try {
        // Get full page text
        const pageText = await getPageText(result.filePath, pageNum);
        
        // Extract structured voter data
        const voters = extractStructuredVoterData(pageText);
        
        // Filter voters by criteria
        const matchedVoters = voters.filter(voter => 
          matchVoterFilters(voter, filters)
        );
        
        if (matchedVoters.length > 0) {
          matchedPages.push({
            pageNumber: pageNum,
            matchedVoters: matchedVoters,
            count: matchedVoters.length
          });
        }
      } catch (error) {
        console.error(`Error processing page ${pageNum}:`, error);
      }
    }
    
    if (matchedPages.length > 0) {
      detailedResults.push({
        filename: result.filename,
        filePath: result.filePath,
        pages: matchedPages,
        totalMatches: matchedPages.reduce((sum, p) => sum + p.count, 0)
      });
    }
  }
  
  return {
    results: detailedResults,
    totalMatches: detailedResults.reduce((sum, r) => sum + r.totalMatches, 0)
  };
};

/**
 * Get detailed voter information with filters
 */
export const getFilteredVoterInfo = async (pdfFile, pageNumber, filters) => {
  try {
    const pageText = await getPageText(pdfFile, pageNumber);
    const voters = extractStructuredVoterData(pageText);
    
    // Find matching voter
    const matchedVoter = voters.find(voter => matchVoterFilters(voter, filters));
    
    if (!matchedVoter) {
      return null;
    }
    
    return {
      voterId: matchedVoter.voterId,
      voterName: matchedVoter.voterName,
      birthDate: matchedVoter.birthDate,
      fatherName: matchedVoter.fatherName,
      motherName: matchedVoter.motherName,
      areaName: matchedVoter.areaName,
      fullLine: matchedVoter.fullLine,
      isPrivacyMode: true // Always privacy mode for filtered search
    };
  } catch (error) {
    console.error('Error getting filtered voter info:', error);
    return null;
  }
};
