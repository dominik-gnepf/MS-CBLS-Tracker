import React, { useMemo, useCallback } from 'react';
import { FixedSizeList } from 'react-window';
import { Product } from '../types';
import CableCard from './CableCard';
import { useSettings } from '../contexts/SettingsContext';

interface OverviewProps {
  inventory: Record<string, Product[]>;
  onProductClick: (product: Product) => void;
}

const CARD_HEIGHT = 100; // Fixed height for virtualization
const LIST_HEIGHT = window.innerHeight - 220; // Matches original max-h-[calc(100vh-220px)]

interface VirtualizedProductListProps {
  products: Product[];
  onProductClick: (product: Product) => void;
}

const VirtualizedProductList: React.FC<VirtualizedProductListProps> = ({ products, onProductClick }) => {
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const product = products[index];
    return (
      <div style={style}>
        <CableCard
          product={product}
          onClick={() => onProductClick(product)}
        />
      </div>
    );
  }, [products, onProductClick]);

  // Only virtualize if there are enough items to benefit
  if (products.length <= 20) {
    return (
      <div className="max-h-[calc(100vh-220px)] overflow-y-auto">
        {products.map((product) => (
          <CableCard
            key={product.msf}
            product={product}
            onClick={() => onProductClick(product)}
          />
        ))}
      </div>
    );
  }

  return (
    <FixedSizeList
      height={Math.min(LIST_HEIGHT, products.length * CARD_HEIGHT)}
      itemCount={products.length}
      itemSize={CARD_HEIGHT}
      width="100%"
      overscanCount={5}
    >
      {Row}
    </FixedSizeList>
  );
};

const Overview: React.FC<OverviewProps> = ({ inventory, onProductClick }) => {
  const { getCategoryColor, getCategoryOrder } = useSettings();
  const categoryOrder = getCategoryOrder();

  // Memoize sorted categories to prevent re-sorting on every render
  const sortedCategories = useMemo(() => {
    return Object.keys(inventory).sort((a, b) => {
      const indexA = categoryOrder.indexOf(a);
      const indexB = categoryOrder.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [inventory, categoryOrder]);

  // Memoize sorted products per category
  const sortedProductsByCategory = useMemo(() => {
    const result: Record<string, Product[]> = {};
    for (const category of sortedCategories) {
      const products = inventory[category] || [];
      result[category] = [...products].sort((a, b) => {
        const aVal = a.cable_length_value ?? Infinity;
        const bVal = b.cable_length_value ?? Infinity;
        return aVal - bVal;
      });
    }
    return result;
  }, [inventory, sortedCategories]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {sortedCategories.map((category) => {
        const products = inventory[category] || [];
        const sortedProducts = sortedProductsByCategory[category] || [];
        const colorClass = getCategoryColor(category);

        return (
          <div key={category} className="category-column flex-shrink-0">
            {/* Category Header */}
            <div className={`sticky top-0 p-3 rounded-t-lg border-2 ${colorClass} bg-opacity-50`}>
              <h2 className="font-bold text-gray-800">{category}</h2>
              <p className="text-xs text-gray-600">{products.length} items</p>
            </div>

            {/* Products List - Virtualized */}
            <div className="bg-white border-x-2 border-b-2 border-gray-200 rounded-b-lg">
              <VirtualizedProductList
                products={sortedProducts}
                onProductClick={onProductClick}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Overview;
