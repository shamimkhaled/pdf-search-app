import React, { useState, useEffect } from 'react';
import './SearchFilters.css';

const SearchFilters = ({ onFilterChange, filters, isAdvancedMode, onToggleAdvanced }) => {
  const defaultFilters = {
    name: '',
    birthDate: '',
    fatherName: '',
    motherName: '',
    areaName: ''
  };
  
  const [localFilters, setLocalFilters] = useState(() => {
    if (filters && typeof filters === 'object') {
      return {
        name: filters.name || '',
        birthDate: filters.birthDate || '',
        fatherName: filters.fatherName || '',
        motherName: filters.motherName || '',
        areaName: filters.areaName || ''
      };
    }
    return defaultFilters;
  });
  
  // Update local filters when props change
  useEffect(() => {
    if (filters && typeof filters === 'object') {
      setLocalFilters({
        name: filters.name || '',
        birthDate: filters.birthDate || '',
        fatherName: filters.fatherName || '',
        motherName: filters.motherName || '',
        areaName: filters.areaName || ''
      });
    }
  }, [filters]);

  const handleFilterChange = (field, value) => {
    const updated = { ...localFilters, [field]: value };
    setLocalFilters(updated);
    onFilterChange(updated);
  };

  const clearFilters = () => {
    const cleared = {
      name: '',
      birthDate: '',
      fatherName: '',
      motherName: '',
      areaName: ''
    };
    setLocalFilters(cleared);
    onFilterChange(cleared);
  };

  const hasActiveFilters = Object.values(localFilters).some(val => val && val.trim() !== '');

  return (
    <div className="search-filters-container">
      <div className="filters-header">
        <h3>Advanced Search Filters</h3>
        <button 
          className="toggle-advanced-btn"
          onClick={onToggleAdvanced}
        >
          {isAdvancedMode ? '▼ Hide Filters' : '▶ Show Filters'}
        </button>
      </div>

      {isAdvancedMode && (
        <div className="filters-content">
          <div className="filter-row">
            <div className="filter-group">
              <label htmlFor="filter-name">
                <span className="label-icon">👤</span>
                Voter Name <span className="required">*</span>
              </label>
              <input
                id="filter-name"
                type="text"
                className="filter-input"
                placeholder="Enter voter name (বাংলা নাম)"
                value={localFilters.name}
                onChange={(e) => handleFilterChange('name', e.target.value)}
              />
            </div>
          </div>

          <div className="filter-row">
            <div className="filter-group">
              <label htmlFor="filter-birthdate">
                <span className="label-icon">📅</span>
                Birth Date <span className="required">*</span>
              </label>
              <input
                id="filter-birthdate"
                type="text"
                className="filter-input"
                placeholder="DD/MM/YYYY or DD-MM-YYYY"
                value={localFilters.birthDate}
                onChange={(e) => handleFilterChange('birthDate', e.target.value)}
              />
              <small className="filter-hint">Format: DD/MM/YYYY or DD-MM-YYYY</small>
            </div>
          </div>

          <div className="filter-row filter-row-split">
            <div className="filter-group">
              <label htmlFor="filter-father">
                <span className="label-icon">👨</span>
                Father's Name <span className="optional">(Optional)</span>
              </label>
              <input
                id="filter-father"
                type="text"
                className="filter-input"
                placeholder="Father's name (পিতার নাম)"
                value={localFilters.fatherName}
                onChange={(e) => handleFilterChange('fatherName', e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label htmlFor="filter-mother">
                <span className="label-icon">👩</span>
                Mother's Name <span className="optional">(Optional)</span>
              </label>
              <input
                id="filter-mother"
                type="text"
                className="filter-input"
                placeholder="Mother's name (মাতার নাম)"
                value={localFilters.motherName}
                onChange={(e) => handleFilterChange('motherName', e.target.value)}
              />
            </div>
          </div>

          <div className="filter-row">
            <div className="filter-group">
              <label htmlFor="filter-area">
                <span className="label-icon">📍</span>
                Area/Location <span className="optional">(Optional)</span>
              </label>
              <input
                id="filter-area"
                type="text"
                className="filter-input"
                placeholder="Area, village, or location (এলাকা/গ্রাম)"
                value={localFilters.areaName}
                onChange={(e) => handleFilterChange('areaName', e.target.value)}
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="filter-actions">
              <button 
                className="clear-filters-btn"
                onClick={clearFilters}
              >
                Clear All Filters
              </button>
            </div>
          )}

          <div className="filter-info">
            <p>💡 <strong>Tip:</strong> Fill at least Name and Birth Date for best results. Other fields are optional.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchFilters;
