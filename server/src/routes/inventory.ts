import { Router } from 'express';
import * as db from '../services/database';

const router = Router();

// GET /api/inventory - Get inventory grouped by category
router.get('/', async (req, res) => {
  try {
    const datacenter = req.query.datacenter as string | undefined;
    const inventory = await db.getInventoryByCategory(datacenter);
    res.json(inventory);
  } catch (error) {
    console.error('Error getting inventory:', error);
    res.status(500).json({ error: 'Failed to get inventory' });
  }
});

export default router;
