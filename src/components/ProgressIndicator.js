import React from 'react';
import './ProgressIndicator.css';

const ProgressIndicator = ({ progress, total, message, isVisible }) => {
  if (!isVisible) return null;

  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <div className="progress-indicator">
      <div className="progress-content">
        <div className="progress-header">
          <span className="progress-message">{message}</span>
          <span className="progress-percentage">{percentage}%</span>
        </div>
        <div className="progress-bar-container">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="progress-details">
          {progress} of {total} processed
        </div>
      </div>
    </div>
  );
};

export default ProgressIndicator;
