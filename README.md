# MS Cable Tracker

A web application for managing and tracking cable inventory. Built with React, TypeScript, Tailwind CSS, Express.js, and SQLite.

## Features

- **CSV Import**: Import cable inventory from CSV files with automatic parsing
- **Cable Classification**: Automatic categorization of cables (400G AOC, 100G PSM4, Copper, etc.)
- **Inventory Tracking**: Track quantities with historical data
- **Search & Filter**: Find cables by MSF, name, or cable length
- **Low Stock Alerts**: Visual indicators for low stock items
- **Category Management**: View inventory grouped by cable categories
- **Multi-Datacenter Support**: Track inventory across multiple datacenters
- **Favorite Links**: Save and organize frequently used links with starring

## Prerequisites

- Node.js 18 or higher
- npm

## Installation

```bash
# Install dependencies
npm install

# Install server dependencies
cd server && npm install
```

## Development

To run the application in development mode:

```bash
npm run dev
```

This will:
1. Start the Vite dev server for the React frontend on port 5173
2. Start the Express.js backend server on port 3000
3. The frontend proxies API requests to the backend

## Build

To build the application for production:

```bash
npm run build
```

This builds both the frontend and backend. To run the production build:

```bash
npm start
```

## Docker Deployment

Build and run with Docker:

```bash
# Build the Docker image
npm run docker:build

# Run with Docker Compose
npm run docker:run

# View logs
npm run docker:logs

# Stop the container
npm run docker:stop
```

The application will be available at `http://localhost:3000`.

## Project Structure

```
├── src/
│   └── renderer/            # React frontend
│       ├── main.tsx         # React entry point
│       ├── App.tsx          # Main app component
│       ├── types/           # TypeScript type definitions
│       ├── services/        # API service layer
│       └── components/      # React components
├── server/
│   └── src/                 # Express.js backend
│       ├── index.ts         # Server entry point
│       ├── app.ts           # Express app configuration
│       ├── routes/          # API route handlers
│       └── services/        # Database and CSV parsing
├── Dockerfile               # Docker build configuration
├── docker-compose.yml       # Docker Compose configuration
├── vite.config.ts           # Vite build configuration
└── package.json             # Project dependencies
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

The application uses SQLite (better-sqlite3) for local data storage. In Docker deployments, the database is stored in a persistent volume at `/app/data`.

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

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Express.js** - Backend server
- **better-sqlite3** - SQLite database
- **PapaParse** - CSV parsing

## License

Proprietary - Internal Use Only
