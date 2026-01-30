import React, { useState, useEffect, useRef } from 'react';
import { Datacenter } from '../types';

interface DatacenterSelectorProps {
  selectedDatacenter: string;
  onSelectDatacenter: (datacenterId: string) => void;
  onDatacentersChanged: () => void;
}

const DatacenterSelector: React.FC<DatacenterSelectorProps> = ({
  selectedDatacenter,
  onSelectDatacenter,
  onDatacentersChanged,
}) => {
  const [datacenters, setDatacenters] = useState<Datacenter[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDcId, setNewDcId] = useState('');
  const [newDcName, setNewDcName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadDatacenters = async () => {
    try {
      const dcs = await window.electronAPI.getAllDatacenters();
      setDatacenters(dcs);
    } catch (error) {
      console.error('Error loading datacenters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDatacenters();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddDatacenter = async () => {
    if (!newDcId.trim() || !newDcName.trim()) return;

    try {
      await window.electronAPI.addDatacenter(newDcId.trim().toUpperCase(), newDcName.trim());
      await loadDatacenters();
      setNewDcId('');
      setNewDcName('');
      setShowAddModal(false);
      onDatacentersChanged();
    } catch (error) {
      console.error('Error adding datacenter:', error);
    }
  };

  const handleDeleteDatacenter = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete datacenter "${id}"? This will also delete all inventory for this datacenter.`)) {
      return;
    }

    try {
      await window.electronAPI.deleteDatacenter(id);
      await loadDatacenters();
      if (selectedDatacenter === id) {
        onSelectDatacenter('');
      }
      onDatacentersChanged();
    } catch (error) {
      console.error('Error deleting datacenter:', error);
    }
  };

  const selectedDc = datacenters.find(dc => dc.id === selectedDatacenter);
  const displayName = selectedDc ? `${selectedDc.id} - ${selectedDc.name}` : 'All Datacenters';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors min-w-[180px]"
      >
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <span className="text-sm font-medium text-gray-700 truncate max-w-[140px]">
          {isLoading ? 'Loading...' : displayName}
        </span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-2">
            <button
              onClick={() => {
                onSelectDatacenter('');
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                selectedDatacenter === ''
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              All Datacenters
            </button>
            
            {datacenters.length > 0 && <div className="border-t border-gray-100 my-2" />}
            
            {datacenters.map((dc) => (
              <div
                key={dc.id}
                onClick={() => {
                  onSelectDatacenter(dc.id);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-pointer ${
                  selectedDatacenter === dc.id
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{dc.id} - {dc.name}</span>
                <button
                  onClick={(e) => handleDeleteDatacenter(dc.id, e)}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            
            <div className="border-t border-gray-100 my-2" />
            
            <button
              onClick={() => {
                setShowAddModal(true);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Datacenter
            </button>
          </div>
        </div>
      )}

      {/* Add Datacenter Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Add Datacenter</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Datacenter ID
                </label>
                <input
                  type="text"
                  value={newDcId}
                  onChange={(e) => setNewDcId(e.target.value.toUpperCase())}
                  placeholder="e.g., ZRH20"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newDcName}
                  onChange={(e) => setNewDcName(e.target.value)}
                  placeholder="e.g., Zurich Datacenter 20"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDatacenter}
                disabled={!newDcId.trim() || !newDcName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Datacenter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatacenterSelector;
