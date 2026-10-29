# Architecture Overview

## Why Nx?

This project uses **Nx** to manage multiple microservices inside a single monorepo.

Rather than treating each service as an isolated project, Nx understands the relationships between applications and shared libraries, allowing it to perform dependency-aware builds, testing, and caching.

## Repository Structure

```text
fintech-platform/
│
├── services/
│   ├── api-gateway
│   ├── user-service
│   ├── wallet-service
│   ├── transaction-service
│   ├── ledger-service
│   ├── payment-service
│   ├── fraud-service
│   ├── notification-service
│   ├── dlq-processor
│   ├── mock-services/nibss-mock
│   ├── web
│   └── web-e2e
│
├── libs/shared-libs/
│   ├── constants
│   ├── middleware
│   ├── patterns
│   ├── services
│   ├── utils
│   └── validators
│
├── docs/
└── nx.json
```

---

## Shared Libraries

Reusable code is published as the local `fintech-shared-libs` workspace package.

It currently contains:

- Authentication, error-handling, and rate-limit middleware
- Kafka client, topics, and message validators
- Logging utilities
- Outbox/inbox and DLQ retry-policy helpers

There are no separate `auth`, `config`, `kafka`, `logger`, or `shared-types` Nx libraries.

---

## Microservice Architecture

```text
Browser ──HTTP──> Web (3010) ──HTTP──> API Gateway (3000)
                                        ├── User (3001)
                                        ├── Wallet (3002)
                                        ├── Transaction (3003)
                                        ├── Payment (3004)
                                        ├── Fraud (3005)
                                        ├── Notification (3006)
                                        └── (gateway does not proxy Ledger)

Transaction ──Kafka: transactions──> Transaction Consumer ──HTTP──> Ledger (3008)
                                  └─> Fraud Consumer
Transaction ──Kafka: transaction-completed──> Notification (startup currently fails)
Fraud ──Kafka: fraud-alert──> Notification (startup currently fails)
Payment Service ──HTTP──> NIBSS Mock (3007)
DLQ Processor startup currently fails on its second topic subscription

PostgreSQL, Redis, and Kafka are shared infrastructure in docker-compose.yaml.
```

The transaction consumer completes a transaction without ledger settlement when
`LEDGER_SERVICE_URL` is unset. Notification Service has the same multiple-topic
startup issue as DLQ Processor. The payment route has a Kafka publish hook, but
the payment service startup does not initialize Kafka, so payment events are
not currently published.

---

## Benefits

- Shared code
- Faster builds
- Faster tests
- Dependency graph
- Incremental CI
- Better maintainability
- Single source of truth




# Kafka Event Architecture

## Overview

Kafka is used by transaction, fraud, and notification consumers. Topic names and
consumer-group identifiers are centralized in
`libs/shared-libs/constants/kafkaTopics.js`.

## Microservices

### 1. Transaction Service (Port 3003)
- Creates transactions and publishes to `transactions` topic
- Consumes processed transactions
- Calls Ledger Service for settlement
- Publishes to `transaction-completed` on success

### 2. Ledger Service (Port 3008)
- Records paired ledger entries and requests wallet balance updates
- Exposes record, validate, and transaction-entry routes
- Is called by the transaction consumer when `LEDGER_SERVICE_URL` is configured

### 3. Fraud Service (Port 3005)
- Consumes `transactions` topic
- Performs fraud scoring
- Creates alerts and publishes `fraud-alert` events for scores above the configured threshold
- Consumer errors are logged; the consumer does not currently send them to a DLQ

### 4. Notification Service (Port 3006)
- Consumes `transaction-completed` topic
- Subscribes to `transaction-completed` and `fraud-alert`
- Attempts email and SMS delivery when contact details and credentials are available
- Delivery and lookup errors are logged; the consumer does not currently send them to a DLQ

## Topics & Consumers

| Topic | Producer | Consumer | Current behavior |
| --- | --- | --- | --- |
| `transactions` | Transaction Service | Transaction Service, Fraud Service | Settlement processing and fraud scoring |
| `transaction-completed` | Transaction Service | Notification Service | Completion notification |
| `fraud-alert` | Fraud Service | Notification Service | Fraud alert email attempt |
| `transaction-failed-dlq`, `fraud-check-dlq`, `notification-dlq`, `payment-failed-dlq` | Service-specific hooks | DLQ Processor | Logs received messages; no retry/redrive |

`payment-initiated` and `payment-completed` are declared topic constants, but
the Payment Service does not currently start a Kafka producer or consumer.


