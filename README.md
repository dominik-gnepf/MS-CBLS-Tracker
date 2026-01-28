# MS Cable Tracker

A desktop application for managing and tracking cable inventory. Built with Electron, React, TypeScript, and Tailwind CSS.

## Features

- **CSV Import**: Import cable inventory from CSV files with automatic parsing
- **Cable Classification**: Automatic categorization of cables (400G AOC, 100G PSM4, Copper, etc.)
- **Inventory Tracking**: Track quantities with historical data
- **Search & Filter**: Find cables by MSF, name, or cable length
- **Low Stock Alerts**: Visual indicators for low stock items
- **Category Management**: View inventory grouped by cable categories

## Prerequisites

- Node.js 18 or higher
- npm

## Installation

```bash
# Install dependencies
npm install
```

## Development

To run the application in development mode:

```bash
npm run dev
```

This will:
1. Start the Vite dev server for the React frontend on port 5173
2. Build the Electron main process
3. Launch the Electron app

## Build

To build the application for production:

```bash
# Build both main process and renderer
npm run build

# Build packaged executable
npm run build:electron
```

## Project Structure

```
src/
├── main/                 # Electron main process
│   ├── main.ts          # Electron window creation and app lifecycle
│   ├── csvParser.ts     # CSV parsing and cable property extraction
│   ├── database.ts      # SQLite database operations (using sql.js)
│   └── ipcHandlers.ts   # IPC communication between main and renderer
├── preload/
│   └── preload.ts       # Context bridge for secure IPC communication
└── renderer/            # React UI
    ├── main.tsx         # React entry point
    ├── App.tsx          # Main app component
    ├── types/           # TypeScript type definitions
    └── components/      # React components
        ├── FileUpload.tsx           # CSV upload button
        ├── FilterBar.tsx            # Search and filter controls
        ├── Overview.tsx             # Inventory display grid
        ├── CableCard.tsx            # Individual cable card
        ├── DetailModal.tsx          # Cable detail view
        └── ImportResultModal.tsx    # Import result feedback
```

## CSV Format

The application expects CSV files with the following columns:

| Column | Required | Description |
|--------|----------|-------------|
| MSF | Yes | Unique identifier for the cable |
| Item Name | Yes | Full name/description of the cable |
| Item Group | No | Grouping category |
| OnHand Quantity | No | Current inventory count |
| Current Location | No | Storage location |
| Datacenter | No | Datacenter identifier |

## Database

The application uses sql.js (SQLite compiled to WebAssembly) for local data storage. The database is stored in the user's app data directory:

- **Windows**: `%APPDATA%/ms-cable-tracker/data/inventory.db`
- **macOS**: `~/Library/Application Support/ms-cable-tracker/data/inventory.db`
- **Linux**: `~/.config/ms-cable-tracker/data/inventory.db`

## Cable Categories

Cables are automatically classified into categories based on their item names:

- **400G AOC** - 400G Active Optical Cables
- **400G PSM** - 400G PSM/DR4 Transceivers
- **200G Y AOC** - 200G Y-Cables
- **100G AOC** - 100G Active Optical Cables
- **100G PSM4** - 100G PSM4 Cables
- **SMLC** - Single Mode LC Uniboot
- **MTP Fiber** - MTP/MPO Fiber Jumpers
- **Copper** - CAT6 and Copper Patchcords
- **Fiber Jumpers** - Generic fiber jumpers
- **Transceiver** - Network transceivers
- **Other** - Uncategorized items

## Tech Stack

- **Electron** - Desktop application framework
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **sql.js** - SQLite in WebAssembly
- **PapaParse** - CSV parsing

## License

Proprietary - Internal Use Only
