INSERT INTO notifications.notification_templates (
    id, template_name, subject, body, channel
)
VALUES
    (
        'n1111111-1111-4111-8111-111111111111',
        'welcome_email',
        'Welcome to FinTech Platform',
        'Hello {{first_name}}, welcome to the platform.',
        'EMAIL'
    ),
    (
        'n2222222-2222-4222-8222-222222222222',
        'transaction_completed_sms',
        'Transaction Completed',
        'Your transaction has been completed successfully.',
        'SMS'
    )
ON CONFLICT (template_name) DO NOTHING;
