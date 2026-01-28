import React from 'react';
import { CATEGORY_ORDER } from '../types';

interface FilterBarProps {
  searchQuery: string;
  onSearch: (query: string) => void;
  showLowStockOnly: boolean;
  onToggleLowStock: () => void;
  visibleCategories: Set<string>;
  onToggleCategory: (category: string) => void;
  categories: string[];
}

const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearch,
  showLowStockOnly,
  onToggleLowStock,
  visibleCategories,
  onToggleCategory,
  categories,
}) => {
  // Sort categories by predefined order
  const sortedCategories = [...categories].sort((a, b) => {
    const indexA = CATEGORY_ORDER.indexOf(a as any);
    const indexB = CATEGORY_ORDER.indexOf(b as any);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search MSF, description, length..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => onSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Low Stock Toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showLowStockOnly}
            onChange={onToggleLowStock}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Low stock only</span>
        </label>

        {/* Category Toggles */}
        <div className="flex flex-wrap gap-2">
          {sortedCategories.map((category) => (
            <button
              key={category}
              onClick={() => onToggleCategory(category)}
              className={`
                px-3 py-1 text-xs font-medium rounded-full transition-colors
                ${visibleCategories.has(category)
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }
              `}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
