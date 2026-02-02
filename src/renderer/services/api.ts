import {
  Product,
  Inventory,
  Datacenter,
  ImportHistory,
  Link,
  MsfConfig,
  AppSettings,
  ImportResult,
} from '../types';

const API_BASE = '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
}

export const api = {
  // Inventory
  getInventory: async (datacenter?: string): Promise<Record<string, Product[]>> => {
    const params = datacenter ? `?datacenter=${encodeURIComponent(datacenter)}` : '';
    return fetchJSON<Record<string, Product[]>>(`${API_BASE}/inventory${params}`);
  },

  // Products
  getAllProducts: async (datacenter?: string): Promise<Product[]> => {
    const params = datacenter ? `?datacenter=${encodeURIComponent(datacenter)}` : '';
    return fetchJSON<Product[]>(`${API_BASE}/products${params}`);
  },

  getProductDetails: async (msf: string, datacenter?: string): Promise<{ product: Product | null; history: Inventory[] }> => {
    const params = datacenter ? `?datacenter=${encodeURIComponent(datacenter)}` : '';
    return fetchJSON(`${API_BASE}/products/${encodeURIComponent(msf)}${params}`);
  },

  updateProductCategory: async (msf: string, category: string): Promise<{ success: boolean; error?: string }> => {
    return fetchJSON(`${API_BASE}/products/${encodeURIComponent(msf)}/category`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category }),
    });
  },

  searchProducts: async (query: string): Promise<Product[]> => {
    return fetchJSON(`${API_BASE}/products/search?q=${encodeURIComponent(query)}`);
  },

  getProductsWithConfig: async (): Promise<Array<Product & { config: MsfConfig | null }>> => {
    return fetchJSON(`${API_BASE}/products/with-config`);
  },

  // Import
  importCsv: async (file: File, datacenter?: string): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    if (datacenter) {
      formData.append('datacenter', datacenter);
    }
    return fetchJSON(`${API_BASE}/imports`, {
      method: 'POST',
      body: formData,
    });
  },

  getImportHistory: async (): Promise<ImportHistory[]> => {
    return fetchJSON(`${API_BASE}/imports/history`);
  },

  // Settings
  getSettings: async (): Promise<AppSettings | null> => {
    return fetchJSON(`${API_BASE}/settings`);
  },

  saveSettings: async (settings: AppSettings): Promise<{ success: boolean; error?: string }> => {
    return fetchJSON(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
  },

  getCategories: async (): Promise<string[]> => {
    return fetchJSON(`${API_BASE}/settings/categories`);
  },

  // Datacenters
  getAllDatacenters: async (): Promise<Datacenter[]> => {
    return fetchJSON(`${API_BASE}/datacenters`);
  },

  addDatacenter: async (id: string, name: string): Promise<{ success: boolean; error?: string }> => {
    return fetchJSON(`${API_BASE}/datacenters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name }),
    });
  },

  updateDatacenter: async (id: string, name: string): Promise<{ success: boolean; error?: string }> => {
    return fetchJSON(`${API_BASE}/datacenters/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
  },

  deleteDatacenter: async (id: string): Promise<{ success: boolean; error?: string }> => {
    return fetchJSON(`${API_BASE}/datacenters/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // Links
  getAllLinks: async (): Promise<Link[]> => {
    return fetchJSON(`${API_BASE}/links`);
  },

  getStarredLinks: async (): Promise<Link[]> => {
    return fetchJSON(`${API_BASE}/links/starred`);
  },

  addLink: async (title: string, url: string, description?: string, category?: string): Promise<{ success: boolean; id?: number; error?: string }> => {
    return fetchJSON(`${API_BASE}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, url, description, category }),
    });
  },

  updateLink: async (id: number, title: string, url: string, description?: string, category?: string): Promise<{ success: boolean; error?: string }> => {
    return fetchJSON(`${API_BASE}/links/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, url, description, category }),
    });
  },

  toggleLinkStar: async (id: number): Promise<{ success: boolean; error?: string }> => {
    return fetchJSON(`${API_BASE}/links/${id}/star`, {
      method: 'PATCH',
    });
  },

  deleteLink: async (id: number): Promise<{ success: boolean; error?: string }> => {
    return fetchJSON(`${API_BASE}/links/${id}`, {
      method: 'DELETE',
    });
  },

  // MSF Config
  getMsfConfig: async (msf: string): Promise<MsfConfig | null> => {
    return fetchJSON(`${API_BASE}/msf-configs/${encodeURIComponent(msf)}`);
  },

  getAllMsfConfigs: async (): Promise<MsfConfig[]> => {
    return fetchJSON(`${API_BASE}/msf-configs`);
  },

  saveMsfConfig: async (config: Partial<MsfConfig>): Promise<{ success: boolean; error?: string }> => {
    return fetchJSON(`${API_BASE}/msf-configs/${encodeURIComponent(config.msf!)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
  },

  deleteMsfConfig: async (msf: string): Promise<{ success: boolean; error?: string }> => {
    return fetchJSON(`${API_BASE}/msf-configs/${encodeURIComponent(msf)}`, {
      method: 'DELETE',
    });
  },

  // Data management
  deleteAllData: async (): Promise<{ success: boolean; productsDeleted?: number; inventoryDeleted?: number; importsDeleted?: number; error?: string }> => {
    return fetchJSON(`${API_BASE}/data`, {
      method: 'DELETE',
    });
  },

  // External links (web version - just use window.open)
  openExternalLink: async (url: string): Promise<{ success: boolean; error?: string }> => {
    window.open(url, '_blank', 'noopener,noreferrer');
    return { success: true };
  },

  // Update APIs (not needed for web version - return no-ops)
  checkForUpdates: async (): Promise<{ success: boolean; version?: string; error?: string }> => {
    return { success: false, error: 'Updates not available in web version' };
  },

  downloadUpdate: async (): Promise<{ success: boolean; error?: string }> => {
    return { success: false, error: 'Updates not available in web version' };
  },

  installUpdate: async (): Promise<void> => {
    // No-op for web version
  },

  // Update event listeners (no-ops for web version)
  onUpdateAvailable: (_callback: (info: { version: string; releaseNotes?: string; releaseDate?: string }) => void) => {
    return () => {}; // Return empty cleanup function
  },

  onUpdateNotAvailable: (_callback: () => void) => {
    return () => {};
  },

  onUpdateDownloadProgress: (_callback: (progress: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void) => {
    return () => {};
  },

  onUpdateDownloaded: (_callback: (info: { version: string }) => void) => {
    return () => {};
  },

  onUpdateError: (_callback: (error: string) => void) => {
    return () => {};
  },
};

// Export as window.api for compatibility
declare global {
  interface Window {
    api: typeof api;
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.api = api;
}

export default api;
