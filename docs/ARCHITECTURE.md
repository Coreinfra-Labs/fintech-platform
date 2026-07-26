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