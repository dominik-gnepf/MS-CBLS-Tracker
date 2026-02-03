import { Router } from 'express';
import * as db from '../services/database';

const router = Router();

// GET /api/msf-configs - Get all MSF configs
router.get('/', async (req, res) => {
  try {
    const configs = await db.getAllMsfConfigs();
    res.json(configs);
  } catch (error) {
    console.error('Error getting MSF configs:', error);
    res.status(500).json({ error: 'Failed to get MSF configs' });
  }
});

// GET /api/msf-configs/:msf - Get MSF config
router.get('/:msf', async (req, res) => {
  try {
    const { msf } = req.params;
    const config = await db.getMsfConfig(msf);
    res.json(config || null);
  } catch (error) {
    console.error('Error getting MSF config:', error);
    res.status(500).json({ error: 'Failed to get MSF config' });
  }
});

// PUT /api/msf-configs/:msf - Save MSF config
router.put('/:msf', async (req, res) => {
  try {
    const { msf } = req.params;
    const config = { ...req.body, msf };
    await db.upsertMsfConfig(config);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving MSF config:', error);
    res.status(500).json({ success: false, error: 'Failed to save MSF config' });
  }
});

// DELETE /api/msf-configs/:msf - Delete MSF config
router.delete('/:msf', async (req, res) => {
  try {
    const { msf } = req.params;
    await db.deleteMsfConfig(msf);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting MSF config:', error);
    res.status(500).json({ success: false, error: 'Failed to delete MSF config' });
  }
});

export default router;
