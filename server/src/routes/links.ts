import { Router } from 'express';
import * as db from '../services/database';

const router = Router();

// GET /api/links - Get all links
router.get('/', (req, res) => {
  try {
    const links = db.getAllLinks();
    res.json(links);
  } catch (error) {
    console.error('Error getting links:', error);
    res.status(500).json({ error: 'Failed to get links' });
  }
});

// GET /api/links/starred - Get starred links
router.get('/starred', (req, res) => {
  try {
    const links = db.getStarredLinks();
    res.json(links);
  } catch (error) {
    console.error('Error getting starred links:', error);
    res.status(500).json({ error: 'Failed to get starred links' });
  }
});

// POST /api/links - Add link
router.post('/', (req, res) => {
  try {
    const { title, url, description, category } = req.body;
    if (!title || !url) {
      return res.status(400).json({ success: false, error: 'Title and URL are required' });
    }
    const id = db.addLink(title, url, description, category);
    res.json({ success: true, id });
  } catch (error) {
    console.error('Error adding link:', error);
    res.status(500).json({ success: false, error: 'Failed to add link' });
  }
});

// PUT /api/links/:id - Update link
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, url, description, category } = req.body;
    if (!title || !url) {
      return res.status(400).json({ success: false, error: 'Title and URL are required' });
    }
    db.updateLink(parseInt(id), title, url, description, category);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating link:', error);
    res.status(500).json({ success: false, error: 'Failed to update link' });
  }
});

// PATCH /api/links/:id/star - Toggle link star
router.patch('/:id/star', (req, res) => {
  try {
    const { id } = req.params;
    db.toggleLinkStar(parseInt(id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error toggling link star:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle star' });
  }
});

// DELETE /api/links/:id - Delete link
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.deleteLink(parseInt(id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting link:', error);
    res.status(500).json({ success: false, error: 'Failed to delete link' });
  }
});

export default router;
