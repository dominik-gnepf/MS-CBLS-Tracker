import React, { useEffect, useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { Link } from '../types';
import LinksManager from './LinksManager';

interface DatacenterStats {
  id: string;
  name: string;
  totalProducts: number;
  lowStockCount: number;
  criticalStockCount: number;
}

interface HomePageProps {
  onOpenTracker: (datacenterId?: string) => void;
}

const HomePage: React.FC<HomePageProps> = ({ onOpenTracker }) => {
  const { settings } = useSettings();
  const [datacenterStats, setDatacenterStats] = useState<DatacenterStats[]>([]);
  const [starredLinks, setStarredLinks] = useState<Link[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLinksManager, setShowLinksManager] = useState(false);
  const [overallStats, setOverallStats] = useState({
    totalProducts: 0,
    lowStockCount: 0,
    criticalStockCount: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Get starred links
      const starred = await window.electronAPI.getStarredLinks();
      setStarredLinks(starred);

      // Get all datacenters
      const dcs = await window.electronAPI.getAllDatacenters();

      // Get overall stats (all datacenters)
      const allInventory = await window.electronAPI.getInventory();
      const allProducts = Object.values(allInventory).flat();
      const overallLowStock = allProducts.filter(p => p.quantity < settings.lowStockThreshold && p.quantity >= settings.criticalStockThreshold).length;
      const overallCriticalStock = allProducts.filter(p => p.quantity < settings.criticalStockThreshold).length;
      
      setOverallStats({
        totalProducts: allProducts.length,
        lowStockCount: overallLowStock,
        criticalStockCount: overallCriticalStock,
      });

      // Get stats per datacenter
      const stats: DatacenterStats[] = [];
      for (const dc of dcs) {
        const inventory = await window.electronAPI.getInventory(dc.id);
        const products = Object.values(inventory).flat();
        const lowStock = products.filter(p => p.quantity < settings.lowStockThreshold && p.quantity >= settings.criticalStockThreshold).length;
        const criticalStock = products.filter(p => p.quantity < settings.criticalStockThreshold).length;
        
        stats.push({
          id: dc.id,
          name: dc.name,
          totalProducts: products.length,
          lowStockCount: lowStock,
          criticalStockCount: criticalStock,
        });
      }
      setDatacenterStats(stats);
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenLink = async (url: string) => {
    try {
      await window.electronAPI.openExternalLink(url);
    } catch (error) {
      console.error('Error opening link:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Overall Summary Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow-lg p-6 mb-8 text-white">
        <h2 className="text-2xl font-bold mb-4">Inventory Overview</h2>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-4xl font-bold">{overallStats.totalProducts}</p>
            <p className="text-blue-200 text-sm">Total Products</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-yellow-300">{overallStats.lowStockCount}</p>
            <p className="text-blue-200 text-sm">Low Stock Items</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-red-300">{overallStats.criticalStockCount}</p>
            <p className="text-blue-200 text-sm">Critical Stock Items</p>
          </div>
        </div>
      </div>

      {/* Main Navigation Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Cable Tracker Tile */}
        <button
          onClick={() => onOpenTracker()}
          className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 p-6 text-left border-2 border-transparent hover:border-blue-500 group"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">Cable Tracker</h3>
              <p className="text-gray-500">View and manage cable inventory</p>
            </div>
          </div>
          <div className="flex items-center text-blue-600 font-medium">
            <span>Open Tracker</span>
            <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>

        {/* My Links Tile */}
        <button
          onClick={() => setShowLinksManager(true)}
          className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 p-6 text-left border-2 border-transparent hover:border-purple-500 group"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">My Links</h3>
              <p className="text-gray-500">Save and organize important links</p>
            </div>
          </div>
          <div className="flex items-center text-purple-600 font-medium">
            <span>Manage Links</span>
            <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>

        {/* Future Features Tile */}
        <div className="bg-white rounded-xl shadow-md p-6 border-2 border-dashed border-gray-300">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gray-100 rounded-lg">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-400">Future Features</h3>
              <p className="text-gray-400">Coming soon...</p>
            </div>
          </div>
          <ul className="text-sm text-gray-400 space-y-1 ml-4">
            <li>• Cable request management</li>
            <li>• Automated reorder alerts</li>
            <li>• Export reports</li>
          </ul>
        </div>
      </div>

      {/* Starred Links Section */}
      {starredLinks.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              Starred Links
            </h2>
            <button
              onClick={() => setShowLinksManager(true)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Manage all links →
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {starredLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => handleOpenLink(link.url)}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all p-3 text-left border border-gray-200 hover:border-blue-300 group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  <span className="font-medium text-gray-800 truncate text-sm group-hover:text-blue-600">
                    {link.title}
                  </span>
                </div>
                {link.category && (
                  <span className="text-xs text-gray-400">{link.category}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Datacenter Status Cards */}
      {datacenterStats.length > 0 && (
        <>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Datacenter Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {datacenterStats.map((dc) => (
              <button
                key={dc.id}
                onClick={() => onOpenTracker(dc.id)}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 p-4 text-left border-l-4 border-blue-500 hover:border-blue-600"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-800">{dc.id}</h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{dc.name}</span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-semibold text-gray-700">{dc.totalProducts}</p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                  <div>
                    <p className={`text-lg font-semibold ${dc.lowStockCount > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                      {dc.lowStockCount}
                    </p>
                    <p className="text-xs text-gray-500">Low</p>
                  </div>
                  <div>
                    <p className={`text-lg font-semibold ${dc.criticalStockCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {dc.criticalStockCount}
                    </p>
                    <p className="text-xs text-gray-500">Critical</p>
                  </div>
                </div>

                {(dc.lowStockCount > 0 || dc.criticalStockCount > 0) && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    {dc.criticalStockCount > 0 && (
                      <span className="inline-flex items-center text-xs text-red-600 bg-red-50 px-2 py-1 rounded mr-2">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {dc.criticalStockCount} critical
                      </span>
                    )}
                    {dc.lowStockCount > 0 && (
                      <span className="inline-flex items-center text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {dc.lowStockCount} low
                      </span>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {datacenterStats.length === 0 && (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="text-lg font-medium text-gray-500 mb-2">No Datacenters Configured</h3>
          <p className="text-gray-400 mb-4">Add datacenters in the Cable Tracker to see per-site statistics</p>
          <button
            onClick={() => onOpenTracker()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Open Cable Tracker
          </button>
        </div>
      )}

      {/* Links Manager Modal */}
      <LinksManager
        isOpen={showLinksManager}
        onClose={() => setShowLinksManager(false)}
        onLinksChanged={loadData}
      />
    </div>
  );
};

export default HomePage;
