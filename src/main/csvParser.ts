import Papa from 'papaparse';
import fs from 'fs';

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

// Length extraction pattern - matches formats like "5M", "7m", "2FT", "2.5M"
const lengthPattern = /[\-\s](\d+(?:\.\d+)?)\s*(M|FT)[\-\s]/i;
const lengthPatternAlt = /-(\d+(?:\.\d+)?)(M|FT)-/i;
const lengthPatternEnd = /[\-\s](\d+(?:\.\d+)?)\s*(M|FT)$/i;

// Speed extraction
const speedPattern = /(100G|200G|400G|800G)/i;

// Cable type patterns
const typePatterns: Record<string, RegExp> = {
  'AOC': /\bAOC\b/i,
  'PSM4': /\bPSM4?\b/i,
  'DR4': /\bDR4\+?\b/i,
  'DAC': /\bDAC\b/i,
  'Copper': /\b(CAT6|COPPER)\b/i,
};

// Connector patterns
const connectorPatterns: Record<string, RegExp> = {
  'QSFP-DD': /QSFP-DD/i,
  'QSFP28': /QSFP28/i,
  'OSFP': /\bOSFP\b/i,
  'MPO': /\bMPO\b/i,
  'RJ45': /\bRJ45\b/i,
};

export function extractLength(itemName: string): { value: number | null; unit: string | null; display: string | null } {
  // Try different patterns
  let match = itemName.match(lengthPattern);
  if (!match) {
    match = itemName.match(lengthPatternAlt);
  }
  if (!match) {
    match = itemName.match(lengthPatternEnd);
  }

  if (match) {
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    return {
      value,
      unit,
      display: `${value}${unit}`,
    };
  }

  return { value: null, unit: null, display: null };
}

export function extractSpeed(itemName: string): string | null {
  const match = itemName.match(speedPattern);
  return match ? match[1].toUpperCase() : null;
}

export function extractCableType(itemName: string): string | null {
  for (const [type, pattern] of Object.entries(typePatterns)) {
    if (pattern.test(itemName)) {
      return type;
    }
  }
  return null;
}

export function extractConnector(itemName: string): string | null {
  for (const [connector, pattern] of Object.entries(connectorPatterns)) {
    if (pattern.test(itemName)) {
      return connector;
    }
  }
  return null;
}

export function extractCableProperties(itemName: string): {
  cableType: string | null;
  cableLength: string | null;
  cableLengthValue: number | null;
  cableLengthUnit: string | null;
  speed: string | null;
  connectorType: string | null;
} {
  const length = extractLength(itemName);

  return {
    cableType: extractCableType(itemName),
    cableLength: length.display,
    cableLengthValue: length.value,
    cableLengthUnit: length.unit,
    speed: extractSpeed(itemName),
    connectorType: extractConnector(itemName),
  };
}

export function classifyCable(itemName: string, itemGroup: string): string {
  const upperName = itemName.toUpperCase();
  const speed = extractSpeed(itemName);
  const cableType = extractCableType(itemName);

  // 400G AOC - QSFP-DD with AOC and 400G
  if (upperName.includes('400G') && upperName.includes('AOC') && !upperName.includes('DR4')) {
    return '400G AOC';
  }

  // 400G PSM / DR4 - transceivers with pigtails
  if ((upperName.includes('DR4') || upperName.includes('400G')) &&
      (upperName.includes('TRANSCEIVER') || upperName.includes('PIGTAIL'))) {
    return '400G PSM';
  }

  // 200G Y AOC - Y-cables
  if (upperName.includes('200G') && upperName.includes('Y') && upperName.includes('AOC')) {
    return '200G Y AOC';
  }

  // 100G AOC - QSFP28 with AOC
  if ((upperName.includes('100G') || upperName.includes('QSFP28')) &&
      upperName.includes('AOC') && !upperName.includes('400G')) {
    return '100G AOC';
  }

  // 100G PSM4
  if (upperName.includes('PSM4') && (upperName.includes('100G') || upperName.includes('QSFP28'))) {
    return '100G PSM4';
  }

  // SMLC - Single Mode LC Uniboot
  if ((upperName.includes('SINGLE MODE') || upperName.includes('SM/LC') || upperName.includes('SINGLE-MODE')) &&
      (upperName.includes('UNIBOOT') || upperName.includes('LC'))) {
    return 'SMLC';
  }

  // MTP/MPO Fiber Jumpers
  if (upperName.includes('MTP') && (upperName.includes('JUMPER') || upperName.includes('FIBRE') || upperName.includes('FIBER'))) {
    return 'MTP Fiber';
  }

  // Copper CAT6
  if (upperName.includes('CAT6') || (upperName.includes('COPPER') && upperName.includes('PATCHCORDS'))) {
    return 'Copper';
  }

  // Fiber Jumpers (generic)
  if (itemGroup === 'FibrJmpers' || upperName.includes('FIBER') || upperName.includes('FIBRE')) {
    return 'Fiber Jumpers';
  }

  // Fall back to item group
  if (itemGroup === 'AOCCable') return 'AOC';
  if (itemGroup === 'PatchCords') return 'Copper';
  if (itemGroup === 'PSM4 Cable') return 'PSM4';
  if (itemGroup === 'NetCable') return 'Network Cable';
  if (itemGroup === 'Trnscvr') return 'Transceiver';

  return 'Other';
}

export function parseCSV(filePath: string): Promise<ParsedCable[]> {
  return new Promise((resolve, reject) => {
    try {
      let fileContent = fs.readFileSync(filePath, 'utf-8');

      // Remove BOM (Byte Order Mark) if present - common with Windows/Excel CSV files
      if (fileContent.charCodeAt(0) === 0xFEFF) {
        fileContent = fileContent.slice(1);
      }

      console.log(`Parsing CSV file: ${filePath}`);
      console.log(`File content length: ${fileContent.length} characters`);

      Papa.parse<CSVRecord>(fileContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        complete: (results) => {
          console.log(`PapaParse complete. Rows found: ${results.data.length}`);

          if (results.errors && results.errors.length > 0) {
            console.warn('CSV parsing warnings:', results.errors);
          }

          const cables: ParsedCable[] = [];

          for (const row of results.data) {
            if (!row.MSF || !row['Item Name']) {
              continue;
            }

            const itemName = row['Item Name'];
            const itemGroup = row['Item Group'] || '';
            const properties = extractCableProperties(itemName);
            const category = classifyCable(itemName, itemGroup);

            cables.push({
              msf: row.MSF.trim(),
              itemName: itemName.trim(),
              itemGroup: itemGroup.trim(),
              quantity: parseInt(row['OnHand Quantity'] || '0', 10) || 0,
              location: (row['Current Location'] || '').trim(),
              datacenter: (row.Datacenter || '').trim(),
              category,
              cableType: properties.cableType,
              cableLength: properties.cableLength,
              cableLengthValue: properties.cableLengthValue,
              cableLengthUnit: properties.cableLengthUnit,
              speed: properties.speed,
              connectorType: properties.connectorType,
            });
          }

          console.log(`Parsed ${cables.length} valid cable records`);
          resolve(cables);
        },
        error: (error: Error) => {
          console.error('PapaParse error:', error);
          reject(error);
        },
      });
    } catch (error) {
      console.error('Error reading CSV file:', error);
      reject(error);
    }
  });
}

export function generateSimpleDescription(cable: ParsedCable): string {
  const parts: string[] = [];

  if (cable.cableLength) {
    parts.push(cable.cableLength);
  }

  if (cable.speed) {
    parts.push(cable.speed);
  }

  if (cable.cableType) {
    parts.push(cable.cableType);
  }

  if (parts.length === 0) {
    // Extract a short description from the item name
    const shortName = cable.itemName.split('-').slice(0, 3).join('-');
    return shortName.length > 40 ? shortName.substring(0, 40) + '...' : shortName;
  }

  return parts.join(' - ');
}
