import React from 'react';
import './VoterInfoModal.css';

const VoterInfoModal = ({ isOpen, onClose, voterInfo, pdfInfo }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Voter Information</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {pdfInfo && (
            <div className="info-section">
              <h3>PDF Details</h3>
              <p><strong>File:</strong> {pdfInfo.filename}</p>
              {pdfInfo.centerName && (
                <p><strong>Center:</strong> {pdfInfo.centerName}</p>
              )}
              <p><strong>Page:</strong> {pdfInfo.pageNumber}</p>
            </div>
          )}

          {voterInfo && (
            <div className="info-section">
              <h3>Voter Details</h3>
              {voterInfo.isPrivacyMode && (
                <div className="privacy-badge">
                  🔒 Privacy Mode: Only showing information for the searched voter ID
                </div>
              )}
              {voterInfo.voterName && (
                <p><strong>Name:</strong> {voterInfo.voterName}</p>
              )}
              {voterInfo.voterId && (
                <p><strong>Voter ID:</strong> {voterInfo.voterId}</p>
              )}
              {voterInfo.serialNumber && (
                <p><strong>Serial Number:</strong> {voterInfo.serialNumber}</p>
              )}
              {voterInfo.context && (
                <div className="context-section">
                  <h4>{voterInfo.isPrivacyMode ? 'Voter Information' : 'Context'}:</h4>
                  <pre className="context-text">{voterInfo.context}</pre>
                </div>
              )}
            </div>
          )}

          {!voterInfo && !pdfInfo && (
            <p>No additional information available.</p>
          )}
        </div>

        <div className="modal-footer">
          <button className="modal-button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default VoterInfoModal;
