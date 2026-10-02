INSERT INTO users.users (
    id, email, password_hash, first_name, last_name, phone_number,
    bvn, account_status, email_verified, phone_verified, kyc_status, kyc_verified_at
)
VALUES
    (
        '11111111-1111-4111-8111-111111111111',
        'admin@fintech.com',
        '$2a$10$N1Bq7eqC5pI/jwB8Ur7VYH4dnHHo8vDw1xsdIqZ0ozkD2M3d7M6n2',
        'System',
        'Admin',
        '+2348000000001',
        'BVN00000001',
        'ACTIVE',
        TRUE,
        TRUE,
        'APPROVED',
        NOW()
    ),
    (
        '22222222-2222-4222-8222-222222222222',
        'test@fintech.com',
        '$2a$10$N1Bq7eqC5pI/jwB8Ur7VYH4dnHHo8vDw1xsdIqZ0ozkD2M3d7M6n2',
        'John',
        'Doe',
        '+2348000000002',
        'BVN00000002',
        'ACTIVE',
        TRUE,
        TRUE,
        'APPROVED',
        NOW()
    ),
    (
        '33333333-3333-4333-8333-333333333333',
        'jane@fintech.com',
        '$2a$10$N1Bq7eqC5pI/jwB8Ur7VYH4dnHHo8vDw1xsdIqZ0ozkD2M3d7M6n2',
        'Jane',
        'Smith',
        '+2348000000003',
        'BVN00000003',
        'ACTIVE',
        TRUE,
        TRUE,
        'APPROVED',
        NOW()
    )
ON CONFLICT (email) DO NOTHING;
