import React from 'react';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  filters: Record<string, any>;
  onFilterChange: (key: string, value: any) => void;
  onClearFilters: () => void;
  filterConfigs: Array<{
    key: string;
    label: string;
    type: 'select' | 'date' | 'text';
    options?: FilterOption[];
    placeholder?: string;
  }>;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
  filterConfigs,
  className = ''
}) => {
  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== null && value !== ''
  );

  return (
    <div className={`bg-gray-50 p-4 rounded-lg ${className}`}>
      <div className="flex flex-nowrap sm:flex-wrap gap-2 sm:gap-4 items-end overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] -mx-4 px-4 sm:mx-0 sm:px-0">
        {filterConfigs.map((config) => (
          <div key={config.key} className="flex flex-col min-w-[140px] sm:min-w-0">
            <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1">
              {config.label}
            </label>
            
            {config.type === 'select' && (
              <select
                value={filters[config.key] || ''}
                onChange={(e) => onFilterChange(config.key, e.target.value || undefined)}
                className="px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Semua</option>
                {config.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
            
            {config.type === 'date' && (
              <input
                type="date"
                value={filters[config.key] || ''}
                onChange={(e) => onFilterChange(config.key, e.target.value || undefined)}
                className="px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            )}
            
            {config.type === 'text' && (
              <input
                type="text"
                value={filters[config.key] || ''}
                onChange={(e) => onFilterChange(config.key, e.target.value || undefined)}
                placeholder={config.placeholder}
                className="px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            )}
          </div>
        ))}
        
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-100 flex-shrink-0"
          >
            Clear Filters
          </button>
        )}
      </div>
      
      {hasActiveFilters && (
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(filters).map(([key, value]) => {
            if (!value) return null;
            const config = filterConfigs.find(c => c.key === key);
            if (!config) return null;
            
            let displayValue = value;
            if (config.type === 'select' && config.options) {
              const option = config.options.find(o => o.value === value);
              displayValue = option?.label || value;
            }
            
            return (
              <span
                key={key}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {config.label}: {displayValue}
                <button
                  onClick={() => onFilterChange(key, undefined)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};