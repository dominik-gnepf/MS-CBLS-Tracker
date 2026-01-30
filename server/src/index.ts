import app from './app';
import { initDatabase } from './services/database';

const PORT = process.env.PORT || 3000;

// Initialize database
console.log('Initializing database...');
initDatabase();

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
  console.log(`Health check at http://localhost:${PORT}/api/health`);
});
