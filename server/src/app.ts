import express from 'express';
import cors from 'cors';
import path from 'path';
import * as db from './services/database';

// Import routes
import inventoryRoutes from './routes/inventory';
import productsRoutes from './routes/products';
import importsRoutes from './routes/imports';
import settingsRoutes from './routes/settings';
import datacentersRoutes from './routes/datacenters';
import linksRoutes from './routes/links';
import msfConfigRoutes from './routes/msfConfig';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/inventory', inventoryRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/imports', importsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/datacenters', datacentersRoutes);
app.use('/api/links', linksRoutes);
app.use('/api/msf-configs', msfConfigRoutes);

// DELETE /api/data - Delete all data
app.delete('/api/data', (req, res) => {
  try {
    const result = db.deleteAllData();
    console.log(`Deleted all data: ${result.productsDeleted} products, ${result.inventoryDeleted} inventory records, ${result.importsDeleted} import records`);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error deleting all data:', error);
    res.status(500).json({ success: false, error: 'Failed to delete data' });
  }
});

// Serve static files from the frontend build
const staticPath = process.env.STATIC_PATH || path.join(__dirname, '../../dist/renderer');
app.use(express.static(staticPath));

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

export default app;
