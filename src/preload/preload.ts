import { contextBridge, ipcRenderer } from 'electron';

export interface ImportResult {
  success: boolean;
  recordsProcessed?: number;
  newProducts?: number;
  updatedProducts?: number;
  error?: string;
}

export interface Product {
  msf: string;
  item_name: string;
  item_group: string | null;
  category: string | null;
  cable_type: string | null;
  cable_length: string | null;
  cable_length_value: number | null;
  cable_length_unit: string | null;
  speed: string | null;
  connector_type: string | null;
  location: string | null;
  datacenter: string | null;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface Inventory {
  id: number;
  msf: string;
  quantity: number;
  datacenter: string;
  import_date: string;
  source_file: string | null;
}

export interface Datacenter {
  id: string;
  name: string;
  created_at: string;
}

export interface ImportHistory {
  id: number;
  filename: string;
  import_date: string;
  records_processed: number;
  new_products: number;
  updated_products: number;
}

export interface CategoryConfig {
  name: string;
  color: string;
  order: number;
}

export interface AppSettings {
  lowStockThreshold: number;
  criticalStockThreshold: number;
  categories: CategoryConfig[];
}

export interface MsfConfig {
  msf: string;
  short_name: string | null;
  category_override: string | null;
  notes: string | null;
  hidden: number;
  custom_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface Link {
  id: number;
  title: string;
  url: string;
  description: string | null;
  starred: number;
  category: string | null;
  created_at: string;
  updated_at: string;
}

const electronAPI = {
  selectCsvFile: (): Promise<string | null> =>
    ipcRenderer.invoke('select-csv-file'),

  importCsv: (filePath: string, datacenter?: string): Promise<ImportResult> =>
    ipcRenderer.invoke('import-csv', filePath, datacenter || ''),

  getInventory: (datacenter?: string): Promise<Record<string, Product[]>> =>
    ipcRenderer.invoke('get-inventory', datacenter),

  getAllProducts: (datacenter?: string): Promise<Product[]> =>
    ipcRenderer.invoke('get-all-products', datacenter),

  getProductDetails: (msf: string, datacenter?: string): Promise<{ product: Product | null; history: Inventory[] }> =>
    ipcRenderer.invoke('get-product-details', msf, datacenter),

  updateProductCategory: (msf: string, category: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('update-product-category', msf, category),

  searchProducts: (query: string): Promise<Product[]> =>
    ipcRenderer.invoke('search-products', query),

  getImportHistory: (): Promise<ImportHistory[]> =>
    ipcRenderer.invoke('get-import-history'),

  getCategories: (): Promise<string[]> =>
    ipcRenderer.invoke('get-categories'),

  getSettings: (): Promise<AppSettings | null> =>
    ipcRenderer.invoke('get-settings'),

  saveSettings: (settings: AppSettings): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('save-settings', settings),

  updateProductItemGroup: (msf: string, itemGroup: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('update-product-item-group', msf, itemGroup),

  deleteAllData: (): Promise<{ success: boolean; productsDeleted?: number; inventoryDeleted?: number; importsDeleted?: number; error?: string }> =>
    ipcRenderer.invoke('delete-all-data'),

  // MSF Config APIs
  getMsfConfig: (msf: string): Promise<MsfConfig | null> =>
    ipcRenderer.invoke('get-msf-config', msf),

  getAllMsfConfigs: (): Promise<MsfConfig[]> =>
    ipcRenderer.invoke('get-all-msf-configs'),

  saveMsfConfig: (config: Partial<MsfConfig>): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('save-msf-config', config),

  deleteMsfConfig: (msf: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('delete-msf-config', msf),

  getProductsWithConfig: (): Promise<Array<Product & { config: MsfConfig | null }>> =>
    ipcRenderer.invoke('get-products-with-config'),

  // Datacenter APIs
  getAllDatacenters: (): Promise<Datacenter[]> =>
    ipcRenderer.invoke('get-all-datacenters'),

  addDatacenter: (id: string, name: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('add-datacenter', id, name),

  updateDatacenter: (id: string, name: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('update-datacenter', id, name),

  deleteDatacenter: (id: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('delete-datacenter', id),

  // Link APIs
  getAllLinks: (): Promise<Link[]> =>
    ipcRenderer.invoke('get-all-links'),

  getStarredLinks: (): Promise<Link[]> =>
    ipcRenderer.invoke('get-starred-links'),

  addLink: (title: string, url: string, description?: string, category?: string): Promise<{ success: boolean; id?: number; error?: string }> =>
    ipcRenderer.invoke('add-link', title, url, description, category),

  updateLink: (id: number, title: string, url: string, description?: string, category?: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('update-link', id, title, url, description, category),

  toggleLinkStar: (id: number): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('toggle-link-star', id),

  deleteLink: (id: number): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('delete-link', id),

  openExternalLink: (url: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('open-external-link', url),

  // Update APIs
  checkForUpdates: (): Promise<{ success: boolean; version?: string; error?: string }> =>
    ipcRenderer.invoke('check-for-updates'),

  downloadUpdate: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('download-update'),

  installUpdate: (): Promise<void> =>
    ipcRenderer.invoke('install-update'),

  onUpdateAvailable: (callback: (info: { version: string; releaseNotes?: string; releaseDate?: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, info: { version: string; releaseNotes?: string; releaseDate?: string }) => callback(info);
    ipcRenderer.on('update-available', handler);
    return () => ipcRenderer.removeListener('update-available', handler);
  },

  onUpdateNotAvailable: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('update-not-available', handler);
    return () => ipcRenderer.removeListener('update-not-available', handler);
  },

  onUpdateDownloadProgress: (callback: (progress: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => callback(progress);
    ipcRenderer.on('update-download-progress', handler);
    return () => ipcRenderer.removeListener('update-download-progress', handler);
  },

  onUpdateDownloaded: (callback: (info: { version: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, info: { version: string }) => callback(info);
    ipcRenderer.on('update-downloaded', handler);
    return () => ipcRenderer.removeListener('update-downloaded', handler);
  },

  onUpdateError: (callback: (error: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, error: string) => callback(error);
    ipcRenderer.on('update-error', handler);
    return () => ipcRenderer.removeListener('update-error', handler);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for renderer
declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
