// PDF Discovery Utility
// Auto-discovers PDF files in the public directory

/**
 * Auto-discover PDF files from public directory
 * Scans for all PDF files and creates entries
 */
export const discoverPDFFiles = async () => {
  // Option 1: Load from a manifest.json file in public folder
  try {
    const response = await fetch('/pdf-manifest.json');
    if (response.ok) {
      const manifest = await response.json();
      if (manifest.pdfs && manifest.pdfs.length > 0) {
        return manifest.pdfs;
      }
    }
  } catch (error) {
    console.log('No manifest file found, auto-discovering PDFs');
  }

  // Option 2: Auto-discover PDFs from public folder
  // We'll use a server endpoint or static list
  // For now, return known PDFs and let upload add more
  
  const knownPDFs = [
    { 
      filename: '261229_com_2_hijra_without_photo_1_2025-11-24.pdf', 
      path: '/261229_com_2_hijra_without_photo_1_2025-11-24.pdf',
      displayName: 'Center 261229 - Hijra'
    },
    { 
      filename: '261225_com_1235_male_without_photo_70_2025-11-24.pdf', 
      path: '/261225_com_1235_male_without_photo_70_2025-11-24.pdf',
      displayName: 'Center 261225 - Male'
    },
    { 
      filename: '261227_com_2641_female_without_photo_148_2025-11-24 (1).pdf', 
      path: '/261227_com_2641_female_without_photo_148_2025-11-24 (1).pdf',
      displayName: 'Center 261227 - Female 1'
    },
    { 
      filename: '261227_com_2641_female_without_photo_148_2025-11-24 (2).pdf', 
      path: '/261227_com_2641_female_without_photo_148_2025-11-24 (2).pdf',
      displayName: 'Center 261227 - Female 2'
    }
  ];

  // Try to fetch a list of PDFs from a simple API endpoint
  // In a real app, this would be a server endpoint that lists files
  // For now, we'll use localStorage to track uploaded PDFs
  try {
    const uploadedPDFs = localStorage.getItem('uploadedPDFs');
    if (uploadedPDFs) {
      const parsed = JSON.parse(uploadedPDFs);
      return [...knownPDFs, ...parsed];
    }
  } catch (error) {
    console.error('Error loading uploaded PDFs:', error);
  }

  return knownPDFs;
};

/**
 * Add a new PDF to the discovered list
 */
export const addPDFToDiscovery = (pdfFile) => {
  try {
    const uploadedPDFs = localStorage.getItem('uploadedPDFs');
    const existing = uploadedPDFs ? JSON.parse(uploadedPDFs) : [];
    
    // Check if already exists
    const exists = existing.some(pdf => pdf.filename === pdfFile.filename);
    if (!exists) {
      existing.push(pdfFile);
      localStorage.setItem('uploadedPDFs', JSON.stringify(existing));
    }
  } catch (error) {
    console.error('Error saving uploaded PDF:', error);
  }
};

/**
 * Get all discovered PDFs including uploaded ones
 */
export const getAllPDFs = async () => {
  const discovered = await discoverPDFFiles();
  return discovered;
};

/**
 * Create a manifest.json file structure for PDFs
 */
export const generateManifest = (pdfFiles) => {
  return {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    pdfs: pdfFiles.map(pdf => ({
      filename: pdf.filename,
      path: pdf.path,
      displayName: pdf.displayName || pdf.filename,
      size: pdf.size || null,
      lastModified: pdf.lastModified || null
    }))
  };
};
