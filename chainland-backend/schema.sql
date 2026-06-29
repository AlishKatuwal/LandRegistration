-- PostgreSQL Schema for ChainLand

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_np VARCHAR(255),
    role VARCHAR(50) NOT NULL, -- 'officer' or 'citizen'
    password_hash TEXT NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    citizenship_no VARCHAR(100),
    dob DATE,
    gender VARCHAR(20),
    office VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parcels (
    id VARCHAR(100) PRIMARY KEY, -- Kitta Number
    district VARCHAR(100) NOT NULL,
    district_np VARCHAR(100),
    municipality VARCHAR(100) NOT NULL,
    municipality_np VARCHAR(100),
    ward INTEGER NOT NULL,
    area VARCHAR(50) NOT NULL, -- Format: R-A-P-D
    area_unit VARCHAR(50) DEFAULT 'ropani',
    area_sqm DECIMAL(10, 2),
    land_class VARCHAR(50),
    land_class_np VARCHAR(50),
    land_type VARCHAR(50),
    owner_lin VARCHAR(50) REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'active',
    tiro_status VARCHAR(50) DEFAULT 'paid',
    tiro_due_date DATE,
    tiro_amount DECIMAL(10, 2),
    last_tiro_paid DATE,
    registered_date DATE,
    rokka_reason TEXT,
    coordinates JSONB, -- Polygon data
    is_disputed BOOLEAN DEFAULT FALSE,
    is_mortgaged BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS applications (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    type_np VARCHAR(50),
    applicant_lin VARCHAR(50) REFERENCES users(id),
    kitta VARCHAR(100),
    submitted_date DATE DEFAULT CURRENT_DATE,
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(50) DEFAULT 'pending',
    buyer_lin VARCHAR(50) REFERENCES users(id),
    declared_value DECIMAL(15, 2),
    documents JSONB,
    district VARCHAR(100),
    municipality VARCHAR(100),
    ward INTEGER,
    area VARCHAR(50),
    polygon JSONB,
    registration_fee NUMERIC(15,2) DEFAULT 0,
    transfer_tax NUMERIC(15,2) DEFAULT 0,
    service_charge NUMERIC(15,2) DEFAULT 0,
    payment_status VARCHAR(20) DEFAULT 'unpaid',
    payment_receipt_url VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS disputes (
    id VARCHAR(50) PRIMARY KEY,
    parcel_id VARCHAR(100) REFERENCES parcels(id),
    claimant_lin VARCHAR(50) REFERENCES users(id),
    owner_lin VARCHAR(50) REFERENCES users(id),
    reason TEXT NOT NULL,
    phase VARCHAR(50) DEFAULT 'filing',
    filed_date DATE DEFAULT CURRENT_DATE,
    deadline DATE,
    deposit DECIMAL(10, 2),
    deposit_status VARCHAR(50) DEFAULT 'held',
    documents JSONB
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_lin VARCHAR(50) REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    icon VARCHAR(20),
    title VARCHAR(255) NOT NULL,
    title_np VARCHAR(255),
    message TEXT NOT NULL,
    message_np TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    link VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parcel_history (
    id SERIAL PRIMARY KEY,
    parcel_id VARCHAR(100) REFERENCES parcels(id),
    previous_owner_lin VARCHAR(50) REFERENCES users(id),
    new_owner_lin VARCHAR(50) REFERENCES users(id),
    transfer_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    application_id VARCHAR(50) REFERENCES applications(id),
    remarks TEXT
);

CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_lin VARCHAR(50) REFERENCES users(id),
    parcel_id VARCHAR(100) REFERENCES parcels(id),
    amount DECIMAL(15, 2) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'tiro', 'application_fee', 'dispute_deposit'
    status VARCHAR(50) DEFAULT 'success',
    method VARCHAR(50), -- 'eSewa', 'ConnectIPS', 'Manual'
    transaction_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blockchain_ledger (
    id SERIAL PRIMARY KEY,
    block_height INTEGER NOT NULL UNIQUE,
    application_id VARCHAR(50),
    transaction_type VARCHAR(50) NOT NULL,
    data_hash VARCHAR(64) NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    block_hash VARCHAR(64) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

