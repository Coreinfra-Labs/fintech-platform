# Kafka Event Architecture

## Overview

This fintech platform uses Apache Kafka for asynchronous event-driven communication between microservices.

## Topics

| Topic | Producer | Consumers | Purpose |
|-------|----------|-----------|---------|
| `transactions` | transaction-service | fraud-service, transaction-service | New transaction events for fraud checking and processing |
| `transaction-completed` | transaction-service | notification-service | Transaction completion events for notifications |

## Consumer Groups

| Service | Consumer Group | Topics |
|---------|----------------|--------|
| transaction-service | `transaction-service-group` | `transactions` |
| fraud-service | `fraud-service-group` | `transactions` |
| notification-service | `notification-service-group` | `transaction-completed` |

## Event Payloads

### `transactions` Topic

**Producer**: transaction-service (when POST /api/transaction/create is called)

```json
{
  "transactionId": "uuid",
  "type": "TRANSFER|DEPOSIT|WITHDRAWAL|PAYMENT",
  "amount": 1000,
  "sourceWalletId": "uuid",
  "destinationWalletId": "uuid",
  "status": "PENDING",
  "timestamp": "ISO-8601 date"
}
