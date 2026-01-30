import { Router } from 'express';
import * as db from '../services/database';

const router = Router();

// GET /api/settings - Get settings
router.get('/', (req, res) => {
  try {
    const settings = db.loadSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// PUT /api/settings - Save settings
router.put('/', (req, res) => {
  try {
    const settings = req.body;
    db.saveSettings(settings);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ success: false, error: 'Failed to save settings' });
  }
});

// GET /api/settings/categories - Get category names
router.get('/categories', (req, res) => {
  try {
    const settings = db.loadSettings();
    const categories = settings.categories
      .sort((a, b) => a.order - b.order)
      .map(c => c.name);
    res.json(categories);
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

export default router;
