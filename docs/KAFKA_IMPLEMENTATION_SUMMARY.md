# Kafka Implementation Status

This document describes the current checked-in behavior. For topic names and
the event table, see [KAFKA_ARCHITECTURE.md](KAFKA_ARCHITECTURE.md).

## Implemented

- KafkaJS client, topic constants, and message validators live in
  `libs/shared-libs`.
- The Transaction Service publishes a `transactions` event after creating a
  transaction. Its consumer marks the transaction `PROCESSING`, calls the
  Ledger Service when configured, then marks it `COMPLETED` and publishes
  `transaction-completed`.
- PAYMENT transactions also publish `payment-initiated`; after successful
  settlement they publish `payment-completed` instead of
  `transaction-completed`.
- The Fraud Service consumes `transactions`, calculates a score, stores fraud
  alerts, and publishes `fraud-alert` for scores above `HIGH_RISK_THRESHOLD`.
- The Notification Service batch-subscribes to payment initiation, transaction
  completion, payment completion, and fraud-alert topics. It resolves recipient
  contact through the Wallet and User Services and routes handler failures to
  `notification-dlq`.
- Transaction, Fraud, Notification, and PAYMENT settlement failures publish to
  their corresponding declared DLQ topics.
- The DLQ Processor batch-subscribes to all four DLQ topics and logs messages.
- Compose configures Kafka, Zookeeper, Kafka UI, and service broker addresses.

## Known Gaps

- The DLQ Processor only logs messages; retry and redrive are not implemented.
- The DLQ Processor only logs messages; retry and redrive are not implemented.
- `DLQService.processDLQMessage` contains retry helper logic, but the DLQ
  Processor does not call it.
- The standalone Payment Service still does not start Kafka; transaction-based
  payment events are emitted by the Kafka-connected Transaction Service.
- Notification Service signs internal profile requests using
  `JWT_SECRET`. Compose provides the same default secret to the gateway and User
  Service but does not pass a custom `.env` override to Notification Service.
  Deployments using a custom secret must provide it to Notification Service.
- If `LEDGER_SERVICE_URL` is unset, the transaction consumer completes the
  transaction without recording ledger entries. Compose sets the URL, and the
  consumer appends `/api/ledger/record` to that service base URL.
- Fraud consumer scoring and the HTTP `/api/fraud/check` route use different
  rules and thresholds. Consumer scoring uses hours 22:00-05:59 and a global
  fraud-alert count; the HTTP route checks hours 02:00-05:59 and counts recent
  alerts for the requested user.

## Configuration

Compose currently sets `KAFKA_BROKERS=kafka:29092` for Kafka consumers. The
broker is published on host port `9092`, Kafka UI on `8080`, and the default
fraud values in Compose are `FRAUD_THRESHOLD=500000` and
`HIGH_RISK_THRESHOLD=50`.

## Verification

Nx registers the service projects. Run available service tests from the
repository root, for example:

```bash
pnpm nx run transaction-service:test
pnpm nx run fraud-service:test
pnpm nx run notification-service:test
```

These commands have not been run as part of this documentation review.