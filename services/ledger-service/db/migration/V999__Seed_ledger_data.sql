INSERT INTO ledger.account_balances (id, account_id, balance, currency)
VALUES
    (
        'lb111111-1111-4111-8111-111111111111',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        250000.00,
        'NGN'
    ),
    (
        'lb222222-2222-4222-8222-222222222222',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        500000.00,
        'NGN'
    )
ON CONFLICT (account_id) DO NOTHING;

INSERT INTO ledger.ledger_entries (
    id, account_id, entry_type, amount, currency, reference, description
)
VALUES
    (
        'le111111-1111-4111-8111-111111111111',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'CREDIT',
        250000.00,
        'NGN',
        'LEDGER-001',
        'Opening account balance'
    ),
    (
        'le222222-2222-4222-8222-222222222222',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        'CREDIT',
        500000.00,
        'NGN',
        'LEDGER-002',
        'Opening account balance'
    )
ON CONFLICT (reference) DO NOTHING;
