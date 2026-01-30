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

export interface AppSettings {
  lowStockThreshold: number;
  criticalStockThreshold: number;
  categories: CategoryConfig[];
}

export interface CategoryConfig {
  name: string;
  color: string;
  order: number;
}

export interface ImportResult {
  success: boolean;
  recordsProcessed?: number;
  newProducts?: number;
  updatedProducts?: number;
  error?: string;
}

export interface ParsedCable {
  msf: string;
  itemName: string;
  itemGroup: string;
  quantity: number;
  location: string;
  datacenter: string;
  category: string;
  cableType: string | null;
  cableLength: string | null;
  cableLengthValue: number | null;
  cableLengthUnit: string | null;
  speed: string | null;
  connectorType: string | null;
}

export interface CSVRecord {
  Datacenter: string;
  MSF: string;
  'Item Name': string;
  'Item Type': string;
  'Item Group': string;
  'Dimension Group': string;
  'Current Location': string;
  'OnHand Quantity': string;
  'Quantity To Move': string;
  'New Location': string;
  Notes: string;
  'Operation Result': string;
}
