CREATE SCHEMA IF NOT EXISTS notifications;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS notifications.notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(255) NOT NULL UNIQUE,
    subject VARCHAR(255),
    body TEXT NOT NULL,
    channel VARCHAR(20) NOT NULL
        CHECK (channel IN ('EMAIL', 'SMS', 'PUSH')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    template_id UUID,
    channel VARCHAR(20) NOT NULL
        CHECK (channel IN ('EMAIL', 'SMS', 'PUSH')),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'QUEUED', 'SENT', 'FAILED')),
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notifications.notification_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notifications.notification_logs (status);
CREATE INDEX IF NOT EXISTS idx_notification_templates_name ON notifications.notification_templates (template_name);
