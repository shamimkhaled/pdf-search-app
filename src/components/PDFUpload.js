import React, { useState, useRef } from 'react';
import { indexPDFOptimized } from '../services/optimizedIndexService';
import { addPDFToDiscovery } from '../utils/pdfDiscovery';
import './PDFUpload.css';

const PDFUpload = ({ onPDFAdded, existingPDFs = [] }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf' || file.name.endsWith('.pdf')
    );

    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files).filter(
      file => file.type === 'application/pdf' || file.name.endsWith('.pdf')
    );

    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFiles = async (files) => {
    setUploading(true);
    setUploadStatus(null);
    setUploadProgress(0);

    const uploadedPDFs = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Check if PDF already exists
      const exists = existingPDFs.some(pdf => pdf.filename === file.name);
      if (exists) {
        setUploadStatus(`Skipping ${file.name} - already exists`);
        continue;
      }

      try {
        // Create object URL for the file
        const objectUrl = URL.createObjectURL(file);
        
        // Create PDF entry
        const pdfEntry = {
          filename: file.name,
          path: objectUrl, // Use object URL for uploaded files
          displayName: file.name.replace('.pdf', ''),
          size: file.size,
          lastModified: new Date().toISOString(),
          isUploaded: true
        };

        // Add to discovery
        addPDFToDiscovery(pdfEntry);
        uploadedPDFs.push(pdfEntry);

        // Index the PDF
        setUploadProgress(((i + 1) / files.length) * 100);
        setUploadStatus(`Indexing ${file.name}...`);

        await indexPDFOptimized(
          objectUrl,
          file.name,
          (currentPage, totalPages) => {
            const pageProgress = (currentPage / totalPages) * 100;
            const fileProgress = (i / files.length) * 100;
            setUploadProgress(fileProgress + (pageProgress / files.length));
          }
        );

        setUploadStatus(`✓ ${file.name} indexed successfully`);
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        setUploadStatus(`✗ Error uploading ${file.name}`);
      }
    }

    setUploading(false);
    setUploadProgress(100);
    setUploadStatus(`Successfully added ${uploadedPDFs.length} PDF(s)`);

    // Notify parent component
    if (onPDFAdded && uploadedPDFs.length > 0) {
      onPDFAdded(uploadedPDFs);
    }

    // Reset after 3 seconds
    setTimeout(() => {
      setUploadStatus(null);
      setUploadProgress(0);
    }, 3000);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="pdf-upload-container">
      <div
        className={`upload-area ${isDragging ? 'dragging' : ''} ${uploading ? 'uploading' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!uploading ? openFileDialog : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {uploading ? (
          <div className="upload-progress">
            <div className="upload-icon">📤</div>
            <div className="progress-text">Uploading and indexing...</div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="progress-percentage">{Math.round(uploadProgress)}%</div>
            {uploadStatus && <div className="upload-status">{uploadStatus}</div>}
          </div>
        ) : (
          <div className="upload-content">
            <div className="upload-icon">📁</div>
            <h3>Upload PDF Files</h3>
            <p>Drag and drop PDF files here, or click to browse</p>
            <p className="upload-hint">You can upload multiple PDFs at once</p>
            <button className="upload-button" onClick={(e) => { e.stopPropagation(); openFileDialog(); }}>
              Choose Files
            </button>
          </div>
        )}
      </div>

      {uploadStatus && !uploading && (
        <div className="upload-success">
          {uploadStatus}
        </div>
      )}
    </div>
  );
};

export default PDFUpload;
