INSERT INTO wallets.wallets (
    id, user_id, account_number, account_type, currency,
    balance, available_balance, is_primary, is_frozen
)
VALUES
    (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        '11111111-1111-4111-8111-111111111111',
        '0001234567',
        'SAVINGS',
        'NGN',
        250000.00,
        250000.00,
        TRUE,
        FALSE
    ),
    (
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        '22222222-2222-4222-8222-222222222222',
        '0009876543',
        'SAVINGS',
        'NGN',
        500000.00,
        500000.00,
        TRUE,
        FALSE
    ),
    (
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        '33333333-3333-4333-8333-333333333333',
        '0050123456',
        'SAVINGS',
        'NGN',
        300000.00,
        300000.00,
        TRUE,
        FALSE
    )
ON CONFLICT (account_number) DO NOTHING;
