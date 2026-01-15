// Privacy Service - Handles privacy-aware voter information extraction
// When searching by voter ID, only shows that specific voter's information

/**
 * Check if search text is a voter ID (numeric pattern)
 */
export const isVoterIdSearch = (searchText) => {
  if (!searchText) return false;
  
  // Remove spaces and check if it's all digits
  const cleaned = searchText.trim().replace(/\s/g, '');
  
  // Voter IDs are typically 10-17 digits
  const voterIdPattern = /^\d{10,17}$/;
  return voterIdPattern.test(cleaned);
};

/**
 * Extract only the specific voter's row/entry from page text
 * Returns only the matched voter's information, excluding others
 */
export const extractSpecificVoterRow = (pageText, searchText) => {
  const lines = pageText.split('\n').filter(line => line.trim());
  const isIdSearch = isVoterIdSearch(searchText);
  
  // Create search regex
  const searchPattern = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const searchRegex = new RegExp(searchPattern, 'gi');
  
  // Find the matching line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (searchRegex.test(line)) {
      // Found the matching line - extract only this voter's row
      const voterRow = line.trim();
      
      // Try to identify the complete voter entry
      // Voter entries are typically single lines or a few related lines
      let voterEntry = voterRow;
      
      // If searching by ID, be more precise
      if (isIdSearch) {
        // Extract the exact line containing the ID
        voterEntry = voterRow;
        
        // Try to extract structured data from the row
        // This assumes voter data is in a structured format
        const parts = voterRow.split(/\s+/);
        
        // Find the voter ID in the line
        const idMatch = voterRow.match(/\d{10,17}/);
        if (idMatch && idMatch[0] === searchText.trim().replace(/\s/g, '')) {
          // Exact ID match - return only this row
          return {
            voterRow: voterEntry,
            lineIndex: i,
            isExactMatch: true
          };
        }
      }
      
      return {
        voterRow: voterEntry,
        lineIndex: i,
        isExactMatch: false
      };
    }
  }
  
  return null;
};

/**
 * Extract voter information with privacy protection
 * Only returns information for the specific voter being searched
 */
export const extractVoterInfoPrivacyAware = (pageText, searchText) => {
  const info = {
    voterName: null,
    voterId: null,
    centerName: null,
    serialNumber: null,
    context: null,
    fullRow: null,
    isPrivacyMode: false
  };

  const isIdSearch = isVoterIdSearch(searchText);
  const lines = pageText.split('\n').filter(line => line.trim());
  
  // Find the specific voter row
  const voterMatch = extractSpecificVoterRow(pageText, searchText);
  
  if (!voterMatch) {
    return info;
  }

  const matchedLine = voterMatch.voterRow;
  const lineIndex = voterMatch.lineIndex;
  
  // Set privacy mode for ID searches
  info.isPrivacyMode = isIdSearch;
  info.fullRow = matchedLine;

  // Extract voter ID
  const voterIdMatch = matchedLine.match(/\d{10,17}/);
  if (voterIdMatch) {
    info.voterId = voterIdMatch[0];
    
    // For ID searches, verify it's the exact ID
    if (isIdSearch) {
      const searchId = searchText.trim().replace(/\s/g, '');
      if (voterIdMatch[0] !== searchId) {
        // Not the exact ID - return empty to protect privacy
        return { ...info, isPrivacyMode: true };
      }
    }
  }

  // Extract voter name (usually Bengali text before/after ID)
  // Remove numbers and extract text
  const textParts = matchedLine.replace(/\d+/g, ' ').split(/\s+/).filter(p => p.trim().length > 0);
  const bengaliText = textParts.filter(part => {
    // Check if contains Bengali characters
    return /[\u0980-\u09FF]/.test(part);
  }).join(' ');
  
  if (bengaliText) {
    info.voterName = bengaliText.trim();
  } else {
    // Fallback: use the line without numbers
    info.voterName = matchedLine.replace(/\d+/g, '').trim();
  }

  // Extract serial number if present
  const serialMatch = matchedLine.match(/\b\d{1,4}\b/);
  if (serialMatch) {
    info.serialNumber = serialMatch[0];
  }

  // For privacy mode, only show the matched voter's row
  if (info.isPrivacyMode) {
    info.context = matchedLine; // Only the matched row, no other voters
  } else {
    // For name searches, show limited context (2 lines before/after)
    const contextLines = [
      lines[Math.max(0, lineIndex - 1)],
      matchedLine,
      lines[Math.min(lines.length - 1, lineIndex + 1)]
    ].filter(Boolean);
    info.context = contextLines.join('\n');
  }

  // Find center name (look in header area, not in voter rows)
  for (let j = Math.max(0, lineIndex - 20); j < Math.min(lines.length, lineIndex + 5); j++) {
    if (lines[j].includes('কেন্দ্র') || lines[j].includes('Center') || lines[j].includes('কেন্দ্র')) {
      info.centerName = lines[j].trim();
      break;
    }
  }

  return info;
};

/**
 * Filter page text to show only the matched voter's information
 * Hides other voters' data for privacy
 */
export const filterPageForPrivacy = (pageText, searchText) => {
  const isIdSearch = isVoterIdSearch(searchText);
  
  if (!isIdSearch) {
    // For name searches, return full page (less privacy concern)
    return pageText;
  }

  // For ID searches, extract only the matched voter's row
  const voterMatch = extractSpecificVoterRow(pageText, searchText);
  
  if (!voterMatch) {
    return pageText; // Fallback to full page if no match
  }

  // Return only the matched voter's row
  // This ensures other voters' information is not displayed
  return voterMatch.voterRow;
};

/**
 * Get privacy-safe context for display
 * Only includes the specific voter's information
 */
export const getPrivacySafeContext = (pageText, searchText, maxContextLines = 1) => {
  const isIdSearch = isVoterIdSearch(searchText);
  const lines = pageText.split('\n').filter(line => line.trim());
  
  const voterMatch = extractSpecificVoterRow(pageText, searchText);
  
  if (!voterMatch) {
    return null;
  }

  if (isIdSearch) {
    // For ID searches, return ONLY the matched row
    return voterMatch.voterRow;
  }

  // For name searches, return limited context
  const lineIndex = voterMatch.lineIndex;
  const contextLines = [];
  
  // Add header information if available (center name, etc.)
  for (let i = Math.max(0, lineIndex - 10); i < lineIndex; i++) {
    if (lines[i].includes('কেন্দ্র') || lines[i].includes('Center')) {
      contextLines.push(lines[i]);
      break;
    }
  }
  
  // Add the matched voter's row
  contextLines.push(voterMatch.voterRow);
  
  return contextLines.join('\n');
};
