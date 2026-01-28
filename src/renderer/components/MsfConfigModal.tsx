import React, { useState, useEffect, useMemo } from 'react';
import { Product, MsfConfig } from '../types';
import { useSettings } from '../contexts/SettingsContext';

interface MsfConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: () => void;
}

interface ProductWithConfig extends Product {
  config: MsfConfig | null;
}

const MsfConfigModal: React.FC<MsfConfigModalProps> = ({ isOpen, onClose, onConfigUpdated }) => {
  const { getCategoryOrder } = useSettings();
  const [products, setProducts] = useState<ProductWithConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMsf, setSelectedMsf] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<Partial<MsfConfig> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfiguredOnly, setShowConfiguredOnly] = useState(false);

  const categories = getCategoryOrder();

  useEffect(() => {
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen]);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const data = await window.electronAPI.getProductsWithConfig();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.msf.toLowerCase().includes(query) ||
          p.item_name.toLowerCase().includes(query) ||
          p.config?.short_name?.toLowerCase().includes(query)
      );
    }

    if (showConfiguredOnly) {
      filtered = filtered.filter((p) => p.config !== null);
    }

    return filtered;
  }, [products, searchQuery, showConfiguredOnly]);

  const handleSelectProduct = (product: ProductWithConfig) => {
    setSelectedMsf(product.msf);
    setEditingConfig(
      product.config || {
        msf: product.msf,
        short_name: null,
        category_override: null,
        notes: null,
        hidden: 0,
        custom_order: null,
      }
    );
  };

  const handleSaveConfig = async () => {
    if (!editingConfig?.msf) return;

    setIsSaving(true);
    try {
      const result = await window.electronAPI.saveMsfConfig(editingConfig);
      if (result.success) {
        await loadProducts();
        onConfigUpdated();
      } else {
        alert(`Error saving config: ${result.error}`);
      }
    } catch (error) {
      alert(`Error: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfig = async () => {
    if (!selectedMsf) return;
    if (!confirm('Delete this configuration? The product will use auto-detected settings.')) return;

    try {
      const result = await window.electronAPI.deleteMsfConfig(selectedMsf);
      if (result.success) {
        setEditingConfig(null);
        setSelectedMsf(null);
        await loadProducts();
        onConfigUpdated();
      } else {
        alert(`Error deleting config: ${result.error}`);
      }
    } catch (error) {
      alert(`Error: ${error}`);
    }
  };

  if (!isOpen) return null;

  const selectedProduct = products.find((p) => p.msf === selectedMsf);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex">
          {/* Left Panel - Product List */}
          <div className="w-1/2 border-r flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">MSF Configurations</h2>
              <p className="text-sm text-gray-500">Configure display names, categories, and other settings per MSF</p>
            </div>

            {/* Search */}
            <div className="p-3 border-b">
              <input
                type="text"
                placeholder="Search MSF or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <label className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={showConfiguredOnly}
                  onChange={(e) => setShowConfiguredOnly(e.target.checked)}
                  className="rounded"
                />
                Show configured items only
              </label>
            </div>

            {/* Product List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-32 text-gray-500">Loading...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-500">No products found</div>
              ) : (
                <div className="divide-y">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.msf}
                      onClick={() => handleSelectProduct(product)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                        selectedMsf === product.msf ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-gray-600">{product.msf}</span>
                            {product.config && (
                              <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                                Configured
                              </span>
                            )}
                            {product.config?.hidden ? (
                              <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                Hidden
                              </span>
                            ) : null}
                          </div>
                          <div className="text-sm text-gray-800 truncate">
                            {product.config?.short_name || product.item_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {product.config?.category_override || product.category || 'Uncategorized'}
                          </div>
                        </div>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="px-4 py-2 border-t bg-gray-50 text-sm text-gray-500">
              {products.filter((p) => p.config).length} of {products.length} products configured
            </div>
          </div>

          {/* Right Panel - Edit Form */}
          <div className="w-1/2 flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="font-medium text-gray-800">
                {selectedMsf ? 'Edit Configuration' : 'Select a Product'}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {selectedProduct && editingConfig ? (
              <>
                {/* Product Info */}
                <div className="p-4 border-b bg-blue-50">
                  <div className="font-mono text-lg text-blue-800">{selectedProduct.msf}</div>
                  <div className="text-sm text-blue-600 truncate">{selectedProduct.item_name}</div>
                </div>

                {/* Edit Form */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Short Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Short Display Name
                    </label>
                    <input
                      type="text"
                      value={editingConfig.short_name || ''}
                      onChange={(e) =>
                        setEditingConfig({ ...editingConfig, short_name: e.target.value || null })
                      }
                      placeholder={selectedProduct.item_name}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Override the display name shown in the UI. Leave empty to use original.
                    </p>
                  </div>

                  {/* Category Override */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category Override
                    </label>
                    <select
                      value={editingConfig.category_override || ''}
                      onChange={(e) =>
                        setEditingConfig({ ...editingConfig, category_override: e.target.value || null })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Auto-detect ({selectedProduct.category || 'Other'})</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Override the auto-detected category.
                    </p>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={editingConfig.notes || ''}
                      onChange={(e) =>
                        setEditingConfig({ ...editingConfig, notes: e.target.value || null })
                      }
                      placeholder="Add notes about this cable..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Hidden */}
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingConfig.hidden === 1}
                        onChange={(e) =>
                          setEditingConfig({ ...editingConfig, hidden: e.target.checked ? 1 : 0 })
                        }
                        className="rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Hide from main view</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                      Hidden items won't appear in the inventory overview.
                    </p>
                  </div>

                  {/* Custom Order */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Custom Sort Order
                    </label>
                    <input
                      type="number"
                      value={editingConfig.custom_order ?? ''}
                      onChange={(e) =>
                        setEditingConfig({
                          ...editingConfig,
                          custom_order: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      placeholder="Auto"
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Lower numbers appear first. Leave empty for default sorting.
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
                  {selectedProduct.config ? (
                    <button
                      onClick={handleDeleteConfig}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove Configuration
                    </button>
                  ) : (
                    <div />
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setSelectedMsf(null);
                        setEditingConfig(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveConfig}
                      disabled={isSaving}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center gap-2"
                    >
                      {isSaving && (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      )}
                      Save Configuration
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <svg
                    className="w-16 h-16 mx-auto mb-4 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <p>Select a product from the list to configure</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MsfConfigModal;
