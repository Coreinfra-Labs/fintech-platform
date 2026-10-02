CREATE SCHEMA IF NOT EXISTS fraud;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS fraud.fraud_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,
    threshold_amount NUMERIC(18,2),
    risk_score INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fraud.fraud_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    transaction_id UUID,
    rule_id UUID,
    risk_score INT NOT NULL DEFAULT 0,
    alert_type VARCHAR(30) NOT NULL
        CHECK (alert_type IN ('HIGH_AMOUNT', 'UNUSUAL_TIME', 'MULTIPLE_FAILURES')),
    details JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'REVIEWED', 'RESOLVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fraud.fraud_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    score INT NOT NULL DEFAULT 0,
    score_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_alerts_user_id ON fraud.fraud_alerts (user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_status ON fraud.fraud_alerts (status);
