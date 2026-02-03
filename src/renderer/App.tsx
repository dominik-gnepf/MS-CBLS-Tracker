import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Product } from './types';
import FileUpload from './components/FileUpload';
import Overview from './components/Overview';
import FilterBar from './components/FilterBar';
import DetailModal from './components/DetailModal';
import ImportResultModal from './components/ImportResultModal';
import SettingsModal from './components/SettingsModal';
import MsfConfigModal from './components/MsfConfigModal';
import DatacenterSelector from './components/DatacenterSelector';
import HomePage from './components/HomePage';
import Timer from './components/Timer';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';

// App version - automatically injected from package.json at build time
declare const __APP_VERSION__: string;
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';

type ViewMode = 'home' | 'tracker';

function AppContent() {
  const { settings, updateSettings, getCategoryOrder } = useSettings();
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [inventory, setInventory] = useState<Record<string, Product[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(new Set(getCategoryOrder()));
  const [showSettings, setShowSettings] = useState(false);
  const [showMsfConfig, setShowMsfConfig] = useState(false);
  const [selectedDatacenter, setSelectedDatacenter] = useState<string>('');
  const [importResult, setImportResult] = useState<{
    success: boolean;
    recordsProcessed?: number;
    newProducts?: number;
    updatedProducts?: number;
    error?: string;
  } | null>(null);

  const loadInventory = useCallback(async () => {
    setIsLoading(true);
    setInventory({}); // Clear old inventory immediately to free memory
    try {
      const data = await window.api.getInventory(selectedDatacenter || undefined);
      setInventory(data);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDatacenter]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // Memoized filtered inventory - avoids duplicate state and unnecessary re-renders
  const filteredInventory = useMemo(() => {
    const filtered: Record<string, Product[]> = {};

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
        filteredProducts = filteredProducts.filter((p) => p.quantity < settings.lowStockThreshold);
      }

      if (filteredProducts.length > 0) {
        filtered[category] = filteredProducts;
      }
    }

    return filtered;
  }, [inventory, searchQuery, showLowStockOnly, visibleCategories, settings.lowStockThreshold]);

  // File input ref for CSV import
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async () => {
    // Require datacenter selection for import
    if (!selectedDatacenter) {
      setImportResult({
        success: false,
        error: 'Please select a datacenter before importing. This ensures inventory counts are tracked separately per datacenter.',
      });
      return;
    }

    // Trigger file input click
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset the input so the same file can be selected again
    event.target.value = '';

    try {
      const result = await window.api.importCsv(file, selectedDatacenter);
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

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

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

  const handleOpenTracker = (datacenterId?: string) => {
    if (datacenterId) {
      setSelectedDatacenter(datacenterId);
    }
    setViewMode('tracker');
  };

  const totalProducts = Object.values(inventory).flat().length;
  const lowStockCount = Object.values(inventory)
    .flat()
    .filter((p) => p.quantity < settings.lowStockThreshold).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hidden file input for CSV import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Home Button */}
              <button
                onClick={() => setViewMode('home')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'home'
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
                title="Home"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">MS Daily Tracker</h1>
                <p className="text-xs text-gray-400">v{APP_VERSION}</p>
              </div>
              {viewMode === 'tracker' && (
                <>
                  <DatacenterSelector
                    selectedDatacenter={selectedDatacenter}
                    onSelectDatacenter={setSelectedDatacenter}
                    onDatacentersChanged={loadInventory}
                  />
                  <div className="text-sm text-gray-500">
                    {totalProducts} products | {lowStockCount} low stock
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Timer */}
              <Timer defaultMinutes={6} />
              
              {viewMode === 'tracker' && (
                <>
                  <button
                    onClick={() => setShowMsfConfig(true)}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    title="MSF Configurations"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                  <FileUpload onImport={handleImport} isLoading={isLoading} />
                </>
              )}
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* View Content */}
      {viewMode === 'home' ? (
        <HomePage onOpenTracker={handleOpenTracker} />
      ) : (
        <>
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
        </>
      )}

      {/* Detail Modal */}
      {selectedProduct && (
        <DetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onProductUpdated={loadInventory}
          datacenter={selectedDatacenter}
        />
      )}

      {/* Import Result Modal */}
      {importResult && (
        <ImportResultModal
          result={importResult}
          onClose={() => setImportResult(null)}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSave={updateSettings}
      />

      {/* MSF Config Modal */}
      <MsfConfigModal
        isOpen={showMsfConfig}
        onClose={() => setShowMsfConfig(false)}
        onConfigUpdated={loadInventory}
      />
    </div>
  );
}

function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}

export default App;
