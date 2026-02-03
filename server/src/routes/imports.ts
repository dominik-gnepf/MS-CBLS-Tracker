import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import * as db from '../services/database';
import { parseCSVContent } from '../services/csvParser';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.csv') {
      cb(new Error('Only CSV files are allowed'));
      return;
    }
    cb(null, true);
  },
});

// POST /api/imports - Import CSV file
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const datacenter = req.body.datacenter || '';

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    console.log(`Starting CSV import for: ${file.originalname} into datacenter: ${datacenter || 'all'}`);

    // Parse CSV content
    const content = file.buffer.toString('utf-8');
    const cables = await parseCSVContent(content);

    if (cables.length === 0) {
      return res.json({
        success: false,
        error: 'No valid records found in CSV. Make sure the file has MSF and Item Name columns.',
      });
    }

    const filename = file.originalname;

    // Run import in a transaction
    const result = await db.runInTransaction(async (client) => {
      // Reset all existing inventory to 0 before importing for this datacenter
      const resetCount = await db.resetAllInventory(filename, datacenter);
      console.log(`Reset ${resetCount} existing products to 0 quantity for datacenter: ${datacenter || 'all'}`);

      console.log(`Importing ${cables.length} cables from CSV...`);

      let newProducts = 0;
      let updatedProducts = 0;

      for (const cable of cables) {
        const existing = await db.getProduct(cable.msf);

        if (!existing) {
          newProducts++;
        } else {
          updatedProducts++;
        }

        // Upsert product
        await db.upsertProduct({
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
        await db.insertInventory(cable.msf, cable.quantity, filename, datacenter);
      }

      // Record import history
      await db.recordImport(filename, cables.length, newProducts, updatedProducts);

      return { newProducts, updatedProducts };
    });

    console.log(`Import complete: ${cables.length} records, ${result.newProducts} new, ${result.updatedProducts} updated`);

    res.json({
      success: true,
      recordsProcessed: cables.length,
      newProducts: result.newProducts,
      updatedProducts: result.updatedProducts,
    });
  } catch (error) {
    console.error('Error importing CSV:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/imports/history - Get import history
router.get('/history', async (req, res) => {
  try {
    const history = await db.getImportHistory();
    res.json(history);
  } catch (error) {
    console.error('Error getting import history:', error);
    res.status(500).json({ error: 'Failed to get import history' });
  }
});

export default router;
