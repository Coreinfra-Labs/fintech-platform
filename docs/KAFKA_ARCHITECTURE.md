# Kafka Event Architecture

Kafka topic names and consumer groups are defined in
`libs/shared-libs/constants/kafkaTopics.js`. Compose exposes the broker at
`localhost:9092`; containers connect to `kafka:29092`.

## Active Event Paths

| Topic | Producer | Consumer group | Consumer | Current behavior |
| --- | --- | --- | --- | --- |
| `transactions` | Transaction Service | `transaction-service-group` | Transaction Service | Sets transaction to `PROCESSING`, calls Ledger when configured, then marks `COMPLETED` and publishes completion. |
| `transactions` | Transaction Service | `fraud-service-group` | Fraud Service | Calculates a score and creates an alert for triggered rules; publishes `fraud-alert` when score is above `HIGH_RISK_THRESHOLD`. |
| `transaction-completed` | Transaction Service | `notification-service-group` | Notification Service | First topic subscription; service startup then fails on the second subscription. |
| `fraud-alert` | Fraud Service | `notification-service-group` | Notification Service | Subscription is rejected by KafkaJS after `consumer.run()` starts. |

The transaction event contains `transactionId`, `type`, `amount`, wallet IDs,
`status`, `timestamp`, and the shared Kafka envelope's `messageId`. The completion
event contains transaction ID, status, amount, type, and wallet IDs.

## Dead-Letter Topics

The shared topic constants include `transaction-failed-dlq`, `fraud-check-dlq`,
`notification-dlq`, and `payment-failed-dlq`. The transaction consumer publishes
to `transaction-failed-dlq` when ledger recording or processing fails. The DLQ
Processor attempts to subscribe to all four topics under
`dlq-processor-group`, but startup fails on the second subscription. Its handler
only logs messages; retry and redrive are not implemented. The Fraud consumer
logs callback errors instead of publishing them to its DLQ topic. Payment does
not initialize Kafka, so its declared Kafka topics are not produced by the
running service.

The shared Kafka helper calls `consumer.run()` after each topic subscription.
KafkaJS 2.2.4 rejects `consumer.subscribe()` after a consumer is running. The
Notification Service and DLQ Processor must subscribe to all topics before
calling `run()` once for their consumers to start reliably.

## Operational Notes

- `LEDGER_SERVICE_URL` is set by Compose. If omitted, the transaction consumer
  still marks the transaction complete without ledger settlement.
- Fraud consumer rules use `FRAUD_THRESHOLD` (default `500000`),
  `HIGH_RISK_THRESHOLD` (default `50`), transaction timestamp, and a global
  count of fraud alerts. This differs from the HTTP fraud-check route's rules.
- Notification Service exits during startup when it attempts its second topic
  subscription. After that is fixed, its lookups also need attention: the
  consumer uses `/api/user/...`, which is not a User Service route.
- Kafka UI is available at http://localhost:8080 when Compose is running.