# MS Daily Tracker - Database Container

This directory contains the Docker configuration for a PostgreSQL database to store MSF information and datacenter stock counts.

## Quick Start

### Option 1: Database Only (for local development)

```bash
# Navigate to database directory
cd database

# Start the database container
docker-compose up -d

# Check container status
docker-compose ps

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

### Option 2: Full Application Stack (Database + App)

From the project root directory:

```bash
# Start both database and application
docker-compose up -d

# Or build and start
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop everything
docker-compose down
```

## Database Connection

| Parameter | Value |
|-----------|-------|
| Host | `localhost` |
| Port | `5432` |
| Database | `ms_tracker_db` |
| Username | `ms_tracker` |
| Password | `ms_tracker_secret` |

**Connection String:**
```
postgresql://ms_tracker:ms_tracker_secret@localhost:5432/ms_tracker_db
```

## Tables

### 1. `msf_information` - MSF/Product Information
Stores all MSF (product) details including cable specifications and configurations.

| Column | Type | Description |
|--------|------|-------------|
| msf | VARCHAR(50) | Primary key - MSF identifier |
| item_name | VARCHAR(500) | Full product name |
| item_group | VARCHAR(100) | Item grouping |
| category | VARCHAR(100) | Cable category (400G AOC, Copper, etc.) |
| cable_type | VARCHAR(50) | Type (AOC, PSM4, DAC, etc.) |
| cable_length | VARCHAR(20) | Display format (5M, 2FT) |
| cable_length_value | DECIMAL | Numeric value |
| cable_length_unit | VARCHAR(10) | Unit (M or FT) |
| speed | VARCHAR(20) | Speed (100G, 400G, etc.) |
| connector_type | VARCHAR(50) | Connector (QSFP-DD, QSFP28, etc.) |
| location | VARCHAR(100) | Physical location |
| metadata | JSONB | Additional metadata |
| short_name | VARCHAR(100) | Custom short name |
| category_override | VARCHAR(100) | Manual category override |
| notes | TEXT | User notes |
| hidden | BOOLEAN | Hide from UI |
| custom_order | INTEGER | Custom sort order |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### 2. `dc_stock_count` - Datacenter Stock Count
Stores inventory/stock quantities per datacenter.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| msf | VARCHAR(50) | Foreign key to msf_information |
| datacenter | VARCHAR(50) | Datacenter identifier |
| quantity | INTEGER | Stock count |
| import_date | TIMESTAMP | When the data was imported |
| source_file | VARCHAR(255) | Source CSV filename |
| created_at | TIMESTAMP | Record creation time |

## Views

### `latest_dc_stock`
Shows the most recent stock count for each MSF per datacenter.

### `msf_with_stock`
Combines MSF information with total stock across all datacenters.

## Example Queries

```sql
-- Get all MSF information
SELECT * FROM msf_information;

-- Get stock for a specific datacenter
SELECT msf, quantity, import_date
FROM latest_dc_stock
WHERE datacenter = 'ZRH24';

-- Get MSF with total stock across all DCs
SELECT msf, item_name, category, total_quantity, datacenter_count
FROM msf_with_stock
ORDER BY category, cable_length_value;

-- Get low stock items (less than 10)
SELECT m.msf, m.item_name, m.category, s.datacenter, s.quantity
FROM msf_information m
JOIN latest_dc_stock s ON m.msf = s.msf
WHERE s.quantity < 10
ORDER BY s.quantity;

-- Insert new MSF information
INSERT INTO msf_information (msf, item_name, category, cable_type, cable_length)
VALUES ('MSF-123456', 'Example Cable 5M', '400G AOC', 'AOC', '5M');

-- Insert stock count
INSERT INTO dc_stock_count (msf, datacenter, quantity, source_file)
VALUES ('MSF-123456', 'ZRH24', 50, 'import_2024.csv');
```

## Data Persistence

Data is persisted in a Docker volume named `ms-tracker-db-data`. To completely reset the database:

```bash
# Stop and remove containers and volumes
docker-compose down -v

# Start fresh
docker-compose up -d
```

## Connecting from Application

To connect the MS Daily Tracker application to this database, set the following environment variable:

```bash
DATABASE_URL=postgresql://ms_tracker:ms_tracker_secret@localhost:5432/ms_tracker_db
```

Or if running in Docker network:
```bash
DATABASE_URL=postgresql://ms_tracker:ms_tracker_secret@ms-tracker-db:5432/ms_tracker_db
```
