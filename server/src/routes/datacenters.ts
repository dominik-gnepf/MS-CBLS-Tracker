import { Router } from 'express';
import * as db from '../services/database';

const router = Router();

// GET /api/datacenters - Get all datacenters
router.get('/', async (req, res) => {
  try {
    const datacenters = await db.getAllDatacenters();
    res.json(datacenters);
  } catch (error) {
    console.error('Error getting datacenters:', error);
    res.status(500).json({ error: 'Failed to get datacenters' });
  }
});

// POST /api/datacenters - Add datacenter
router.post('/', async (req, res) => {
  try {
    const { id, name } = req.body;
    if (!id || !name) {
      return res.status(400).json({ success: false, error: 'ID and name are required' });
    }
    await db.addDatacenter(id, name);
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding datacenter:', error);
    res.status(500).json({ success: false, error: 'Failed to add datacenter' });
  }
});

// PUT /api/datacenters/:id - Update datacenter
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }
    await db.updateDatacenter(id, name);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating datacenter:', error);
    res.status(500).json({ success: false, error: 'Failed to update datacenter' });
  }
});

// DELETE /api/datacenters/:id - Delete datacenter
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteDatacenter(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting datacenter:', error);
    res.status(500).json({ success: false, error: 'Failed to delete datacenter' });
  }
});

export default router;
