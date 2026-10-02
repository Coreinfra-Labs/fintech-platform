INSERT INTO payments.payments (
    id, user_id, wallet_id, destination_account_number, destination_bank_code,
    amount, currency, status, provider, reference
)
VALUES
    (
        'p1111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        '0001234567',
        '001',
        45000.00,
        'NGN',
        'COMPLETED',
        'NIBSS',
        'PAY-2026000001'
    ),
    (
        'p2222222-2222-4222-8222-222222222222',
        '33333333-3333-4333-8333-333333333333',
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        '0009876543',
        '009',
        75000.00,
        'NGN',
        'PROCESSING',
        'NIBSS',
        'PAY-2026000002'
    )
ON CONFLICT (reference) DO NOTHING;
