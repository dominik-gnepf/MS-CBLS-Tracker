import React from 'react';
import { Product, CATEGORY_ORDER, CATEGORY_COLORS } from '../types';
import CableCard from './CableCard';

interface OverviewProps {
  inventory: Record<string, Product[]>;
  onProductClick: (product: Product) => void;
}

const Overview: React.FC<OverviewProps> = ({ inventory, onProductClick }) => {
  // Sort categories by predefined order
  const sortedCategories = Object.keys(inventory).sort((a, b) => {
    const indexA = CATEGORY_ORDER.indexOf(a as any);
    const indexB = CATEGORY_ORDER.indexOf(b as any);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {sortedCategories.map((category) => {
        const products = inventory[category] || [];
        const colorClass = CATEGORY_COLORS[category] || CATEGORY_COLORS['Other'];

        // Sort products by length value
        const sortedProducts = [...products].sort((a, b) => {
          const aVal = a.cable_length_value ?? Infinity;
          const bVal = b.cable_length_value ?? Infinity;
          return aVal - bVal;
        });

        return (
          <div key={category} className="category-column flex-shrink-0">
            {/* Category Header */}
            <div className={`sticky top-0 p-3 rounded-t-lg border-2 ${colorClass} bg-opacity-50`}>
              <h2 className="font-bold text-gray-800">{category}</h2>
              <p className="text-xs text-gray-600">{products.length} items</p>
            </div>

            {/* Products List */}
            <div className="bg-white border-x-2 border-b-2 border-gray-200 rounded-b-lg">
              <div className="max-h-[calc(100vh-220px)] overflow-y-auto">
                {sortedProducts.map((product) => (
                  <CableCard
                    key={product.msf}
                    product={product}
                    onClick={() => onProductClick(product)}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Overview;
