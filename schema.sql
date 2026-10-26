-- MinePay schema (PostgreSQL 13+)
-- users -> accounts -> transactions -> ledger_entries, plus audit logs and sessions

-- built-in gen_random_uuid supported natively in PostgreSQL 13+

-- users table
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    upi_handle VARCHAR(50) UNIQUE NOT NULL,
    skin_avatar VARCHAR(30) NOT NULL DEFAULT 'alex',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- accounts table
CREATE TABLE IF NOT EXISTS accounts (
    account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    account_number VARCHAR(30) UNIQUE NOT NULL,
    chest_name VARCHAR(60) NOT NULL DEFAULT 'Oak Chest',
    chest_type VARCHAR(30) NOT NULL DEFAULT 'OAK_CHEST',
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    security_pin_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- invariant: Non-negative balance enforced at storage engine
    CONSTRAINT chk_non_negative_balance CHECK (balance >= 0.00),
    CONSTRAINT fk_account_user FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE RESTRICT
);

-- transactions table
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(100) UNIQUE,
    sender_account_id UUID NOT NULL,
    receiver_account_id UUID NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    note VARCHAR(150),
    failure_reason TEXT,
    source VARCHAR(20) NOT NULL DEFAULT 'BANK',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- constraints
    CONSTRAINT chk_positive_amount CHECK (amount > 0.00),
    CONSTRAINT chk_valid_status CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
    CONSTRAINT chk_different_accounts CHECK (sender_account_id <> receiver_account_id),
    CONSTRAINT fk_tx_sender FOREIGN KEY (sender_account_id)
        REFERENCES accounts(account_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_tx_receiver FOREIGN KEY (receiver_account_id)
        REFERENCES accounts(account_id)
        ON DELETE RESTRICT
);

-- double-entry ledger entries table
CREATE TABLE IF NOT EXISTS ledger_entries (
    entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL,
    account_id UUID NOT NULL,
    entry_type VARCHAR(10) NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0.00),
    balance_after NUMERIC(12, 2) NOT NULL CHECK (balance_after >= 0.00),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ledger_tx FOREIGN KEY (transaction_id)
        REFERENCES transactions(transaction_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_ledger_acc FOREIGN KEY (account_id)
        REFERENCES accounts(account_id)
        ON DELETE RESTRICT
);

-- sql audit logs
CREATE TABLE IF NOT EXISTS sql_audit_logs (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(60) NOT NULL,
    operation VARCHAR(50) NOT NULL,
    query_type VARCHAR(20) NOT NULL,
    sanitized_sql TEXT NOT NULL,
    safe_params TEXT,
    duration_ms NUMERIC(8, 2) NOT NULL DEFAULT 0.0,
    rows_affected INT NOT NULL DEFAULT 0,
    outcome VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- sessions table
CREATE TABLE IF NOT EXISTS sessions (
    token VARCHAR(100) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days')
);

-- performance & Foreign Key Indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_number ON accounts(account_number);
CREATE INDEX IF NOT EXISTS idx_tx_sender ON transactions(sender_account_id);
CREATE INDEX IF NOT EXISTS idx_tx_receiver ON transactions(receiver_account_id);
CREATE INDEX IF NOT EXISTS idx_tx_idempotency ON transactions(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_tx_timestamp ON transactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_acc ON ledger_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON sql_audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- safe seed data

-- seed Users
INSERT INTO users (user_id, username, email, password_hash, phone_number, upi_handle, skin_avatar) VALUES
    ('a0000000-0000-0000-0000-000000000002', 'Alex', 'alex@minepay.mine', '$2a$10$wK1E7Zf9qL7rN1N3eEwB9O.G2K9kXj7fT8a4hN4QeQ5j6yWz1zY8e', '+919876543202', 'alex@minepay', 'alex'),
    ('a0000000-0000-0000-0000-000000000004', 'Piglin Barterer', 'piglin@minepay.mine', '$2a$10$wK1E7Zf9qL7rN1N3eEwB9O.G2K9kXj7fT8a4hN4QeQ5j6yWz1zY8e', '+919876543204', 'piglin@minepay', 'piglin'),
    ('a0000000-0000-0000-0000-000000000001', 'Steve', 'steve@minepay.mine', '$2a$10$wK1E7Zf9qL7rN1N3eEwB9O.G2K9kXj7fT8a4hN4QeQ5j6yWz1zY8e', '+919876543201', 'steve@minepay', 'steve'),
    ('a0000000-0000-0000-0000-000000000003', 'Villager Trader', 'villager@minepay.mine', '$2a$10$wK1E7Zf9qL7rN1N3eEwB9O.G2K9kXj7fT8a4hN4QeQ5j6yWz1zY8e', '+919876543203', 'villager@minepay', 'villager')
ON CONFLICT (user_id) DO NOTHING;

-- seed Accounts
INSERT INTO accounts (account_id, user_id, account_number, chest_name, chest_type, balance, security_pin_hash) VALUES
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'CHEST-ALEX-OAK', 'Alex''s Oak Chest', 'OAK_CHEST', 2300.00, '$2a$10$wK1E7Zf9qL7rN1N3eEwB9O.G2K9kXj7fT8a4hN4QeQ5j6yWz1zY8e'),
    ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'CHEST-PIGLIN-GOLD', 'Piglin''s Gold Pile', 'GOLD_PILE', 1800.00, '$2a$10$wK1E7Zf9qL7rN1N3eEwB9O.G2K9kXj7fT8a4hN4QeQ5j6yWz1zY8e'),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'CHEST-STEVE-OAK', 'Steve''s Oak Chest', 'OAK_CHEST', 1500.00, '$2a$10$wK1E7Zf9qL7rN1N3eEwB9O.G2K9kXj7fT8a4hN4QeQ5j6yWz1zY8e'),
    ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'CHEST-VILLAGE-VAULT', 'Villager''s Emerald Vault', 'EMERALD_VAULT', 4000.00, '$2a$10$wK1E7Zf9qL7rN1N3eEwB9O.G2K9kXj7fT8a4hN4QeQ5j6yWz1zY8e')
ON CONFLICT (account_id) DO NOTHING;

INSERT INTO transactions (transaction_id, sender_account_id, receiver_account_id, amount, status, note, source, timestamp) VALUES
    ('c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 500.00, 'SUCCESS', 'DEVICE-4 demo refund', 'LAB', '2026-10-25 22:19:00+00'),
    ('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 500.00, 'SUCCESS', 'DEVICE-3 demo refund', 'LAB', '2026-10-25 22:19:00+00'),
    ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 500.00, 'SUCCESS', 'DEVICE-2 demo refund', 'LAB', '2026-10-25 22:19:00+00'),
    ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 500.00, 'SUCCESS', 'DEVICE-1 demo refund', 'LAB', '2026-10-25 22:19:00+00'),
    ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004', 500.00, 'SUCCESS', 'FOR My lover', 'BANK', '2026-10-25 22:16:00+00'),
    ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 500.00, 'SUCCESS', 'halfsies on the diamond sword', 'BANK', '2026-10-25 17:08:00+00'),
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 250.00, 'SUCCESS', 'carrot trade', 'BANK', '2026-10-22 22:08:00+00')
ON CONFLICT (transaction_id) DO NOTHING;
