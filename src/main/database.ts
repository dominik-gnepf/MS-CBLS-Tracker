import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

let db: SqlJsDatabase | null = null;
let dbPath: string = '';

// Settings file path
function getSettingsPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'settings.json');
}

// Default settings
const DEFAULT_SETTINGS = {
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

export interface AppSettings {
  lowStockThreshold: number;
  criticalStockThreshold: number;
  categories: Array<{ name: string; color: string; order: number }>;
}

export function loadSettings(): AppSettings {
  const settingsPath = getSettingsPath();
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(data);
      // Merge with defaults to ensure all properties exist
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

// Get the path to the sql.js WASM file
function getWasmPath(): string {
  const isDev = !app.isPackaged;

  if (isDev) {
    // In development, use the WASM file from node_modules
    return path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
  } else {
    // In production, the WASM file should be in the app resources
    return path.join(process.resourcesPath, 'sql-wasm.wasm');
  }
}

export function getDbPath(): string {
  const userDataPath = app.getPath('userData');
  const dataDir = path.join(userDataPath, 'data');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  return path.join(dataDir, 'inventory.db');
}

export async function initDatabase(): Promise<void> {
  const wasmPath = getWasmPath();

  // Initialize sql.js with the WASM binary
  const SQL = await initSqlJs({
    locateFile: () => wasmPath,
  });

  dbPath = getDbPath();

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    -- Products table: stores cable mappings
    CREATE TABLE IF NOT EXISTS products (
      msf TEXT PRIMARY KEY,
      item_name TEXT NOT NULL,
      item_group TEXT,
      category TEXT,
      cable_type TEXT,
      cable_length TEXT,
      cable_length_value REAL,
      cable_length_unit TEXT,
      speed TEXT,
      connector_type TEXT,
      location TEXT,
      datacenter TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      msf TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      datacenter TEXT NOT NULL DEFAULT '',
      import_date TEXT DEFAULT CURRENT_TIMESTAMP,
      source_file TEXT,
      FOREIGN KEY (msf) REFERENCES products(msf)
    )
  `);

  // Datacenters table for managing available datacenters
  db.run(`
    CREATE TABLE IF NOT EXISTS datacenters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add datacenter column to existing inventory table if it doesn't exist
  try {
    db.run('ALTER TABLE inventory ADD COLUMN datacenter TEXT NOT NULL DEFAULT ""');
  } catch (e) {
    // Column already exists, ignore
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS import_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      import_date TEXT DEFAULT CURRENT_TIMESTAMP,
      records_processed INTEGER,
      new_products INTEGER,
      updated_products INTEGER
    )
  `);

  // Create indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_products_item_group ON products(item_group)');
  db.run('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)');
  db.run('CREATE INDEX IF NOT EXISTS idx_products_cable_type ON products(cable_type)');
  db.run('CREATE INDEX IF NOT EXISTS idx_inventory_msf ON inventory(msf)');
  db.run('CREATE INDEX IF NOT EXISTS idx_inventory_datacenter ON inventory(datacenter)');

  // Links table for storing important links
  db.run(`
    CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT,
      starred INTEGER DEFAULT 0,
      category TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // MSF Configuration table for manual overrides
  db.run(`
    CREATE TABLE IF NOT EXISTS msf_config (
      msf TEXT PRIMARY KEY,
      short_name TEXT,
      category_override TEXT,
      notes TEXT,
      hidden INTEGER DEFAULT 0,
      custom_order INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Save to disk
  saveDatabase();
}

export function saveDatabase(): void {
  if (!db || !dbPath) return;

  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

export function getDb(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export interface Product {
  msf: string;
  item_name: string;
  item_group: string | null;
  category: string | null;
  cable_type: string | null;
  cable_length: string | null;
  cable_length_value: number | null;
  cable_length_unit: string | null;
  speed: string | null;
  connector_type: string | null;
  location: string | null;
  datacenter: string | null;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

export interface Inventory {
  id: number;
  msf: string;
  quantity: number;
  datacenter: string;
  import_date: string;
  source_file: string | null;
}

export interface Datacenter {
  id: string;
  name: string;
  created_at: string;
}

export interface ImportHistory {
  id: number;
  filename: string;
  import_date: string;
  records_processed: number;
  new_products: number;
  updated_products: number;
}

function rowToObject<T>(columns: string[], values: any[]): T {
  const obj: any = {};
  columns.forEach((col, i) => {
    obj[col] = values[i];
  });
  return obj as T;
}

function queryAll<T>(sql: string, params: any[] = []): T[] {
  const stmt = getDb().prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }

  const results: T[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push(row as T);
  }
  stmt.free();
  return results;
}

function queryOne<T>(sql: string, params: any[] = []): T | undefined {
  const results = queryAll<T>(sql, params);
  return results[0];
}

// Flag to control when to save (for batch operations)
let batchMode = false;

export function startBatch(): void {
  batchMode = true;
}

export function endBatch(): void {
  batchMode = false;
  saveDatabase();
}

function run(sql: string, params: any[] = []): void {
  getDb().run(sql, params);
  if (!batchMode) {
    saveDatabase();
  }
}

// Product operations
export function getProduct(msf: string): Product | undefined {
  return queryOne<Product>('SELECT * FROM products WHERE msf = ?', [msf]);
}

export function getAllProducts(): Product[] {
  return queryAll<Product>('SELECT * FROM products ORDER BY category, cable_length_value');
}

export function upsertProduct(product: Partial<Product>): void {
  const existing = getProduct(product.msf!);

  if (existing) {
    run(`
      UPDATE products SET
        item_name = ?,
        item_group = ?,
        category = COALESCE(?, category),
        cable_type = COALESCE(?, cable_type),
        cable_length = COALESCE(?, cable_length),
        cable_length_value = COALESCE(?, cable_length_value),
        cable_length_unit = COALESCE(?, cable_length_unit),
        speed = COALESCE(?, speed),
        connector_type = COALESCE(?, connector_type),
        location = ?,
        datacenter = ?,
        updated_at = datetime('now')
      WHERE msf = ?
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
      product.msf,
    ]);
  } else {
    run(`
      INSERT INTO products (msf, item_name, item_group, category, cable_type, cable_length,
        cable_length_value, cable_length_unit, speed, connector_type, location, datacenter, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      product.metadata || null,
    ]);
  }
}

export function updateProductCategory(msf: string, category: string): void {
  run(`UPDATE products SET category = ?, updated_at = datetime('now') WHERE msf = ?`, [category, msf]);
}

// Inventory operations
export function getLatestInventory(datacenter?: string): Array<Product & { quantity: number }> {
  if (datacenter) {
    return queryAll<Product & { quantity: number }>(`
      SELECT p.*, COALESCE(
        (SELECT quantity FROM inventory WHERE msf = p.msf AND datacenter = ? ORDER BY import_date DESC LIMIT 1),
        0
      ) as quantity
      FROM products p
      ORDER BY p.category, p.cable_length_value
    `, [datacenter]);
  }
  return queryAll<Product & { quantity: number }>(`
    SELECT p.*, COALESCE(
      (SELECT quantity FROM inventory WHERE msf = p.msf ORDER BY import_date DESC LIMIT 1),
      0
    ) as quantity
    FROM products p
    ORDER BY p.category, p.cable_length_value
  `);
}

export function getInventoryByCategory(datacenter?: string): Record<string, Array<Product & { quantity: number }>> {
  const inventory = getLatestInventory(datacenter);
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

export function insertInventory(msf: string, quantity: number, sourceFile: string, datacenter: string = ''): void {
  // Use JavaScript timestamp for more precise ordering
  const timestamp = new Date().toISOString();
  run(`INSERT INTO inventory (msf, quantity, source_file, import_date, datacenter) VALUES (?, ?, ?, ?, ?)`, [msf, quantity, sourceFile, timestamp, datacenter]);
}

// Reset all inventory to 0 before a full import for a specific datacenter
// This inserts a 0-quantity record for all existing products in that datacenter
export function resetAllInventory(sourceFile: string, datacenter: string = ''): number {
  const products = getAllProducts();
  let resetCount = 0;
  const timestamp = new Date().toISOString();

  for (const product of products) {
    run(`INSERT INTO inventory (msf, quantity, source_file, import_date, datacenter) VALUES (?, 0, ?, ?, ?)`, [product.msf, sourceFile + ' (reset)', timestamp, datacenter]);
    resetCount++;
  }

  return resetCount;
}

export function getInventoryHistory(msf: string, datacenter?: string): Inventory[] {
  if (datacenter) {
    return queryAll<Inventory>('SELECT * FROM inventory WHERE msf = ? AND datacenter = ? ORDER BY import_date DESC', [msf, datacenter]);
  }
  return queryAll<Inventory>('SELECT * FROM inventory WHERE msf = ? ORDER BY import_date DESC', [msf]);
}

// Import history operations
export function recordImport(filename: string, recordsProcessed: number, newProducts: number, updatedProducts: number): number {
  run(`
    INSERT INTO import_history (filename, records_processed, new_products, updated_products)
    VALUES (?, ?, ?, ?)
  `, [filename, recordsProcessed, newProducts, updatedProducts]);

  const result = queryOne<{ id: number }>('SELECT last_insert_rowid() as id');
  return result?.id || 0;
}

export function getImportHistory(): ImportHistory[] {
  return queryAll<ImportHistory>('SELECT * FROM import_history ORDER BY import_date DESC LIMIT 50');
}

// Search
export function searchProducts(query: string): Array<Product & { quantity: number }> {
  const searchTerm = `%${query}%`;
  return queryAll<Product & { quantity: number }>(`
    SELECT p.*, COALESCE(
      (SELECT quantity FROM inventory WHERE msf = p.msf ORDER BY import_date DESC LIMIT 1),
      0
    ) as quantity
    FROM products p
    WHERE p.msf LIKE ? OR p.item_name LIKE ? OR p.category LIKE ?
    ORDER BY p.category, p.cable_length_value
  `, [searchTerm, searchTerm, searchTerm]);
}

// Delete all data from the database
export function deleteAllData(): { productsDeleted: number; inventoryDeleted: number; importsDeleted: number } {
  const productCount = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM products');
  const inventoryCount = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM inventory');
  const importCount = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM import_history');

  run('DELETE FROM inventory');
  run('DELETE FROM import_history');
  run('DELETE FROM products');

  return {
    productsDeleted: productCount?.count || 0,
    inventoryDeleted: inventoryCount?.count || 0,
    importsDeleted: importCount?.count || 0,
  };
}

// MSF Configuration types and operations
export interface MsfConfig {
  msf: string;
  short_name: string | null;
  category_override: string | null;
  notes: string | null;
  hidden: number;
  custom_order: number | null;
  created_at: string;
  updated_at: string;
}

export function getMsfConfig(msf: string): MsfConfig | undefined {
  return queryOne<MsfConfig>('SELECT * FROM msf_config WHERE msf = ?', [msf]);
}

export function getAllMsfConfigs(): MsfConfig[] {
  return queryAll<MsfConfig>('SELECT * FROM msf_config ORDER BY msf');
}

export function upsertMsfConfig(config: Partial<MsfConfig>): void {
  const existing = getMsfConfig(config.msf!);

  if (existing) {
    run(`
      UPDATE msf_config SET
        short_name = ?,
        category_override = ?,
        notes = ?,
        hidden = ?,
        custom_order = ?,
        updated_at = datetime('now')
      WHERE msf = ?
    `, [
      config.short_name ?? existing.short_name,
      config.category_override ?? existing.category_override,
      config.notes ?? existing.notes,
      config.hidden ?? existing.hidden,
      config.custom_order ?? existing.custom_order,
      config.msf,
    ]);
  } else {
    run(`
      INSERT INTO msf_config (msf, short_name, category_override, notes, hidden, custom_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      config.msf,
      config.short_name || null,
      config.category_override || null,
      config.notes || null,
      config.hidden || 0,
      config.custom_order || null,
    ]);
  }
}

export function deleteMsfConfig(msf: string): void {
  run('DELETE FROM msf_config WHERE msf = ?', [msf]);
}

// Raw row type from the SQL query with joined config columns
interface ProductWithConfigRow extends Product {
  quantity: number;
  config_short_name: string | null;
  config_category_override: string | null;
  config_notes: string | null;
  config_hidden: number | null;
  config_custom_order: number | null;
}

// Get all products with their config overrides applied
export function getProductsWithConfig(): Array<Product & { quantity: number; config: MsfConfig | null }> {
  const rows = queryAll<ProductWithConfigRow>(`
    SELECT 
      p.*,
      COALESCE(
        (SELECT quantity FROM inventory WHERE msf = p.msf ORDER BY import_date DESC LIMIT 1),
        0
      ) as quantity,
      c.short_name as config_short_name,
      c.category_override as config_category_override,
      c.notes as config_notes,
      c.hidden as config_hidden,
      c.custom_order as config_custom_order
    FROM products p
    LEFT JOIN msf_config c ON p.msf = c.msf
    ORDER BY p.category, p.cable_length_value
  `);

  return rows.map(row => {
    const hasConfig = row.config_short_name !== null || 
                      row.config_category_override !== null || 
                      row.config_notes !== null ||
                      row.config_hidden !== null ||
                      row.config_custom_order !== null;

    return {
      msf: row.msf,
      item_name: row.item_name,
      item_group: row.item_group,
      category: row.category,
      cable_type: row.cable_type,
      cable_length: row.cable_length,
      cable_length_value: row.cable_length_value,
      cable_length_unit: row.cable_length_unit,
      speed: row.speed,
      connector_type: row.connector_type,
      location: row.location,
      datacenter: row.datacenter,
      metadata: row.metadata,
      created_at: row.created_at,
      updated_at: row.updated_at,
      quantity: row.quantity,
      config: hasConfig ? {
        msf: row.msf,
        short_name: row.config_short_name,
        category_override: row.config_category_override,
        notes: row.config_notes,
        hidden: row.config_hidden || 0,
        custom_order: row.config_custom_order,
        created_at: '',
        updated_at: '',
      } : null,
    };
  });
}

// Datacenter operations
export function getAllDatacenters(): Datacenter[] {
  return queryAll<Datacenter>('SELECT * FROM datacenters ORDER BY name');
}

export function getDatacenter(id: string): Datacenter | undefined {
  return queryOne<Datacenter>('SELECT * FROM datacenters WHERE id = ?', [id]);
}

export function addDatacenter(id: string, name: string): void {
  run('INSERT OR REPLACE INTO datacenters (id, name) VALUES (?, ?)', [id, name]);
}

export function deleteDatacenter(id: string): void {
  // Delete inventory records for this datacenter
  run('DELETE FROM inventory WHERE datacenter = ?', [id]);
  // Delete the datacenter
  run('DELETE FROM datacenters WHERE id = ?', [id]);
}

export function updateDatacenter(id: string, name: string): void {
  run('UPDATE datacenters SET name = ? WHERE id = ?', [name, id]);
}

// Link types and operations
export interface Link {
  id: number;
  title: string;
  url: string;
  description: string | null;
  starred: number;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export function getAllLinks(): Link[] {
  return queryAll<Link>('SELECT * FROM links ORDER BY starred DESC, title');
}

export function getStarredLinks(): Link[] {
  return queryAll<Link>('SELECT * FROM links WHERE starred = 1 ORDER BY title');
}

export function getLink(id: number): Link | undefined {
  return queryOne<Link>('SELECT * FROM links WHERE id = ?', [id]);
}

export function addLink(title: string, url: string, description?: string, category?: string): number {
  run('INSERT INTO links (title, url, description, category) VALUES (?, ?, ?, ?)', [
    title,
    url,
    description || null,
    category || null,
  ]);
  const result = queryOne<{ id: number }>('SELECT last_insert_rowid() as id');
  return result?.id || 0;
}

export function updateLink(id: number, title: string, url: string, description?: string, category?: string): void {
  run(
    'UPDATE links SET title = ?, url = ?, description = ?, category = ?, updated_at = datetime("now") WHERE id = ?',
    [title, url, description || null, category || null, id]
  );
}

export function toggleLinkStar(id: number): void {
  run('UPDATE links SET starred = NOT starred, updated_at = datetime("now") WHERE id = ?', [id]);
}

export function deleteLink(id: number): void {
  run('DELETE FROM links WHERE id = ?', [id]);
}
