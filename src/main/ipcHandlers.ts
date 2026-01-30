import { ipcMain, dialog } from 'electron';
import path from 'path';
import {
  getProduct,
  getAllProducts,
  upsertProduct,
  updateProductCategory,
  getLatestInventory,
  getInventoryByCategory,
  insertInventory,
  resetAllInventory,
  getInventoryHistory,
  recordImport,
  getImportHistory,
  searchProducts,
  startBatch,
  endBatch,
  deleteAllData,
  getMsfConfig,
  getAllMsfConfigs,
  upsertMsfConfig,
  deleteMsfConfig,
  getProductsWithConfig,
  Product,
  MsfConfig,
  loadSettings,
  saveSettings,
  AppSettings,
  getAllDatacenters,
  getDatacenter,
  addDatacenter,
  deleteDatacenter,
  updateDatacenter,
  Datacenter,
} from './database';
import { parseCSV, generateSimpleDescription, ParsedCable } from './csvParser';

export function setupIpcHandlers() {
  // File dialog for CSV selection
  ipcMain.handle('select-csv-file', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  // Import CSV file
  ipcMain.handle('import-csv', async (event, filePath: string, datacenter: string = '') => {
    console.log(`Starting CSV import for: ${filePath} into datacenter: ${datacenter || 'all'}`);

    try {
      if (!filePath) {
        throw new Error('No file path provided');
      }

      const cables = await parseCSV(filePath);

      if (cables.length === 0) {
        return {
          success: false,
          error: 'No valid records found in CSV. Make sure the file has MSF and Item Name columns.',
        };
      }

      const filename = path.basename(filePath);

      // Start batch mode to avoid saving after every operation
      startBatch();

      // Reset all existing inventory to 0 before importing for this datacenter
      // This ensures items not in the new CSV show as 0 quantity
      const resetCount = resetAllInventory(filename, datacenter);
      console.log(`Reset ${resetCount} existing products to 0 quantity for datacenter: ${datacenter || 'all'}`);

      console.log(`Importing ${cables.length} cables from CSV...`);

      let newProducts = 0;
      let updatedProducts = 0;

      // Process each cable
      for (const cable of cables) {
        const existing = getProduct(cable.msf);

        if (!existing) {
          newProducts++;
        } else {
          updatedProducts++;
        }

        // Upsert product (MSF database stays the same for all datacenters)
        upsertProduct({
          msf: cable.msf,
          item_name: cable.itemName,
          item_group: cable.itemGroup,
          category: cable.category,
          cable_type: cable.cableType,
          cable_length: cable.cableLength,
          cable_length_value: cable.cableLengthValue,
          cable_length_unit: cable.cableLengthUnit,
          speed: cable.speed,
          connector_type: cable.connectorType,
          location: cable.location,
          datacenter: cable.datacenter,
        });

        // Insert inventory record with datacenter
        insertInventory(cable.msf, cable.quantity, filename, datacenter);
      }

      // Record import history
      recordImport(filename, cables.length, newProducts, updatedProducts);

      // End batch mode and save database once
      endBatch();

      console.log(`Import complete: ${cables.length} records, ${newProducts} new, ${updatedProducts} updated`);

      return {
        success: true,
        recordsProcessed: cables.length,
        newProducts,
        updatedProducts,
      };
    } catch (error) {
      console.error('Error importing CSV:', error);
      // Make sure to end batch mode even on error
      try { endBatch(); } catch (e) { /* ignore */ }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Get inventory grouped by category
  ipcMain.handle('get-inventory', async (event, datacenter?: string) => {
    try {
      return getInventoryByCategory(datacenter);
    } catch (error) {
      console.error('Error getting inventory:', error);
      return {};
    }
  });

  // Get all products as flat list
  ipcMain.handle('get-all-products', async (event, datacenter?: string) => {
    try {
      return getLatestInventory(datacenter);
    } catch (error) {
      console.error('Error getting products:', error);
      return [];
    }
  });

  // Get single product with history
  ipcMain.handle('get-product-details', async (event, msf: string, datacenter?: string) => {
    try {
      const product = getProduct(msf);
      const history = getInventoryHistory(msf, datacenter);
      return { product, history };
    } catch (error) {
      console.error('Error getting product details:', error);
      return { product: null, history: [] };
    }
  });

  // Update product category
  ipcMain.handle('update-product-category', async (event, msf: string, category: string) => {
    try {
      updateProductCategory(msf, category);
      return { success: true };
    } catch (error) {
      console.error('Error updating category:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Search products
  ipcMain.handle('search-products', async (event, query: string) => {
    try {
      return searchProducts(query);
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  });

  // Get import history
  ipcMain.handle('get-import-history', async () => {
    try {
      return getImportHistory();
    } catch (error) {
      console.error('Error getting import history:', error);
      return [];
    }
  });

  // Get available categories
  ipcMain.handle('get-categories', async () => {
    const settings = loadSettings();
    return settings.categories
      .sort((a, b) => a.order - b.order)
      .map(c => c.name);
  });

  // Get settings
  ipcMain.handle('get-settings', async () => {
    try {
      return loadSettings();
    } catch (error) {
      console.error('Error getting settings:', error);
      return null;
    }
  });

  // Save settings
  ipcMain.handle('save-settings', async (event, settings: AppSettings) => {
    try {
      saveSettings(settings);
      return { success: true };
    } catch (error) {
      console.error('Error saving settings:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Update product item group
  ipcMain.handle('update-product-item-group', async (event, msf: string, itemGroup: string) => {
    try {
      updateProductCategory(msf, itemGroup);
      return { success: true };
    } catch (error) {
      console.error('Error updating item group:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Delete all data from the database
  ipcMain.handle('delete-all-data', async () => {
    try {
      const result = deleteAllData();
      console.log(`Deleted all data: ${result.productsDeleted} products, ${result.inventoryDeleted} inventory records, ${result.importsDeleted} import records`);
      return { success: true, ...result };
    } catch (error) {
      console.error('Error deleting all data:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // MSF Config handlers
  ipcMain.handle('get-msf-config', async (event, msf: string) => {
    try {
      return getMsfConfig(msf) || null;
    } catch (error) {
      console.error('Error getting MSF config:', error);
      return null;
    }
  });

  ipcMain.handle('get-all-msf-configs', async () => {
    try {
      return getAllMsfConfigs();
    } catch (error) {
      console.error('Error getting all MSF configs:', error);
      return [];
    }
  });

  ipcMain.handle('save-msf-config', async (event, config: Partial<MsfConfig>) => {
    try {
      upsertMsfConfig(config);
      return { success: true };
    } catch (error) {
      console.error('Error saving MSF config:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('delete-msf-config', async (event, msf: string) => {
    try {
      deleteMsfConfig(msf);
      return { success: true };
    } catch (error) {
      console.error('Error deleting MSF config:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('get-products-with-config', async () => {
    try {
      return getProductsWithConfig();
    } catch (error) {
      console.error('Error getting products with config:', error);
      return [];
    }
  });

  // Datacenter handlers
  ipcMain.handle('get-all-datacenters', async () => {
    try {
      return getAllDatacenters();
    } catch (error) {
      console.error('Error getting datacenters:', error);
      return [];
    }
  });

  ipcMain.handle('add-datacenter', async (event, id: string, name: string) => {
    try {
      addDatacenter(id, name);
      return { success: true };
    } catch (error) {
      console.error('Error adding datacenter:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('update-datacenter', async (event, id: string, name: string) => {
    try {
      updateDatacenter(id, name);
      return { success: true };
    } catch (error) {
      console.error('Error updating datacenter:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('delete-datacenter', async (event, id: string) => {
    try {
      deleteDatacenter(id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting datacenter:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}
