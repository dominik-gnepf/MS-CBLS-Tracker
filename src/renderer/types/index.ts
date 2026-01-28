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

// Settings types
export interface AppSettings {
  lowStockThreshold: number;      // Yellow warning threshold
  criticalStockThreshold: number; // Red critical threshold
  categories: CategoryConfig[];
}

export interface CategoryConfig {
  name: string;
  color: string;
  order: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
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

export const AVAILABLE_COLORS = [
  'blue', 'purple', 'green', 'teal', 'yellow', 'orange', 
  'pink', 'indigo', 'cyan', 'red', 'gray', 'emerald', 
  'amber', 'lime', 'rose', 'violet', 'sky', 'fuchsia'
];

export function getCategoryColorClass(color: string): string {
  const colorMap: Record<string, string> = {
    'blue': 'bg-blue-100 border-blue-300',
    'purple': 'bg-purple-100 border-purple-300',
    'green': 'bg-green-100 border-green-300',
    'teal': 'bg-teal-100 border-teal-300',
    'yellow': 'bg-yellow-100 border-yellow-300',
    'orange': 'bg-orange-100 border-orange-300',
    'pink': 'bg-pink-100 border-pink-300',
    'indigo': 'bg-indigo-100 border-indigo-300',
    'cyan': 'bg-cyan-100 border-cyan-300',
    'red': 'bg-red-100 border-red-300',
    'gray': 'bg-gray-100 border-gray-300',
    'emerald': 'bg-emerald-100 border-emerald-300',
    'amber': 'bg-amber-100 border-amber-300',
    'lime': 'bg-lime-100 border-lime-300',
    'rose': 'bg-rose-100 border-rose-300',
    'violet': 'bg-violet-100 border-violet-300',
    'sky': 'bg-sky-100 border-sky-300',
    'fuchsia': 'bg-fuchsia-100 border-fuchsia-300',
  };
  return colorMap[color] || colorMap['gray'];
}
