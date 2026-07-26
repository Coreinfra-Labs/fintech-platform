# FinTech Platform

A production-style **FinTech Microservices Platform** organized as an **Nx Monorepo**.

This project demonstrates how to migrate an existing Node.js microservices architecture into an Nx workspace while preserving each service as an independent application.

The repository showcases modern engineering practices including:

- 🚀 Nx Monorepo
- ⚡ Incremental builds
- 📦 Shared libraries
- 🔍 Dependency graph visualization
- 🧪 Centralized testing
- ☁️ Nx Cloud remote caching
- 🔄 CI/CD automation
- 🐳 Docker-ready services

---

## Architecture

```
                  +--------------------+
                  |    API Gateway     |
                  +---------+----------+
                            |
     -----------------------------------------------------
     |          |            |            |              |
 User      Payment     Transaction   Notification    Fraud
Service      Service      Service       Service      Service

                Shared Libraries (libs/)
      ---------------------------------------------
      Auth | Logger | Kafka | Config | Shared Types
```

---

## Project Structure

```text
services/
├── api-gateway
├── payment-service
├── transaction-service
├── notification-service
├── fraud-service
├── user-service
├── wallet-service
└── mock-service

libs/
├── auth
├── config
├── kafka
├── logger
└── shared-types
```

---

## Why Nx?

Nx understands the relationships between applications and libraries.

That enables:

- Shared reusable code
- Dependency-aware builds
- Incremental testing
- Faster CI/CD
- Project graph visualization
- Better maintainability

---

## Technology Stack

| Technology | Purpose |
|------------|---------|
| Node.js | Backend services |
| Express | REST APIs |
| React | Frontend |
| Nx | Monorepo management |
| Vite | Frontend bundler |
| Vitest | Unit testing |
| Playwright | End-to-end testing |
| ESLint | Code quality |
| Docker | Containerization |
| Nx Cloud | Remote caching |

---

## Getting Started

Clone the repository

```bash
git clone <repository-url>

cd fintech-platform
```

Install dependencies

```bash
pnpm install
```

View all registered projects

```bash
pnpm nx show projects
```

Generate the dependency graph

```bash
pnpm nx graph
```

---

## Common Nx Commands

Serve a service

```bash
pnpm nx serve payment-service
```

Build

```bash
pnpm nx build payment-service
```

Lint

```bash
pnpm nx lint payment-service
```

Test

```bash
pnpm nx test payment-service
```

---

## Nx Cloud

This project supports **Nx Cloud** for:

- Remote caching
- Faster CI
- Distributed task execution

Connect your workspace

```bash
pnpm nx connect
```

---

## Continuous Integration

Generate an Nx CI workflow

```bash
pnpm nx g ci-workflow
```

---

## Documentation

Detailed documentation is available in the **docs** folder.

- **docs/NX_SETUP.md** — Complete Nx setup guide
- **docs/TROUBLESHOOTING.md** — Common issues and fixes
- **docs/ARCHITECTURE.md** — Architecture overview

---

## Skills Demonstrated

- Nx Monorepo
- Node.js Microservices
- Express
- React
- Dependency Graph Analysis
- Incremental Builds
- Shared Libraries
- Docker
- GitHub Actions
- Nx Cloud
- Playwright
- Vitest
- ESLint

---

## License

MIT