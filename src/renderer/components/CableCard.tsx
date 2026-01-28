import React from 'react';
import { Product } from '../types';
import { useSettings } from '../contexts/SettingsContext';

interface CableCardProps {
  product: Product;
  onClick: () => void;
}

const CableCard: React.FC<CableCardProps> = ({ product, onClick }) => {
  const { settings } = useSettings();
  
  const isLowStock = product.quantity < settings.lowStockThreshold;
  const isCriticalStock = product.quantity < settings.criticalStockThreshold;

  // Generate short description
  const shortDesc = getShortDescription(product);

  return (
    <div
      onClick={onClick}
      className={`
        cable-card p-3 border-b border-gray-100 cursor-pointer
        transition-all duration-150
        hover:bg-gray-50
        ${isCriticalStock ? 'bg-red-50' : isLowStock ? 'bg-yellow-50' : ''}
      `}
    >
      {/* MSF Number */}
      <div className="font-mono text-xs text-gray-500 mb-1">
        {product.msf}
      </div>

      {/* Description */}
      <div className="text-sm font-medium text-gray-800 mb-2 line-clamp-2">
        {shortDesc}
      </div>

      {/* Quantity */}
      <div className="flex items-center justify-between">
        <span
          className={`
            inline-flex items-center px-2 py-1 rounded text-sm font-bold
            ${isCriticalStock
              ? 'bg-red-100 text-red-800'
              : isLowStock
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-green-100 text-green-800'
            }
          `}
        >
          {product.quantity}
        </span>

        {/* Location badge */}
        {product.location && (
          <span className="text-xs text-gray-400 truncate max-w-[100px]">
            {product.location}
          </span>
        )}
      </div>
    </div>
  );
};

function getShortDescription(product: Product): string {
  const parts: string[] = [];

  // Add length if available
  if (product.cable_length) {
    parts.push(product.cable_length);
  }

  // Add speed if available
  if (product.speed) {
    parts.push(product.speed);
  }

  // Add cable type if available
  if (product.cable_type) {
    parts.push(product.cable_type);
  }

  // If we have parts, join them
  if (parts.length > 0) {
    return parts.join(' - ');
  }

  // Fallback: extract from item name
  const itemName = product.item_name;

  // Try to extract a meaningful short description
  // Look for patterns like "7m - 400G AOC" or "CAT6-COPPER-2FT"
  const lengthMatch = itemName.match(/(\d+(?:\.\d+)?)\s*(M|FT)/i);
  if (lengthMatch) {
    const length = `${lengthMatch[1]}${lengthMatch[2].toUpperCase()}`;

    // Check for speed
    const speedMatch = itemName.match(/(100G|200G|400G|800G)/i);
    if (speedMatch) {
      return `${length} - ${speedMatch[1]}`;
    }

    // Check for cable type
    if (/AOC/i.test(itemName)) return `${length} - AOC`;
    if (/PSM/i.test(itemName)) return `${length} - PSM`;
    if (/DR4/i.test(itemName)) return `${length} - DR4`;
    if (/CAT6|COPPER/i.test(itemName)) return `${length} - Copper`;

    return length;
  }

  // Last resort: truncate item name
  const maxLen = 35;
  if (itemName.length > maxLen) {
    return itemName.substring(0, maxLen) + '...';
  }

  return itemName;
}

export default CableCard;
