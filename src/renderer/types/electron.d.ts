import { AppSettings, CategoryConfig, MsfConfig, Datacenter } from '../preload/preload';

export type { AppSettings, CategoryConfig, MsfConfig, Datacenter };

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
    };
  }
}
