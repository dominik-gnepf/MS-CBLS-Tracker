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
  quantity: number;
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

export interface ImportResult {
  success: boolean;
  recordsProcessed?: number;
  newProducts?: number;
  updatedProducts?: number;
  error?: string;
}

export type CategoryKey =
  | '400G AOC'
  | '400G PSM'
  | '100G AOC'
  | '100G PSM4'
  | 'SMLC'
  | 'Copper'
  | '200G Y AOC'
  | 'MTP Fiber'
  | 'Fiber Jumpers'
  | 'Transceiver'
  | 'Other';

export const CATEGORY_ORDER: CategoryKey[] = [
  '400G AOC',
  '400G PSM',
  '100G AOC',
  '100G PSM4',
  'SMLC',
  'Copper',
  '200G Y AOC',
  'MTP Fiber',
  'Fiber Jumpers',
  'Transceiver',
  'Other',
];

export const CATEGORY_COLORS: Record<string, string> = {
  '400G AOC': 'bg-blue-100 border-blue-300',
  '400G PSM': 'bg-purple-100 border-purple-300',
  '100G AOC': 'bg-green-100 border-green-300',
  '100G PSM4': 'bg-teal-100 border-teal-300',
  'SMLC': 'bg-yellow-100 border-yellow-300',
  'Copper': 'bg-orange-100 border-orange-300',
  '200G Y AOC': 'bg-pink-100 border-pink-300',
  'MTP Fiber': 'bg-indigo-100 border-indigo-300',
  'Fiber Jumpers': 'bg-cyan-100 border-cyan-300',
  'Transceiver': 'bg-red-100 border-red-300',
  'Other': 'bg-gray-100 border-gray-300',
};

export const LOW_STOCK_THRESHOLD = 20;
