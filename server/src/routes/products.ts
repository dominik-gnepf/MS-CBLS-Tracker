import { Router } from 'express';
import * as db from '../services/database';

const router = Router();

// GET /api/products - Get all products
router.get('/', (req, res) => {
  try {
    const datacenter = req.query.datacenter as string | undefined;
    const products = db.getLatestInventory(datacenter);
    res.json(products);
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
});

// GET /api/products/search - Search products
router.get('/search', (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.json([]);
    }
    const products = db.searchProducts(query);
    res.json(products);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Failed to search products' });
  }
});

// GET /api/products/with-config - Get products with config
router.get('/with-config', (req, res) => {
  try {
    const products = db.getProductsWithConfig();
    res.json(products);
  } catch (error) {
    console.error('Error getting products with config:', error);
    res.status(500).json({ error: 'Failed to get products with config' });
  }
});

// GET /api/products/:msf - Get product details
router.get('/:msf', (req, res) => {
  try {
    const { msf } = req.params;
    const datacenter = req.query.datacenter as string | undefined;
    const product = db.getProduct(msf);
    const history = db.getInventoryHistory(msf, datacenter);
    res.json({ product: product || null, history });
  } catch (error) {
    console.error('Error getting product details:', error);
    res.status(500).json({ error: 'Failed to get product details' });
  }
});

// PATCH /api/products/:msf/category - Update product category
router.patch('/:msf/category', (req, res) => {
  try {
    const { msf } = req.params;
    const { category } = req.body;
    if (!category) {
      return res.status(400).json({ success: false, error: 'Category is required' });
    }
    db.updateProductCategory(msf, category);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ success: false, error: 'Failed to update category' });
  }
});

export default router;
