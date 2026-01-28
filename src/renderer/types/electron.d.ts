import { AppSettings, CategoryConfig } from '../preload/preload';

export type { AppSettings, CategoryConfig };

// Re-export types from preload
declare global {
  interface Window {
    electronAPI: {
      selectCsvFile: () => Promise<string | null>;
      importCsv: (filePath: string) => Promise<{
        success: boolean;
        recordsProcessed?: number;
        newProducts?: number;
        updatedProducts?: number;
        error?: string;
      }>;
      getInventory: () => Promise<Record<string, any[]>>;
      getAllProducts: () => Promise<any[]>;
      getProductDetails: (msf: string) => Promise<{ product: any | null; history: any[] }>;
      updateProductCategory: (msf: string, category: string) => Promise<{ success: boolean; error?: string }>;
      searchProducts: (query: string) => Promise<any[]>;
      getImportHistory: () => Promise<any[]>;
      getCategories: () => Promise<string[]>;
      getSettings: () => Promise<AppSettings | null>;
      saveSettings: (settings: AppSettings) => Promise<{ success: boolean; error?: string }>;
      updateProductItemGroup: (msf: string, itemGroup: string) => Promise<{ success: boolean; error?: string }>;
    };
  }
}
