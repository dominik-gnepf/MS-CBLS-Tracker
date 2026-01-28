import React, { useState, useEffect } from 'react';
import { AppSettings, CategoryConfig, AVAILABLE_COLORS, getCategoryColorClass, DEFAULT_SETTINGS } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => Promise<void>;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<'thresholds' | 'categories' | 'data'>('thresholds');
  const [isSaving, setIsSaving] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('gray');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(localSettings);
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleThresholdChange = (field: 'lowStockThreshold' | 'criticalStockThreshold', value: number) => {
    setLocalSettings((prev) => ({
      ...prev,
      [field]: Math.max(0, value),
    }));
  };

  const addCategory = () => {
    if (!newCategoryName.trim()) return;
    
    const exists = localSettings.categories.some(
      (c) => c.name.toLowerCase() === newCategoryName.trim().toLowerCase()
    );
    if (exists) {
      alert('A category with this name already exists.');
      return;
    }

    const maxOrder = Math.max(...localSettings.categories.map((c) => c.order), -1);
    const newCategory: CategoryConfig = {
      name: newCategoryName.trim(),
      color: newCategoryColor,
      order: maxOrder + 1,
    };

    setLocalSettings((prev) => ({
      ...prev,
      categories: [...prev.categories, newCategory],
    }));
    setNewCategoryName('');
    setNewCategoryColor('gray');
  };

  const updateCategory = (index: number, updates: Partial<CategoryConfig>) => {
    setLocalSettings((prev) => ({
      ...prev,
      categories: prev.categories.map((c, i) => (i === index ? { ...c, ...updates } : c)),
    }));
  };

  const deleteCategory = (index: number) => {
    const category = localSettings.categories[index];
    if (category.name === 'Other') {
      alert('The "Other" category cannot be deleted.');
      return;
    }
    if (!confirm(`Delete category "${category.name}"?`)) return;

    setLocalSettings((prev) => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== index),
    }));
  };

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= localSettings.categories.length) return;

    const newCategories = [...localSettings.categories];
    const [removed] = newCategories.splice(index, 1);
    newCategories.splice(newIndex, 0, removed);

    // Update order values
    newCategories.forEach((c, i) => {
      c.order = i;
    });

    setLocalSettings((prev) => ({
      ...prev,
      categories: newCategories,
    }));
  };

  const resetToDefaults = () => {
    if (confirm('Reset all settings to defaults?')) {
      setLocalSettings({ ...DEFAULT_SETTINGS });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-xl font-bold text-gray-800">Settings</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('thresholds')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'thresholds'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Stock Thresholds
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'categories'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Item Groups / Categories
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'data'
                  ? 'text-red-600 border-b-2 border-red-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Data Management
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {activeTab === 'thresholds' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800">
                    Configure the quantity thresholds that determine when items are marked with warning colors.
                  </p>
                </div>

                {/* Low Stock Threshold (Yellow) */}
                <div className="space-y-2">
                  <label className="flex items-center gap-3">
                    <span className="w-4 h-4 bg-yellow-400 rounded"></span>
                    <span className="font-medium text-gray-700">Low Stock Threshold (Yellow Warning)</span>
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      min="0"
                      value={localSettings.lowStockThreshold}
                      onChange={(e) => handleThresholdChange('lowStockThreshold', parseInt(e.target.value) || 0)}
                      className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-sm text-gray-500">
                      Items with quantity below {localSettings.lowStockThreshold} will be marked yellow
                    </span>
                  </div>
                </div>

                {/* Critical Stock Threshold (Red) */}
                <div className="space-y-2">
                  <label className="flex items-center gap-3">
                    <span className="w-4 h-4 bg-red-500 rounded"></span>
                    <span className="font-medium text-gray-700">Critical Stock Threshold (Red Alert)</span>
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      min="0"
                      value={localSettings.criticalStockThreshold}
                      onChange={(e) => handleThresholdChange('criticalStockThreshold', parseInt(e.target.value) || 0)}
                      className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-sm text-gray-500">
                      Items with quantity below {localSettings.criticalStockThreshold} will be marked red
                    </span>
                  </div>
                </div>

                {/* Preview */}
                <div className="mt-8 p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-medium text-gray-700 mb-3">Preview</h4>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded font-bold">
                        {localSettings.lowStockThreshold}+
                      </span>
                      <span className="text-sm text-gray-600">Normal</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded font-bold">
                        {localSettings.criticalStockThreshold}-{localSettings.lowStockThreshold - 1}
                      </span>
                      <span className="text-sm text-gray-600">Low Stock</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-red-100 text-red-800 rounded font-bold">
                        &lt;{localSettings.criticalStockThreshold}
                      </span>
                      <span className="text-sm text-gray-600">Critical</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'categories' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800">
                    Manage item groups/categories. You can add new categories, change colors, and reorder them.
                  </p>
                </div>

                {/* Add New Category */}
                <div className="p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-medium text-gray-700 mb-3">Add New Category</h4>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Category name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                    />
                    <select
                      value={newCategoryColor}
                      onChange={(e) => setNewCategoryColor(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {AVAILABLE_COLORS.map((color) => (
                        <option key={color} value={color}>
                          {color.charAt(0).toUpperCase() + color.slice(1)}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={addCategory}
                      disabled={!newCategoryName.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Categories List */}
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-700">Current Categories</h4>
                  {localSettings.categories
                    .sort((a, b) => a.order - b.order)
                    .map((category, index) => (
                      <div
                        key={category.name}
                        className={`flex items-center gap-3 p-3 border rounded-lg ${getCategoryColorClass(category.color)} bg-opacity-50`}
                      >
                        {/* Order Controls */}
                        <div className="flex flex-col">
                          <button
                            onClick={() => moveCategory(index, 'up')}
                            disabled={index === 0}
                            className="text-gray-500 hover:text-gray-700 disabled:text-gray-300"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => moveCategory(index, 'down')}
                            disabled={index === localSettings.categories.length - 1}
                            className="text-gray-500 hover:text-gray-700 disabled:text-gray-300"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>

                        {/* Category Name */}
                        {editingCategory === category.name ? (
                          <input
                            type="text"
                            value={category.name}
                            onChange={(e) => updateCategory(index, { name: e.target.value })}
                            onBlur={() => setEditingCategory(null)}
                            onKeyPress={(e) => e.key === 'Enter' && setEditingCategory(null)}
                            className="flex-1 px-3 py-1 border rounded"
                            autoFocus
                          />
                        ) : (
                          <span
                            className="flex-1 font-medium cursor-pointer hover:text-blue-600"
                            onClick={() => setEditingCategory(category.name)}
                          >
                            {category.name}
                          </span>
                        )}

                        {/* Color Selector */}
                        <select
                          value={category.color}
                          onChange={(e) => updateCategory(index, { color: e.target.value })}
                          className="px-3 py-1 border rounded-lg bg-white"
                        >
                          {AVAILABLE_COLORS.map((color) => (
                            <option key={color} value={color}>
                              {color.charAt(0).toUpperCase() + color.slice(1)}
                            </option>
                          ))}
                        </select>

                        {/* Delete Button */}
                        <button
                          onClick={() => deleteCategory(index)}
                          disabled={category.name === 'Other'}
                          className="text-red-500 hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="space-y-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-red-800 font-medium">
                    ⚠️ Danger Zone: Actions here cannot be undone!
                  </p>
                </div>

                {/* Delete All Data */}
                <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                  <h4 className="font-medium text-red-800 mb-2">Delete All Data</h4>
                  <p className="text-sm text-red-700 mb-4">
                    This will permanently delete all products, inventory records, and import history from the database.
                    This action cannot be undone.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-red-700 mb-1">
                        Type <strong>DELETE</strong> to confirm:
                      </label>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="Type DELETE to confirm"
                        className="w-full px-4 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <button
                      onClick={async () => {
                        if (deleteConfirmText !== 'DELETE') {
                          alert('Please type DELETE to confirm.');
                          return;
                        }
                        setIsDeleting(true);
                        try {
                          const result = await window.electronAPI.deleteAllData();
                          if (result.success) {
                            alert(`Successfully deleted all data:\n- ${result.productsDeleted} products\n- ${result.inventoryDeleted} inventory records\n- ${result.importsDeleted} import history records`);
                            setDeleteConfirmText('');
                            onClose();
                            // Refresh the page to show empty state
                            window.location.reload();
                          } else {
                            alert(`Error deleting data: ${result.error}`);
                          }
                        } catch (error) {
                          alert(`Error: ${error}`);
                        } finally {
                          setIsDeleting(false);
                        }
                      }}
                      disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {isDeleting ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete All Data
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
            <button
              onClick={resetToDefaults}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              Reset to Defaults
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center gap-2"
              >
                {isSaving && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
