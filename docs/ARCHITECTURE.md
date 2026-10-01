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
│   ├── payment-service
│   ├── transaction-service
│   ├── notification-service
│   ├── fraud-service
│   ├── user-service
│   ├── wallet-service
│   └── mock-service
│
├── libs/
│   ├── auth
│   ├── config
│   ├── kafka
│   ├── logger
│   ├── shared-types
│   └── utils
│
├── docs/
└── nx.json
```

---

## Shared Libraries

Reusable code lives inside `libs/`.

Examples include:

- Authentication middleware
- Logging
- Configuration
- Kafka client
- Shared TypeScript types
- Helper functions

This eliminates duplicate code while ensuring every service uses the same implementation.

---

## Microservice Architecture

```text
                     API Gateway
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   Payment          Transaction      Notification
        │
      Wallet
        │
      User
        │
      Fraud

             Shared Libraries (libs/)
```

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

This fintech platform uses Apache Kafka for asynchronous event-driven communication between microservices. The architecture now includes:
- **Double-entry bookkeeping ledger** for accurate transaction settlement
- **Dead Letter Queue (DLQ)** for handling failed messages with retry logic
- **Message schema validation** to ensure data integrity
- **User-wallet mapping** for notification delivery

## Microservices

### 1. Transaction Service (Port 3003)
- Creates transactions and publishes to `transactions` topic
- Consumes processed transactions
- Calls Ledger Service for settlement
- Publishes to `transaction-completed` on success

### 2. Ledger Service (Port 3008) **NEW**
- Records double-entry bookkeeping entries
- Updates wallet balances via Wallet Service
- Validates ledger consistency
- Supports TRANSFER, DEPOSIT, WITHDRAWAL, PAYMENT transaction types

### 3. Fraud Service (Port 3005)
- Consumes `transactions` topic
- Performs fraud scoring
- Creates alerts if risk score >= threshold
- Sends failed messages to `fraud-check-dlq`

### 4. Notification Service (Port 3006)
- Consumes `transaction-completed` topic
- Maps wallet ID → user ID → contact info
- Sends email and SMS notifications
- Sends failed messages to `notification-dlq`

## Topics & Consumers


