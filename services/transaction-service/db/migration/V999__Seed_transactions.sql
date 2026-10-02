INSERT INTO transactions.transactions (
    id, source_wallet_id, destination_wallet_id, destination_account_number,
    destination_bank_code, amount, currency, transaction_type, status,
    reference, idempotency_key, description, initiated_by_user_id
)
VALUES
    (
        'ddd11111-1111-4111-8111-111111111111',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        '0009876543',
        '009',
        20000.00,
        'NGN',
        'TRANSFER',
        'COMPLETED',
        'TXN-2026000001',
        'txn-2026000001',
        'Initial wallet transfer demo',
        '22222222-2222-4222-8222-222222222222'
    ),
    (
        'eee22222-2222-4222-8222-222222222222',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        '0001234567',
        '001',
        50000.00,
        'NGN',
        'TRANSFER',
        'COMPLETED',
        'TXN-2026000002',
        'txn-2026000002',
        'Second transfer demo',
        '22222222-2222-4222-8222-222222222222'
    )
ON CONFLICT (reference) DO NOTHING;
