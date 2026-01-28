import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

let db: SqlJsDatabase | null = null;
let dbPath: string = '';

// Get the path to the sql.js WASM file
function getWasmPath(): string {
  const isDev = process.env.NODE_ENV !== 'production' || !app.isPackaged;

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
      import_date TEXT DEFAULT CURRENT_TIMESTAMP,
      source_file TEXT,
      FOREIGN KEY (msf) REFERENCES products(msf)
    )
  `);

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
  import_date: string;
  source_file: string | null;
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
export function getLatestInventory(): Array<Product & { quantity: number }> {
  return queryAll<Product & { quantity: number }>(`
    SELECT p.*, COALESCE(
      (SELECT quantity FROM inventory WHERE msf = p.msf ORDER BY import_date DESC LIMIT 1),
      0
    ) as quantity
    FROM products p
    ORDER BY p.category, p.cable_length_value
  `);
}

export function getInventoryByCategory(): Record<string, Array<Product & { quantity: number }>> {
  const inventory = getLatestInventory();
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

export function insertInventory(msf: string, quantity: number, sourceFile: string): void {
  // Use JavaScript timestamp for more precise ordering
  const timestamp = new Date().toISOString();
  run(`INSERT INTO inventory (msf, quantity, source_file, import_date) VALUES (?, ?, ?, ?)`, [msf, quantity, sourceFile, timestamp]);
}

// Reset all inventory to 0 before a full import
// This inserts a 0-quantity record for all existing products
export function resetAllInventory(sourceFile: string): number {
  const products = getAllProducts();
  let resetCount = 0;
  const timestamp = new Date().toISOString();

  for (const product of products) {
    run(`INSERT INTO inventory (msf, quantity, source_file, import_date) VALUES (?, 0, ?, ?)`, [product.msf, sourceFile + ' (reset)', timestamp]);
    resetCount++;
  }

  return resetCount;
}

export function getInventoryHistory(msf: string): Inventory[] {
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
