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
- The Fraud Service consumes `transactions`, calculates a score, stores fraud
  alerts, and publishes `fraud-alert` for scores above `HIGH_RISK_THRESHOLD`.
- The Notification Service attempts to subscribe to `transaction-completed`
  and `fraud-alert`, but exits during startup when KafkaJS rejects the second
  subscription.
- The DLQ Processor attempts to subscribe to four DLQ topics, but exits during
  startup when KafkaJS rejects the second subscription.
- Compose configures Kafka, Zookeeper, Kafka UI, and service broker addresses.

## Known Gaps

- The DLQ Processor only logs messages; retry and redrive are not implemented.
- The shared Kafka helper calls `consumer.run()` for every topic. KafkaJS 2.2.4
  rejects another `consumer.subscribe()` after the consumer is running. Both
  Notification Service and DLQ Processor need to subscribe to all their topics
  before calling `run()` once.
- Transaction consumer failures can be published to
  `transaction-failed-dlq`. Fraud and Notification consumer callback failures
  are logged rather than sent to their DLQ topics.
- `DLQService.processDLQMessage` contains retry helper logic, but the DLQ
  Processor does not call it.
- Payment Service contains a Kafka publish hook for `payment-initiated`, but
  its startup does not create/connect a Kafka service or inject one into the
  route. Payment events are therefore not published by the running service.
- After fixing Notification Service startup, its user lookup also needs
  correction: the consumer uses `/api/user/...`; User Service registers
  `/api/profile/:userId`, not `/api/user/...`.
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