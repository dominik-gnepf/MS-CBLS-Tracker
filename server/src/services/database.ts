import { Pool, PoolClient } from 'pg';
import path from 'path';
import fs from 'fs';
import {
  Product,
  Inventory,
  Datacenter,
  ImportHistory,
  Link,
  MsfConfig,
  AppSettings,
} from '../types';

let pool: Pool | null = null;

// Data directory for settings file (fallback)
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

// Database connection URL
const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://ms_tracker:ms_tracker_secret@localhost:5432/ms_tracker_db';

function getSettingsPath(): string {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  return path.join(DATA_DIR, 'settings.json');
}

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  lowStockThreshold: 20,
  criticalStockThreshold: 10,
  categories: [
    { name: '400G AOC', color: 'blue', order: 0 },
    { name: '400G PSM', color: 'purple', order: 1 },
    { name: '100G AOC', color: 'green', order: 2 },
    { name: '100G PSM4', color: 'teal', order: 3 },
    { name: 'SMLC', color: 'yellow', order: 4 },
    { name: 'Copper', color: 'orange', order: 5 },
    { name: '200G Y AOC', color: 'pink', order: 6 },
    { name: 'MTP Fiber', color: 'indigo', order: 7 },
    { name: 'Fiber Jumpers', color: 'cyan', order: 8 },
    { name: 'Transceiver', color: 'red', order: 9 },
    { name: 'Other', color: 'gray', order: 10 },
  ],
};

export function loadSettings(): AppSettings {
  const settingsPath = getSettingsPath();
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(data);
      return { ...DEFAULT_SETTINGS, ...settings };
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: AppSettings): void {
  const settingsPath = getSettingsPath();
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
}

export async function initDatabase(): Promise<void> {
  console.log(`Connecting to PostgreSQL at: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);

  pool = new Pool({
    connectionString: DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  // Test connection
  try {
    const client = await pool.connect();
    console.log('PostgreSQL connected successfully');
    client.release();
  } catch (error) {
    console.error('Failed to connect to PostgreSQL:', error);
    throw error;
  }

  // Create tables if they don't exist (for backwards compatibility)
  await createTables();
  console.log('Database initialized successfully');
}

async function createTables(): Promise<void> {
  const client = await getPool().connect();
  try {
    // Create msf_information table (maps to products)
    await client.query(`
      CREATE TABLE IF NOT EXISTS msf_information (
        msf VARCHAR(50) PRIMARY KEY,
        item_name VARCHAR(500) NOT NULL,
        item_group VARCHAR(100),
        category VARCHAR(100),
        cable_type VARCHAR(50),
        cable_length VARCHAR(20),
        cable_length_value DECIMAL(10,2),
        cable_length_unit VARCHAR(10),
        speed VARCHAR(20),
        connector_type VARCHAR(50),
        location VARCHAR(100),
        datacenter VARCHAR(50),
        metadata JSONB,
        short_name VARCHAR(100),
        category_override VARCHAR(100),
        notes TEXT,
        hidden BOOLEAN DEFAULT FALSE,
        custom_order INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create dc_stock_count table (maps to inventory)
    await client.query(`
      CREATE TABLE IF NOT EXISTS dc_stock_count (
        id SERIAL PRIMARY KEY,
        msf VARCHAR(50) NOT NULL REFERENCES msf_information(msf) ON DELETE CASCADE,
        datacenter VARCHAR(50) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        import_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        source_file VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create datacenters table
    await client.query(`
      CREATE TABLE IF NOT EXISTS datacenters (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create import_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS import_history (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        datacenter VARCHAR(50),
        records_processed INTEGER DEFAULT 0,
        new_products INTEGER DEFAULT 0,
        updated_products INTEGER DEFAULT 0,
        import_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create links table
    await client.query(`
      CREATE TABLE IF NOT EXISTS links (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        url VARCHAR(500) NOT NULL,
        description TEXT,
        starred BOOLEAN DEFAULT FALSE,
        category VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_msf_info_category ON msf_information(category)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_msf_info_cable_type ON msf_information(cable_type)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_dc_stock_msf ON dc_stock_count(msf)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_dc_stock_datacenter ON dc_stock_count(datacenter)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_dc_stock_import_date ON dc_stock_count(import_date DESC)');

  } finally {
    client.release();
  }
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database not initialized');
  }
  return pool;
}

// Product operations
export async function getProduct(msf: string): Promise<Product | undefined> {
  const result = await getPool().query(
    'SELECT * FROM msf_information WHERE msf = $1',
    [msf]
  );
  return mapRowToProduct(result.rows[0]);
}

export async function getAllProducts(): Promise<Product[]> {
  const result = await getPool().query(
    'SELECT * FROM msf_information ORDER BY category, cable_length_value'
  );
  return result.rows.map(row => mapRowToProduct(row)!);
}

function mapRowToProduct(row: any): Product | undefined {
  if (!row) return undefined;
  return {
    msf: row.msf,
    item_name: row.item_name,
    item_group: row.item_group,
    category: row.category,
    cable_type: row.cable_type,
    cable_length: row.cable_length,
    cable_length_value: row.cable_length_value ? parseFloat(row.cable_length_value) : null,
    cable_length_unit: row.cable_length_unit,
    speed: row.speed,
    connector_type: row.connector_type,
    location: row.location,
    datacenter: row.datacenter,
    metadata: row.metadata,
    created_at: row.created_at?.toISOString() || '',
    updated_at: row.updated_at?.toISOString() || '',
  };
}

export async function upsertProduct(product: Partial<Product>): Promise<void> {
  const existing = await getProduct(product.msf!);

  if (existing) {
    await getPool().query(`
      UPDATE msf_information SET
        item_name = $1,
        item_group = $2,
        category = COALESCE($3, category),
        cable_type = COALESCE($4, cable_type),
        cable_length = COALESCE($5, cable_length),
        cable_length_value = COALESCE($6, cable_length_value),
        cable_length_unit = COALESCE($7, cable_length_unit),
        speed = COALESCE($8, speed),
        connector_type = COALESCE($9, connector_type),
        location = $10,
        datacenter = $11,
        updated_at = CURRENT_TIMESTAMP
      WHERE msf = $12
    `, [
      product.item_name,
      product.item_group || null,
      product.category || null,
      product.cable_type || null,
      product.cable_length || null,
      product.cable_length_value || null,
      product.cable_length_unit || null,
      product.speed || null,
      product.connector_type || null,
      product.location || null,
      product.datacenter || null,
      product.msf
    ]);
  } else {
    await getPool().query(`
      INSERT INTO msf_information (msf, item_name, item_group, category, cable_type, cable_length,
        cable_length_value, cable_length_unit, speed, connector_type, location, datacenter, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      product.msf,
      product.item_name,
      product.item_group || null,
      product.category || null,
      product.cable_type || null,
      product.cable_length || null,
      product.cable_length_value || null,
      product.cable_length_unit || null,
      product.speed || null,
      product.connector_type || null,
      product.location || null,
      product.datacenter || null,
      product.metadata || null
    ]);
  }
}

export async function updateProductCategory(msf: string, category: string): Promise<void> {
  await getPool().query(
    'UPDATE msf_information SET category = $1, updated_at = CURRENT_TIMESTAMP WHERE msf = $2',
    [category, msf]
  );
}

// Inventory operations
export async function getLatestInventory(datacenter?: string): Promise<Array<Product & { quantity: number }>> {
  let query: string;
  let params: string[];

  if (datacenter) {
    query = `
      SELECT m.*, COALESCE(
        (SELECT quantity FROM dc_stock_count WHERE msf = m.msf AND datacenter = $1 ORDER BY import_date DESC LIMIT 1),
        0
      ) as quantity
      FROM msf_information m
      ORDER BY m.category, m.cable_length_value
    `;
    params = [datacenter];
  } else {
    query = `
      SELECT m.*, COALESCE(
        (SELECT quantity FROM dc_stock_count WHERE msf = m.msf ORDER BY import_date DESC LIMIT 1),
        0
      ) as quantity
      FROM msf_information m
      ORDER BY m.category, m.cable_length_value
    `;
    params = [];
  }

  const result = await getPool().query(query, params);
  return result.rows.map(row => ({
    ...mapRowToProduct(row)!,
    quantity: parseInt(row.quantity) || 0
  }));
}

export async function getInventoryByCategory(datacenter?: string): Promise<Record<string, Array<Product & { quantity: number }>>> {
  const inventory = await getLatestInventory(datacenter);
  const grouped: Record<string, Array<Product & { quantity: number }>> = {};

  for (const item of inventory) {
    const category = item.category || 'Uncategorized';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(item);
  }

  return grouped;
}

export async function insertInventory(msf: string, quantity: number, sourceFile: string, datacenter: string = ''): Promise<void> {
  await getPool().query(
    'INSERT INTO dc_stock_count (msf, quantity, source_file, import_date, datacenter) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)',
    [msf, quantity, sourceFile, datacenter]
  );
}

export async function resetAllInventory(sourceFile: string, datacenter: string = ''): Promise<number> {
  const products = await getAllProducts();
  let resetCount = 0;

  for (const product of products) {
    await getPool().query(
      'INSERT INTO dc_stock_count (msf, quantity, source_file, import_date, datacenter) VALUES ($1, 0, $2, CURRENT_TIMESTAMP, $3)',
      [product.msf, sourceFile + ' (reset)', datacenter]
    );
    resetCount++;
  }

  return resetCount;
}

export async function getInventoryHistory(msf: string, datacenter?: string): Promise<Inventory[]> {
  let result;
  if (datacenter) {
    result = await getPool().query(
      'SELECT * FROM dc_stock_count WHERE msf = $1 AND datacenter = $2 ORDER BY import_date DESC',
      [msf, datacenter]
    );
  } else {
    result = await getPool().query(
      'SELECT * FROM dc_stock_count WHERE msf = $1 ORDER BY import_date DESC',
      [msf]
    );
  }
  return result.rows.map(row => ({
    id: row.id,
    msf: row.msf,
    quantity: row.quantity,
    datacenter: row.datacenter,
    import_date: row.import_date?.toISOString() || '',
    source_file: row.source_file
  }));
}

// Import history operations
export async function recordImport(filename: string, recordsProcessed: number, newProducts: number, updatedProducts: number): Promise<number> {
  const result = await getPool().query(`
    INSERT INTO import_history (filename, records_processed, new_products, updated_products)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `, [filename, recordsProcessed, newProducts, updatedProducts]);
  return result.rows[0].id;
}

export async function getImportHistory(): Promise<ImportHistory[]> {
  const result = await getPool().query('SELECT * FROM import_history ORDER BY import_date DESC LIMIT 50');
  return result.rows.map(row => ({
    id: row.id,
    filename: row.filename,
    import_date: row.import_date?.toISOString() || '',
    records_processed: row.records_processed,
    new_products: row.new_products,
    updated_products: row.updated_products
  }));
}

// Search
export async function searchProducts(query: string): Promise<Array<Product & { quantity: number }>> {
  const searchTerm = `%${query}%`;
  const result = await getPool().query(`
    SELECT m.*, COALESCE(
      (SELECT quantity FROM dc_stock_count WHERE msf = m.msf ORDER BY import_date DESC LIMIT 1),
      0
    ) as quantity
    FROM msf_information m
    WHERE m.msf ILIKE $1 OR m.item_name ILIKE $1 OR m.category ILIKE $1
    ORDER BY m.category, m.cable_length_value
  `, [searchTerm]);
  return result.rows.map(row => ({
    ...mapRowToProduct(row)!,
    quantity: parseInt(row.quantity) || 0
  }));
}

// Delete all data
export async function deleteAllData(): Promise<{ productsDeleted: number; inventoryDeleted: number; importsDeleted: number }> {
  const productCount = (await getPool().query('SELECT COUNT(*) as count FROM msf_information')).rows[0].count;
  const inventoryCount = (await getPool().query('SELECT COUNT(*) as count FROM dc_stock_count')).rows[0].count;
  const importCount = (await getPool().query('SELECT COUNT(*) as count FROM import_history')).rows[0].count;

  await getPool().query('DELETE FROM dc_stock_count');
  await getPool().query('DELETE FROM import_history');
  await getPool().query('DELETE FROM msf_information');

  return {
    productsDeleted: parseInt(productCount),
    inventoryDeleted: parseInt(inventoryCount),
    importsDeleted: parseInt(importCount),
  };
}

// MSF Configuration operations (now part of msf_information table)
export async function getMsfConfig(msf: string): Promise<MsfConfig | undefined> {
  const result = await getPool().query(
    'SELECT msf, short_name, category_override, notes, hidden, custom_order, created_at, updated_at FROM msf_information WHERE msf = $1',
    [msf]
  );
  const row = result.rows[0];
  if (!row) return undefined;
  return {
    msf: row.msf,
    short_name: row.short_name,
    category_override: row.category_override,
    notes: row.notes,
    hidden: row.hidden ? 1 : 0,
    custom_order: row.custom_order,
    created_at: row.created_at?.toISOString() || '',
    updated_at: row.updated_at?.toISOString() || ''
  };
}

export async function getAllMsfConfigs(): Promise<MsfConfig[]> {
  const result = await getPool().query(
    'SELECT msf, short_name, category_override, notes, hidden, custom_order, created_at, updated_at FROM msf_information WHERE short_name IS NOT NULL OR category_override IS NOT NULL OR notes IS NOT NULL OR hidden = true OR custom_order IS NOT NULL ORDER BY msf'
  );
  return result.rows.map(row => ({
    msf: row.msf,
    short_name: row.short_name,
    category_override: row.category_override,
    notes: row.notes,
    hidden: row.hidden ? 1 : 0,
    custom_order: row.custom_order,
    created_at: row.created_at?.toISOString() || '',
    updated_at: row.updated_at?.toISOString() || ''
  }));
}

export async function upsertMsfConfig(config: Partial<MsfConfig>): Promise<void> {
  const existing = await getProduct(config.msf!);

  if (existing) {
    await getPool().query(`
      UPDATE msf_information SET
        short_name = COALESCE($1, short_name),
        category_override = COALESCE($2, category_override),
        notes = COALESCE($3, notes),
        hidden = COALESCE($4, hidden),
        custom_order = COALESCE($5, custom_order),
        updated_at = CURRENT_TIMESTAMP
      WHERE msf = $6
    `, [
      config.short_name,
      config.category_override,
      config.notes,
      config.hidden ? true : false,
      config.custom_order,
      config.msf
    ]);
  }
  // If product doesn't exist, we can't add config (MSF must exist first)
}

export async function deleteMsfConfig(msf: string): Promise<void> {
  await getPool().query(`
    UPDATE msf_information SET
      short_name = NULL,
      category_override = NULL,
      notes = NULL,
      hidden = FALSE,
      custom_order = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE msf = $1
  `, [msf]);
}

interface ProductWithConfigRow extends Product {
  quantity: number;
  config_short_name: string | null;
  config_category_override: string | null;
  config_notes: string | null;
  config_hidden: boolean | null;
  config_custom_order: number | null;
}

export async function getProductsWithConfig(): Promise<Array<Product & { quantity: number; config: MsfConfig | null }>> {
  const result = await getPool().query(`
    SELECT
      m.*,
      COALESCE(
        (SELECT quantity FROM dc_stock_count WHERE msf = m.msf ORDER BY import_date DESC LIMIT 1),
        0
      ) as quantity
    FROM msf_information m
    ORDER BY m.category, m.cable_length_value
  `);

  return result.rows.map(row => {
    const hasConfig = row.short_name !== null ||
                      row.category_override !== null ||
                      row.notes !== null ||
                      row.hidden === true ||
                      row.custom_order !== null;

    return {
      ...mapRowToProduct(row)!,
      quantity: parseInt(row.quantity) || 0,
      config: hasConfig ? {
        msf: row.msf,
        short_name: row.short_name,
        category_override: row.category_override,
        notes: row.notes,
        hidden: row.hidden ? 1 : 0,
        custom_order: row.custom_order,
        created_at: '',
        updated_at: '',
      } : null,
    };
  });
}

// Datacenter operations
export async function getAllDatacenters(): Promise<Datacenter[]> {
  const result = await getPool().query('SELECT * FROM datacenters ORDER BY name');
  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    created_at: row.created_at?.toISOString() || ''
  }));
}

export async function getDatacenter(id: string): Promise<Datacenter | undefined> {
  const result = await getPool().query('SELECT * FROM datacenters WHERE id = $1', [id]);
  const row = result.rows[0];
  if (!row) return undefined;
  return {
    id: row.id,
    name: row.name,
    created_at: row.created_at?.toISOString() || ''
  };
}

export async function addDatacenter(id: string, name: string): Promise<void> {
  await getPool().query(
    'INSERT INTO datacenters (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = $2',
    [id, name]
  );
}

export async function deleteDatacenter(id: string): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM dc_stock_count WHERE datacenter = $1', [id]);
    await client.query('DELETE FROM datacenters WHERE id = $1', [id]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateDatacenter(id: string, name: string): Promise<void> {
  await getPool().query('UPDATE datacenters SET name = $1 WHERE id = $2', [name, id]);
}

// Link operations
export async function getAllLinks(): Promise<Link[]> {
  const result = await getPool().query('SELECT * FROM links ORDER BY starred DESC, title');
  return result.rows.map(row => ({
    id: row.id,
    title: row.title,
    url: row.url,
    description: row.description,
    starred: row.starred ? 1 : 0,
    category: row.category,
    created_at: row.created_at?.toISOString() || '',
    updated_at: row.updated_at?.toISOString() || ''
  }));
}

export async function getStarredLinks(): Promise<Link[]> {
  const result = await getPool().query('SELECT * FROM links WHERE starred = true ORDER BY title');
  return result.rows.map(row => ({
    id: row.id,
    title: row.title,
    url: row.url,
    description: row.description,
    starred: row.starred ? 1 : 0,
    category: row.category,
    created_at: row.created_at?.toISOString() || '',
    updated_at: row.updated_at?.toISOString() || ''
  }));
}

export async function getLink(id: number): Promise<Link | undefined> {
  const result = await getPool().query('SELECT * FROM links WHERE id = $1', [id]);
  const row = result.rows[0];
  if (!row) return undefined;
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    description: row.description,
    starred: row.starred ? 1 : 0,
    category: row.category,
    created_at: row.created_at?.toISOString() || '',
    updated_at: row.updated_at?.toISOString() || ''
  };
}

export async function addLink(title: string, url: string, description?: string, category?: string): Promise<number> {
  const result = await getPool().query(
    'INSERT INTO links (title, url, description, category) VALUES ($1, $2, $3, $4) RETURNING id',
    [title, url, description || null, category || null]
  );
  return result.rows[0].id;
}

export async function updateLink(id: number, title: string, url: string, description?: string, category?: string): Promise<void> {
  await getPool().query(
    'UPDATE links SET title = $1, url = $2, description = $3, category = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5',
    [title, url, description || null, category || null, id]
  );
}

export async function toggleLinkStar(id: number): Promise<void> {
  await getPool().query('UPDATE links SET starred = NOT starred, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
}

export async function deleteLink(id: number): Promise<void> {
  await getPool().query('DELETE FROM links WHERE id = $1', [id]);
}

// Transaction helper for imports
export async function runInTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Graceful shutdown
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database connection closed');
  }
}
