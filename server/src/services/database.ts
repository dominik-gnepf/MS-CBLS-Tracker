import Database from 'better-sqlite3';
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

let db: Database.Database | null = null;

// Data directory - configurable via environment variable
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

function getDbPath(): string {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  return path.join(DATA_DIR, 'inventory.db');
}

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

export function initDatabase(): void {
  const dbPath = getDbPath();
  console.log(`Initializing database at: ${dbPath}`);

  db = new Database(dbPath);

  // Enable WAL mode for better concurrent access
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
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

  db.exec(`
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

  db.exec(`
    CREATE TABLE IF NOT EXISTS datacenters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS import_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      import_date TEXT DEFAULT CURRENT_TIMESTAMP,
      records_processed INTEGER,
      new_products INTEGER,
      updated_products INTEGER
    )
  `);

  db.exec(`
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

  db.exec(`
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

  // Create indexes
  db.exec('CREATE INDEX IF NOT EXISTS idx_products_item_group ON products(item_group)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_products_cable_type ON products(cable_type)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_inventory_msf ON inventory(msf)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_inventory_datacenter ON inventory(datacenter)');

  console.log('Database initialized successfully');
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

// Product operations
export function getProduct(msf: string): Product | undefined {
  const stmt = getDb().prepare('SELECT * FROM products WHERE msf = ?');
  return stmt.get(msf) as Product | undefined;
}

export function getAllProducts(): Product[] {
  const stmt = getDb().prepare('SELECT * FROM products ORDER BY category, cable_length_value');
  return stmt.all() as Product[];
}

export function upsertProduct(product: Partial<Product>): void {
  const existing = getProduct(product.msf!);

  if (existing) {
    const stmt = getDb().prepare(`
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
    `);
    stmt.run(
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
    );
  } else {
    const stmt = getDb().prepare(`
      INSERT INTO products (msf, item_name, item_group, category, cable_type, cable_length,
        cable_length_value, cable_length_unit, speed, connector_type, location, datacenter, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
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
    );
  }
}

export function updateProductCategory(msf: string, category: string): void {
  const stmt = getDb().prepare(`UPDATE products SET category = ?, updated_at = datetime('now') WHERE msf = ?`);
  stmt.run(category, msf);
}

// Inventory operations
export function getLatestInventory(datacenter?: string): Array<Product & { quantity: number }> {
  if (datacenter) {
    const stmt = getDb().prepare(`
      SELECT p.*, COALESCE(
        (SELECT quantity FROM inventory WHERE msf = p.msf AND datacenter = ? ORDER BY import_date DESC LIMIT 1),
        0
      ) as quantity
      FROM products p
      ORDER BY p.category, p.cable_length_value
    `);
    return stmt.all(datacenter) as Array<Product & { quantity: number }>;
  }
  const stmt = getDb().prepare(`
    SELECT p.*, COALESCE(
      (SELECT quantity FROM inventory WHERE msf = p.msf ORDER BY import_date DESC LIMIT 1),
      0
    ) as quantity
    FROM products p
    ORDER BY p.category, p.cable_length_value
  `);
  return stmt.all() as Array<Product & { quantity: number }>;
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
  const timestamp = new Date().toISOString();
  const stmt = getDb().prepare(`INSERT INTO inventory (msf, quantity, source_file, import_date, datacenter) VALUES (?, ?, ?, ?, ?)`);
  stmt.run(msf, quantity, sourceFile, timestamp, datacenter);
}

export function resetAllInventory(sourceFile: string, datacenter: string = ''): number {
  const products = getAllProducts();
  let resetCount = 0;
  const timestamp = new Date().toISOString();
  const stmt = getDb().prepare(`INSERT INTO inventory (msf, quantity, source_file, import_date, datacenter) VALUES (?, 0, ?, ?, ?)`);

  for (const product of products) {
    stmt.run(product.msf, sourceFile + ' (reset)', timestamp, datacenter);
    resetCount++;
  }

  return resetCount;
}

export function getInventoryHistory(msf: string, datacenter?: string): Inventory[] {
  if (datacenter) {
    const stmt = getDb().prepare('SELECT * FROM inventory WHERE msf = ? AND datacenter = ? ORDER BY import_date DESC');
    return stmt.all(msf, datacenter) as Inventory[];
  }
  const stmt = getDb().prepare('SELECT * FROM inventory WHERE msf = ? ORDER BY import_date DESC');
  return stmt.all(msf) as Inventory[];
}

// Import history operations
export function recordImport(filename: string, recordsProcessed: number, newProducts: number, updatedProducts: number): number {
  const stmt = getDb().prepare(`
    INSERT INTO import_history (filename, records_processed, new_products, updated_products)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(filename, recordsProcessed, newProducts, updatedProducts);
  return Number(result.lastInsertRowid);
}

export function getImportHistory(): ImportHistory[] {
  const stmt = getDb().prepare('SELECT * FROM import_history ORDER BY import_date DESC LIMIT 50');
  return stmt.all() as ImportHistory[];
}

// Search
export function searchProducts(query: string): Array<Product & { quantity: number }> {
  const searchTerm = `%${query}%`;
  const stmt = getDb().prepare(`
    SELECT p.*, COALESCE(
      (SELECT quantity FROM inventory WHERE msf = p.msf ORDER BY import_date DESC LIMIT 1),
      0
    ) as quantity
    FROM products p
    WHERE p.msf LIKE ? OR p.item_name LIKE ? OR p.category LIKE ?
    ORDER BY p.category, p.cable_length_value
  `);
  return stmt.all(searchTerm, searchTerm, searchTerm) as Array<Product & { quantity: number }>;
}

// Delete all data
export function deleteAllData(): { productsDeleted: number; inventoryDeleted: number; importsDeleted: number } {
  const productCount = (getDb().prepare('SELECT COUNT(*) as count FROM products').get() as { count: number }).count;
  const inventoryCount = (getDb().prepare('SELECT COUNT(*) as count FROM inventory').get() as { count: number }).count;
  const importCount = (getDb().prepare('SELECT COUNT(*) as count FROM import_history').get() as { count: number }).count;

  getDb().exec('DELETE FROM inventory');
  getDb().exec('DELETE FROM import_history');
  getDb().exec('DELETE FROM products');

  return {
    productsDeleted: productCount,
    inventoryDeleted: inventoryCount,
    importsDeleted: importCount,
  };
}

// MSF Configuration operations
export function getMsfConfig(msf: string): MsfConfig | undefined {
  const stmt = getDb().prepare('SELECT * FROM msf_config WHERE msf = ?');
  return stmt.get(msf) as MsfConfig | undefined;
}

export function getAllMsfConfigs(): MsfConfig[] {
  const stmt = getDb().prepare('SELECT * FROM msf_config ORDER BY msf');
  return stmt.all() as MsfConfig[];
}

export function upsertMsfConfig(config: Partial<MsfConfig>): void {
  const existing = getMsfConfig(config.msf!);

  if (existing) {
    const stmt = getDb().prepare(`
      UPDATE msf_config SET
        short_name = ?,
        category_override = ?,
        notes = ?,
        hidden = ?,
        custom_order = ?,
        updated_at = datetime('now')
      WHERE msf = ?
    `);
    stmt.run(
      config.short_name ?? existing.short_name,
      config.category_override ?? existing.category_override,
      config.notes ?? existing.notes,
      config.hidden ?? existing.hidden,
      config.custom_order ?? existing.custom_order,
      config.msf
    );
  } else {
    const stmt = getDb().prepare(`
      INSERT INTO msf_config (msf, short_name, category_override, notes, hidden, custom_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      config.msf,
      config.short_name || null,
      config.category_override || null,
      config.notes || null,
      config.hidden || 0,
      config.custom_order || null
    );
  }
}

export function deleteMsfConfig(msf: string): void {
  const stmt = getDb().prepare('DELETE FROM msf_config WHERE msf = ?');
  stmt.run(msf);
}

interface ProductWithConfigRow extends Product {
  quantity: number;
  config_short_name: string | null;
  config_category_override: string | null;
  config_notes: string | null;
  config_hidden: number | null;
  config_custom_order: number | null;
}

export function getProductsWithConfig(): Array<Product & { quantity: number; config: MsfConfig | null }> {
  const stmt = getDb().prepare(`
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
  const rows = stmt.all() as ProductWithConfigRow[];

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
  const stmt = getDb().prepare('SELECT * FROM datacenters ORDER BY name');
  return stmt.all() as Datacenter[];
}

export function getDatacenter(id: string): Datacenter | undefined {
  const stmt = getDb().prepare('SELECT * FROM datacenters WHERE id = ?');
  return stmt.get(id) as Datacenter | undefined;
}

export function addDatacenter(id: string, name: string): void {
  const stmt = getDb().prepare('INSERT OR REPLACE INTO datacenters (id, name) VALUES (?, ?)');
  stmt.run(id, name);
}

export function deleteDatacenter(id: string): void {
  getDb().exec('BEGIN TRANSACTION');
  try {
    getDb().prepare('DELETE FROM inventory WHERE datacenter = ?').run(id);
    getDb().prepare('DELETE FROM datacenters WHERE id = ?').run(id);
    getDb().exec('COMMIT');
  } catch (error) {
    getDb().exec('ROLLBACK');
    throw error;
  }
}

export function updateDatacenter(id: string, name: string): void {
  const stmt = getDb().prepare('UPDATE datacenters SET name = ? WHERE id = ?');
  stmt.run(name, id);
}

// Link operations
export function getAllLinks(): Link[] {
  const stmt = getDb().prepare('SELECT * FROM links ORDER BY starred DESC, title');
  return stmt.all() as Link[];
}

export function getStarredLinks(): Link[] {
  const stmt = getDb().prepare('SELECT * FROM links WHERE starred = 1 ORDER BY title');
  return stmt.all() as Link[];
}

export function getLink(id: number): Link | undefined {
  const stmt = getDb().prepare('SELECT * FROM links WHERE id = ?');
  return stmt.get(id) as Link | undefined;
}

export function addLink(title: string, url: string, description?: string, category?: string): number {
  const stmt = getDb().prepare('INSERT INTO links (title, url, description, category) VALUES (?, ?, ?, ?)');
  const result = stmt.run(title, url, description || null, category || null);
  return Number(result.lastInsertRowid);
}

export function updateLink(id: number, title: string, url: string, description?: string, category?: string): void {
  const stmt = getDb().prepare(
    "UPDATE links SET title = ?, url = ?, description = ?, category = ?, updated_at = datetime('now') WHERE id = ?"
  );
  stmt.run(title, url, description || null, category || null, id);
}

export function toggleLinkStar(id: number): void {
  const stmt = getDb().prepare("UPDATE links SET starred = NOT starred, updated_at = datetime('now') WHERE id = ?");
  stmt.run(id);
}

export function deleteLink(id: number): void {
  const stmt = getDb().prepare('DELETE FROM links WHERE id = ?');
  stmt.run(id);
}

// Transaction helper for imports
export function runInTransaction<T>(fn: () => T): T {
  const db = getDb();
  db.exec('BEGIN TRANSACTION');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
