import React, { useEffect, useState } from 'react';
import { Product, Inventory, LOW_STOCK_THRESHOLD } from '../types';

interface DetailModalProps {
  product: Product;
  onClose: () => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ product, onClose }) => {
  const [history, setHistory] = useState<Inventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const details = await window.electronAPI.getProductDetails(product.msf);
        setHistory(details.history || []);
      } catch (error) {
        console.error('Error loading product details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [product.msf]);

  const isLowStock = product.quantity < LOW_STOCK_THRESHOLD;
  const isCriticalStock = product.quantity < 10;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{product.msf}</h2>
            <p className="text-sm text-gray-500">{product.category || 'Uncategorized'}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Quantity Banner */}
          <div
            className={`
              p-4 rounded-lg mb-4 flex items-center justify-between
              ${isCriticalStock
                ? 'bg-red-100 border border-red-200'
                : isLowStock
                ? 'bg-yellow-100 border border-yellow-200'
                : 'bg-green-100 border border-green-200'
              }
            `}
          >
            <div>
              <p className="text-sm font-medium text-gray-600">Current Quantity</p>
              <p className={`text-3xl font-bold ${
                isCriticalStock ? 'text-red-700' : isLowStock ? 'text-yellow-700' : 'text-green-700'
              }`}>
                {product.quantity}
              </p>
            </div>
            {(isLowStock || isCriticalStock) && (
              <div className="text-right">
                <span className={`
                  px-3 py-1 rounded-full text-sm font-medium
                  ${isCriticalStock ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'}
                `}>
                  {isCriticalStock ? 'Critical Stock' : 'Low Stock'}
                </span>
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <DetailField label="Item Name" value={product.item_name} fullWidth />
            <DetailField label="Cable Type" value={product.cable_type} />
            <DetailField label="Cable Length" value={product.cable_length} />
            <DetailField label="Speed" value={product.speed} />
            <DetailField label="Connector" value={product.connector_type} />
            <DetailField label="Item Group" value={product.item_group} />
            <DetailField label="Location" value={product.location} />
            <DetailField label="Datacenter" value={product.datacenter} />
          </div>

          {/* Import History */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Import History</h3>
            {isLoading ? (
              <p className="text-sm text-gray-500">Loading history...</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-gray-500">No import history available</p>
            ) : (
              <div className="space-y-2">
                {history.slice(0, 10).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                  >
                    <div>
                      <span className="font-medium text-gray-700">{entry.quantity}</span>
                      <span className="text-gray-500 ml-2">units</span>
                    </div>
                    <div className="text-gray-500 text-right">
                      <span>{new Date(entry.import_date + 'Z').toLocaleString(undefined, {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}</span>
                      {entry.source_file && (
                        <div className="text-xs text-gray-400 truncate max-w-[200px]">{entry.source_file}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface DetailFieldProps {
  label: string;
  value: string | null | undefined;
  fullWidth?: boolean;
}

const DetailField: React.FC<DetailFieldProps> = ({ label, value, fullWidth }) => (
  <div className={fullWidth ? 'col-span-2' : ''}>
    <p className="text-xs text-gray-500 mb-1">{label}</p>
    <p className={`text-sm ${value ? 'text-gray-800' : 'text-gray-400'}`}>
      {value || '-'}
    </p>
  </div>
);

export default DetailModal;
