// src/components/AnalyticsControls.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Icons from './icons';

interface AnalyticsControlsProps {
  onExportPDF?: () => void;
  onExportCSV?: () => void;
  onFilterChange?: (filters: AnalyticsFilters) => void;
}

export interface AnalyticsFilters {
  dateRange: '7days' | '30days' | '90days' | 'all';
  issueType?: string[];
  status?: string[];
  priority?: string[];
}

const AnalyticsControls: React.FC<AnalyticsControlsProps> = ({
  onExportPDF,
  onExportCSV,
  onFilterChange
}) => {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    dateRange: '7days'
  });
  const [showFilters, setShowFilters] = useState(false);

  const updateFilter = (key: keyof AnalyticsFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  return (
    <div>
      {/* Control Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        {/* Date Range Selector */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: '#94a3b8', marginRight: '8px' }}>
            Time Period:
          </span>
          {[
            { label: '7 Days', value: '7days' },
            { label: '30 Days', value: '30days' },
            { label: '90 Days', value: '90days' },
            { label: 'All Time', value: 'all' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => updateFilter('dateRange', option.value)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: filters.dateRange === option.value
                  ? 'rgba(52, 152, 219, 0.3)'
                  : 'rgba(255,255,255,0.05)',
                color: filters.dateRange === option.value ? '#3498db' : '#94a3b8',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (filters.dateRange !== option.value) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (filters.dateRange !== option.value) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Export and Filter Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: showFilters ? 'rgba(52, 152, 219, 0.3)' : 'rgba(255,255,255,0.05)',
              color: showFilters ? '#3498db' : '#94a3b8',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {Icons.filter(18)}
            <span>Filters</span>
          </button>

          <button
            onClick={onExportCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(46, 204, 113, 0.5)',
              background: 'rgba(46, 204, 113, 0.1)',
              color: '#2ecc71',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(46, 204, 113, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(46, 204, 113, 0.1)';
            }}
          >
            {Icons.download(18)}
            <span>Export CSV</span>
          </button>

          <button
            onClick={onExportPDF}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(52, 152, 219, 0.5)',
              background: 'rgba(52, 152, 219, 0.1)',
              color: '#3498db',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(52, 152, 219, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(52, 152, 219, 0.1)';
            }}
          >
            {Icons.file(18)}
            <span>Export PDF</span>
          </button>
        </div>
      </motion.div>

      {/* Expandable Filters Panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            overflow: 'hidden'
          }}
        >
          <h4 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#fff',
            marginBottom: '16px'
          }}>
            Advanced Filters
          </h4>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px'
          }}>
            {/* Issue Status Filter */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                color: '#94a3b8',
                marginBottom: '8px',
                fontWeight: '500'
              }}>
                Issue Status
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'].map(status => (
                  <label key={status} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      style={{ width: '16px', height: '16px' }}
                      onChange={(e) => {
                        const current = filters.status || [];
                        const updated = e.target.checked
                          ? [...current, status]
                          : current.filter(s => s !== status);
                        updateFilter('status', updated);
                      }}
                    />
                    <span style={{ fontSize: '13px', color: '#e2e8f0' }}>
                      {status.replace('_', ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                color: '#94a3b8',
                marginBottom: '8px',
                fontWeight: '500'
              }}>
                Priority Level
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {['HIGHEST', 'HIGH', 'MEDIUM', 'LOW', 'LOWEST'].map(priority => (
                  <label key={priority} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      style={{ width: '16px', height: '16px' }}
                      onChange={(e) => {
                        const current = filters.priority || [];
                        const updated = e.target.checked
                          ? [...current, priority]
                          : current.filter(p => p !== priority);
                        updateFilter('priority', updated);
                      }}
                    />
                    <span style={{ fontSize: '13px', color: '#e2e8f0' }}>
                      {priority}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Issue Type Filter */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                color: '#94a3b8',
                marginBottom: '8px',
                fontWeight: '500'
              }}>
                Issue Type
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {['STORY', 'TASK', 'BUG', 'EPIC'].map(type => (
                  <label key={type} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      style={{ width: '16px', height: '16px' }}
                      onChange={(e) => {
                        const current = filters.issueType || [];
                        const updated = e.target.checked
                          ? [...current, type]
                          : current.filter(t => t !== type);
                        updateFilter('issueType', updated);
                      }}
                    />
                    <span style={{ fontSize: '13px', color: '#e2e8f0' }}>
                      {type}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Filter Actions */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255,255,255,0.1)'
          }}>
            <button
              onClick={() => {
                const resetFilters: AnalyticsFilters = { dateRange: '7days' };
                setFilters(resetFilters);
                onFilterChange?.(resetFilters);
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent',
                color: '#94a3b8',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Reset Filters
            </button>
            <button
              onClick={() => setShowFilters(false)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: '#3498db',
                color: 'white',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Apply Filters
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AnalyticsControls;
