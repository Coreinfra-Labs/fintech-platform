# Kafka Event Architecture

Kafka topic names and consumer groups are defined in
`libs/shared-libs/constants/kafkaTopics.js`. Compose exposes the broker at
`localhost:9092`; containers connect to `kafka:29092`.

## Active Event Paths

| Topic | Producer | Consumer group | Consumer | Current behavior |
| --- | --- | --- | --- | --- |
| `transactions` | Transaction Service | `transaction-service-group` | Transaction Service | Sets transaction to `PROCESSING`, calls Ledger when configured, then marks `COMPLETED` and publishes completion. |
| `transactions` | Transaction Service | `fraud-service-group` | Fraud Service | Calculates a score and creates an alert for triggered rules; publishes `fraud-alert` when score is above `HIGH_RISK_THRESHOLD`. |
| `transaction-completed` | Transaction Service | `notification-service-group` | Notification Service | Sends completion email/SMS when contact details and provider credentials are available. |
| `payment-initiated` | Transaction Service, for `PAYMENT` transactions | `notification-service-group` | Notification Service | Sends an initiation email/SMS when contact details and a provider are available. |
| `payment-completed` | Transaction Service, after successful `PAYMENT` settlement | `notification-service-group` | Notification Service | Uses the same completion notification handler. |
| `fraud-alert` | Fraud Service | `notification-service-group` | Notification Service | Sends a fraud alert email when recipient and provider are available. |

The transaction event contains `transactionId`, `type`, `amount`, wallet IDs,
`status`, `timestamp`, and the shared Kafka envelope's `messageId`. The completion
event contains transaction ID, status, amount, type, and wallet IDs.
Payment initiation uses the `PAYMENT` transaction event's transaction ID,
source wallet, amount, destination, and pending status.

## Dead-Letter Topics

The DLQ topics are `transaction-failed-dlq`, `fraud-check-dlq`,
`notification-dlq`, and `payment-failed-dlq`. Transaction settlement failures
publish to the transaction DLQ, Fraud callback failures to the fraud DLQ,
Notification callback failures to the notification DLQ, and PAYMENT settlement
failures to the payment DLQ. The DLQ Processor subscribes to all four under
`dlq-processor-group` and logs received messages. It does not retry or redrive
them yet.

The shared Kafka helper registers all subscriptions before calling
`consumer.run()` once, which allows the Notification Service and DLQ Processor
to consume multiple topics.

## Operational Notes

- `LEDGER_SERVICE_URL` is set by Compose. If omitted, the transaction consumer
  still marks the transaction complete without ledger settlement.
- Fraud consumer rules use `FRAUD_THRESHOLD` (default `500000`),
  `HIGH_RISK_THRESHOLD` (default `50`), transaction timestamp, and a global
  count of fraud alerts. This differs from the HTTP fraud-check route's rules.
- Notification recipient lookup resolves wallet ownership and calls the
  authenticated User Service profile route. It signs the internal request with
  `JWT_SECRET`, falling back to Compose's development secret; set the same
  secret for Notification Service in deployments that override the default.
- Kafka UI is available at http://localhost:8080 when Compose is running.