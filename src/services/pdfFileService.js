// PDF File Service - Discovers and manages PDF files
// This service helps discover PDF files in the public directory

// List of PDF files (can be auto-discovered or manually maintained)
// For production, this could be generated server-side or loaded from an API
export const getPDFFiles = async () => {
  // In a real scenario, this would fetch from an API or scan the public directory
  // For now, we'll use a static list that can be updated
  // The PDFs should be in the public folder
  
  // You can manually add PDF filenames here, or we can create an API endpoint
  // For now, return a function that can be called with a list of PDFs
  return [];
};

// Get PDF file path (handles both relative and absolute paths)
export const getPDFPath = (filename) => {
  // If it's already a full path, return as is
  if (filename.startsWith('http') || filename.startsWith('/')) {
    return filename;
  }
  // Otherwise, assume it's in the public folder
  return `/${filename}`;
};

// Parse PDF filename to extract metadata (if filename contains info)
export const parsePDFFilename = (filename) => {
  // Example: "261229_com_2_hijra_without_photo_1_2025-11-24.pdf"
  // Try to extract center number, type, etc.
  const parts = filename.replace('.pdf', '').split('_');
  
  return {
    filename,
    centerNumber: parts[0] || null,
    type: parts[1] || null,
    serial: parts[2] || null,
    date: parts[parts.length - 1] || null
  };
};

// Auto-discover PDFs from a manifest file or API
// This would be called on app initialization
export const discoverPDFs = async (manifestUrl = null) => {
  if (manifestUrl) {
    try {
      const response = await fetch(manifestUrl);
      const data = await response.json();
      return data.pdfs || [];
    } catch (error) {
      console.error('Error fetching PDF manifest:', error);
      return [];
    }
  }
  
  // Fallback: return empty array (PDFs should be added manually or via API)
  return [];
};
