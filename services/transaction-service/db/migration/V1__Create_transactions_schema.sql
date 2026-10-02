CREATE SCHEMA IF NOT EXISTS transactions;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS transactions.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_wallet_id UUID,
    destination_wallet_id UUID,
    destination_account_number VARCHAR(20),
    destination_bank_code VARCHAR(10),
    amount NUMERIC(18,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    transaction_type VARCHAR(20) NOT NULL
        CHECK (transaction_type IN ('TRANSFER', 'DEPOSIT', 'WITHDRAWAL', 'PAYMENT')),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVERSED')),
    reference VARCHAR(100) NOT NULL UNIQUE,
    idempotency_key VARCHAR(255) UNIQUE,
    description TEXT,
    metadata JSONB,
    initiated_by_user_id UUID,
    failed_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    settled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_transactions_source_wallet_id ON transactions.transactions (source_wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_destination_wallet_id ON transactions.transactions (destination_wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_initiated_by_user_id ON transactions.transactions (initiated_by_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions.transactions (status);
