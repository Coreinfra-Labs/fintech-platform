INSERT INTO fraud.fraud_rules (id, rule_name, description, threshold_amount, risk_score, is_active)
VALUES
    (
        'f1111111-1111-4111-8111-111111111111',
        'high_amount_transfer',
        'Flag transfers above NGN 500,000',
        500000.00,
        50,
        TRUE
    ),
    (
        'f2222222-2222-4222-8222-222222222222',
        'unusual_time_transfer',
        'Flag transfers outside business hours',
        NULL,
        20,
        TRUE
    )
ON CONFLICT (rule_name) DO NOTHING;

INSERT INTO fraud.fraud_alerts (
    id, user_id, transaction_id, rule_id, risk_score, alert_type, details, status
)
VALUES
    (
        'fa1111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
        'ddd11111-1111-4111-8111-111111111111',
        'f1111111-1111-4111-8111-111111111111',
        55,
        'HIGH_AMOUNT',
        '{"amount": 20000, "currency": "NGN"}',
        'REVIEWED'
    )
ON CONFLICT (id) DO NOTHING;
