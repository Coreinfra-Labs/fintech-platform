CREATE TABLE IF NOT EXISTS wallets.wallet_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL,
    cache_key VARCHAR(255) NOT NULL,
    value JSONB,
    cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_cache_wallet_id ON wallets.wallet_cache (wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_cache_key ON wallets.wallet_cache (cache_key);


