CREATE SCHEMA IF NOT EXISTS wallets;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS wallets.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    account_number VARCHAR(20) NOT NULL UNIQUE,
    account_type VARCHAR(20) NOT NULL DEFAULT 'SAVINGS'
        CHECK (account_type IN ('SAVINGS', 'CHECKING')),
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    balance NUMERIC(18,2) NOT NULL DEFAULT 0.00,
    available_balance NUMERIC(18,2) NOT NULL DEFAULT 0.00,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    is_frozen BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets.wallets (user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_account_number ON wallets.wallets (account_number);
