import React, { useState, useEffect, useCallback } from 'react';
import { Product, CATEGORY_ORDER, LOW_STOCK_THRESHOLD } from './types';
import FileUpload from './components/FileUpload';
import Overview from './components/Overview';
import FilterBar from './components/FilterBar';
import DetailModal from './components/DetailModal';
import ImportResultModal from './components/ImportResultModal';

function App() {
  const [inventory, setInventory] = useState<Record<string, Product[]>>({});
  const [filteredInventory, setFilteredInventory] = useState<Record<string, Product[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(new Set(CATEGORY_ORDER));
  const [importResult, setImportResult] = useState<{
    success: boolean;
    recordsProcessed?: number;
    newProducts?: number;
    updatedProducts?: number;
    error?: string;
  } | null>(null);

  const loadInventory = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await window.electronAPI.getInventory();
      setInventory(data);
      setFilteredInventory(data);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  useEffect(() => {
    // Apply filters
    let filtered: Record<string, Product[]> = {};

    for (const [category, products] of Object.entries(inventory)) {
      if (!visibleCategories.has(category)) continue;

      let filteredProducts = products;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredProducts = filteredProducts.filter(
          (p) =>
            p.msf.toLowerCase().includes(query) ||
            p.item_name.toLowerCase().includes(query) ||
            p.cable_length?.toLowerCase().includes(query)
        );
      }

      // Low stock filter
      if (showLowStockOnly) {
        filteredProducts = filteredProducts.filter((p) => p.quantity < LOW_STOCK_THRESHOLD);
      }

      if (filteredProducts.length > 0) {
        filtered[category] = filteredProducts;
      }
    }

    setFilteredInventory(filtered);
  }, [inventory, searchQuery, showLowStockOnly, visibleCategories]);

  const handleImport = async () => {
    try {
      const filePath = await window.electronAPI.selectCsvFile();
      if (!filePath) return;

      const result = await window.electronAPI.importCsv(filePath);
      setImportResult(result);

      if (result.success) {
        await loadInventory();
      }
    } catch (error) {
      console.error('Error importing CSV:', error);
      setImportResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
  };

  const toggleCategory = (category: string) => {
    setVisibleCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
  };

  const totalProducts = Object.values(inventory).flat().length;
  const lowStockCount = Object.values(inventory)
    .flat()
    .filter((p) => p.quantity < LOW_STOCK_THRESHOLD).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-800">MS Cable Tracker</h1>
              <div className="text-sm text-gray-500">
                {totalProducts} products | {lowStockCount} low stock
              </div>
            </div>
            <FileUpload onImport={handleImport} isLoading={isLoading} />
          </div>
        </div>
      </header>

      {/* Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearch={handleSearch}
        showLowStockOnly={showLowStockOnly}
        onToggleLowStock={() => setShowLowStockOnly(!showLowStockOnly)}
        visibleCategories={visibleCategories}
        onToggleCategory={toggleCategory}
        categories={Object.keys(inventory)}
      />

      {/* Main Content */}
      <main className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading inventory...</div>
          </div>
        ) : Object.keys(filteredInventory).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <svg
              className="w-16 h-16 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <p className="text-lg font-medium">No cables found</p>
            <p className="mt-1">Import a CSV file to get started</p>
          </div>
        ) : (
          <Overview
            inventory={filteredInventory}
            onProductClick={handleProductClick}
          />
        )}
      </main>

      {/* Detail Modal */}
      {selectedProduct && (
        <DetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* Import Result Modal */}
      {importResult && (
        <ImportResultModal
          result={importResult}
          onClose={() => setImportResult(null)}
        />
      )}
    </div>
  );
}

export default App;
