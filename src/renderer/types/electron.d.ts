import { AppSettings, CategoryConfig, MsfConfig, Datacenter, Link } from '../preload/preload';

export type { AppSettings, CategoryConfig, MsfConfig, Datacenter, Link };

// Re-export types from preload
declare global {
  interface Window {
    electronAPI: {
      selectCsvFile: () => Promise<string | null>;
      importCsv: (filePath: string, datacenter?: string) => Promise<{
        success: boolean;
        recordsProcessed?: number;
        newProducts?: number;
        updatedProducts?: number;
        error?: string;
      }>;
      getInventory: (datacenter?: string) => Promise<Record<string, any[]>>;
      getAllProducts: (datacenter?: string) => Promise<any[]>;
      getProductDetails: (msf: string, datacenter?: string) => Promise<{ product: any | null; history: any[] }>;
      updateProductCategory: (msf: string, category: string) => Promise<{ success: boolean; error?: string }>;
      searchProducts: (query: string) => Promise<any[]>;
      getImportHistory: () => Promise<any[]>;
      getCategories: () => Promise<string[]>;
      getSettings: () => Promise<AppSettings | null>;
      saveSettings: (settings: AppSettings) => Promise<{ success: boolean; error?: string }>;
      updateProductItemGroup: (msf: string, itemGroup: string) => Promise<{ success: boolean; error?: string }>;
      deleteAllData: () => Promise<{ success: boolean; productsDeleted?: number; inventoryDeleted?: number; importsDeleted?: number; error?: string }>;
      // MSF Config APIs
      getMsfConfig: (msf: string) => Promise<MsfConfig | null>;
      getAllMsfConfigs: () => Promise<MsfConfig[]>;
      saveMsfConfig: (config: Partial<MsfConfig>) => Promise<{ success: boolean; error?: string }>;
      deleteMsfConfig: (msf: string) => Promise<{ success: boolean; error?: string }>;
      getProductsWithConfig: () => Promise<Array<any & { config: MsfConfig | null }>>;
      // Datacenter APIs
      getAllDatacenters: () => Promise<Datacenter[]>;
      addDatacenter: (id: string, name: string) => Promise<{ success: boolean; error?: string }>;
      updateDatacenter: (id: string, name: string) => Promise<{ success: boolean; error?: string }>;
      deleteDatacenter: (id: string) => Promise<{ success: boolean; error?: string }>;
      // Link APIs
      getAllLinks: () => Promise<Link[]>;
      getStarredLinks: () => Promise<Link[]>;
      addLink: (title: string, url: string, description?: string, category?: string) => Promise<{ success: boolean; id?: number; error?: string }>;
      updateLink: (id: number, title: string, url: string, description?: string, category?: string) => Promise<{ success: boolean; error?: string }>;
      toggleLinkStar: (id: number) => Promise<{ success: boolean; error?: string }>;
      deleteLink: (id: number) => Promise<{ success: boolean; error?: string }>;
      openExternalLink: (url: string) => Promise<{ success: boolean; error?: string }>;
      // Update APIs
      checkForUpdates: () => Promise<{ success: boolean; version?: string; error?: string }>;
      downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
      installUpdate: () => Promise<void>;
      onUpdateAvailable: (callback: (info: { version: string; releaseNotes?: string; releaseDate?: string }) => void) => () => void;
      onUpdateNotAvailable: (callback: () => void) => () => void;
      onUpdateDownloadProgress: (callback: (progress: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void) => () => void;
      onUpdateDownloaded: (callback: (info: { version: string }) => void) => () => void;
      onUpdateError: (callback: (error: string) => void) => () => void;
    };
  }
}
