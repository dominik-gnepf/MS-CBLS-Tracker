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
  import_date: string;
  source_file: string | null;
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

const electronAPI = {
  selectCsvFile: (): Promise<string | null> =>
    ipcRenderer.invoke('select-csv-file'),

  importCsv: (filePath: string): Promise<ImportResult> =>
    ipcRenderer.invoke('import-csv', filePath),

  getInventory: (): Promise<Record<string, Product[]>> =>
    ipcRenderer.invoke('get-inventory'),

  getAllProducts: (): Promise<Product[]> =>
    ipcRenderer.invoke('get-all-products'),

  getProductDetails: (msf: string): Promise<{ product: Product | null; history: Inventory[] }> =>
    ipcRenderer.invoke('get-product-details', msf),

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
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for renderer
declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
