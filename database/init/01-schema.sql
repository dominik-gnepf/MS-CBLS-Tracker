-- MS Daily Tracker Database Schema
-- Table 1: MSF Information (Product/Cable Information)
-- Table 2: DC Stock Count (Datacenter Inventory)

-- ============================================
-- TABLE 1: MSF Information
-- Stores all MSF (product) details and configurations
-- ============================================

CREATE TABLE IF NOT EXISTS msf_information (
    msf VARCHAR(50) PRIMARY KEY,
    item_name VARCHAR(500) NOT NULL,
    item_group VARCHAR(100),
    category VARCHAR(100),
    cable_type VARCHAR(50),
    cable_length VARCHAR(20),
    cable_length_value DECIMAL(10,2),
    cable_length_unit VARCHAR(10),
    speed VARCHAR(20),
    connector_type VARCHAR(50),
    location VARCHAR(100),
    datacenter VARCHAR(50),
    metadata JSONB,
    -- MSF Configuration fields
    short_name VARCHAR(100),
    category_override VARCHAR(100),
    notes TEXT,
    hidden BOOLEAN DEFAULT FALSE,
    custom_order INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for msf_information
CREATE INDEX IF NOT EXISTS idx_msf_info_item_group ON msf_information(item_group);
CREATE INDEX IF NOT EXISTS idx_msf_info_category ON msf_information(category);
CREATE INDEX IF NOT EXISTS idx_msf_info_cable_type ON msf_information(cable_type);
CREATE INDEX IF NOT EXISTS idx_msf_info_speed ON msf_information(speed);
CREATE INDEX IF NOT EXISTS idx_msf_info_hidden ON msf_information(hidden);

-- ============================================
-- TABLE 2: DC Stock Count
-- Stores inventory/stock per datacenter
-- ============================================

CREATE TABLE IF NOT EXISTS dc_stock_count (
    id SERIAL PRIMARY KEY,
    msf VARCHAR(50) NOT NULL REFERENCES msf_information(msf) ON DELETE CASCADE,
    datacenter VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    import_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    source_file VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for dc_stock_count
CREATE INDEX IF NOT EXISTS idx_dc_stock_msf ON dc_stock_count(msf);
CREATE INDEX IF NOT EXISTS idx_dc_stock_datacenter ON dc_stock_count(datacenter);
CREATE INDEX IF NOT EXISTS idx_dc_stock_import_date ON dc_stock_count(import_date DESC);
CREATE INDEX IF NOT EXISTS idx_dc_stock_msf_dc ON dc_stock_count(msf, datacenter);

-- ============================================
-- Supporting Tables
-- ============================================

-- Datacenters table
CREATE TABLE IF NOT EXISTS datacenters (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Import history tracking
CREATE TABLE IF NOT EXISTS import_history (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    datacenter VARCHAR(50),
    records_processed INTEGER DEFAULT 0,
    new_products INTEGER DEFAULT 0,
    updated_products INTEGER DEFAULT 0,
    import_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Application settings (stored as JSON)
CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Favorite links
CREATE TABLE IF NOT EXISTS links (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    url VARCHAR(500) NOT NULL,
    description TEXT,
    starred BOOLEAN DEFAULT FALSE,
    category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Helper Functions
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for msf_information
DROP TRIGGER IF EXISTS update_msf_information_updated_at ON msf_information;
CREATE TRIGGER update_msf_information_updated_at
    BEFORE UPDATE ON msf_information
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for app_settings
DROP TRIGGER IF EXISTS update_app_settings_updated_at ON app_settings;
CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for links
DROP TRIGGER IF EXISTS update_links_updated_at ON links;
CREATE TRIGGER update_links_updated_at
    BEFORE UPDATE ON links
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Views for convenient querying
-- ============================================

-- View: Latest stock per MSF per datacenter
CREATE OR REPLACE VIEW latest_dc_stock AS
SELECT DISTINCT ON (msf, datacenter)
    msf,
    datacenter,
    quantity,
    import_date,
    source_file
FROM dc_stock_count
ORDER BY msf, datacenter, import_date DESC;

-- View: MSF Information with latest stock across all datacenters
CREATE OR REPLACE VIEW msf_with_stock AS
SELECT
    m.*,
    COALESCE(s.total_quantity, 0) as total_quantity,
    s.datacenter_count
FROM msf_information m
LEFT JOIN (
    SELECT
        msf,
        SUM(quantity) as total_quantity,
        COUNT(DISTINCT datacenter) as datacenter_count
    FROM latest_dc_stock
    GROUP BY msf
) s ON m.msf = s.msf;

-- ============================================
-- Insert default settings
-- ============================================

INSERT INTO app_settings (key, value) VALUES
('thresholds', '{"lowStockThreshold": 20, "criticalStockThreshold": 10}'::jsonb),
('categories', '[
    {"name": "400G AOC", "color": "blue", "order": 0},
    {"name": "400G PSM", "color": "purple", "order": 1},
    {"name": "100G AOC", "color": "green", "order": 2},
    {"name": "100G PSM4", "color": "teal", "order": 3},
    {"name": "SMLC", "color": "yellow", "order": 4},
    {"name": "Copper", "color": "orange", "order": 5},
    {"name": "200G Y AOC", "color": "pink", "order": 6},
    {"name": "MTP Fiber", "color": "indigo", "order": 7},
    {"name": "Fiber Jumpers", "color": "cyan", "order": 8},
    {"name": "Transceiver", "color": "red", "order": 9},
    {"name": "Other", "color": "gray", "order": 10}
]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Grant permissions (if needed for additional users)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ms_tracker;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ms_tracker;
