# FinTech Platform - Development Setup

## Prerequisites

- Docker and the Docker Compose plugin (`docker compose`)
- Git
- Node.js 20.19+ or 22.12+ and pnpm 9.8 or later for workspace development

## Start the full stack

From the repository root:

```bash
docker compose up --build
```

The services and host ports are:

| Component | URL |
| --- | --- |
| API Gateway | http://localhost:3000 |
| User Service | http://localhost:3001 |
| Wallet Service | http://localhost:3002 |
| Transaction Service | http://localhost:3003 |
| Payment Service | http://localhost:3004 |
| Fraud Service | http://localhost:3005 |
| Notification Service | http://localhost:3006 |
| NIBSS Mock | http://localhost:3007 |
| Ledger Service | http://localhost:3008 |
| DLQ Processor | http://localhost:3009 |
| Web Frontend | http://localhost:3010 |
| Kafka UI | http://localhost:8080 |

The gateway health check is `GET http://localhost:3000/health`. Swagger UI is
not configured at `/api-docs`; see [docs/API.md](docs/API.md) for the API
reference.

## Environment

Compose reads these optional values from a `.env` file in the repository root:

```env
JWT_SECRET=replace-this-development-secret
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-email-app-password
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE=your-twilio-phone-number
```

Email and SMS credentials are only needed when using those delivery methods.
Compose currently sets PostgreSQL credentials directly in `docker-compose.yaml`
(`fintech_user`, `fintech_secure_password`, database `fintech_db`) and sets
`FRAUD_THRESHOLD` to `500000`. Database values in `.env` do not override those
Compose settings.

## Development Commands

Install workspace dependencies:

```bash
pnpm install
```

Run a backend service through Nx, with its dependencies and environment
available:

```bash
pnpm nx run user-service:serve
```

Run the web app separately on port 3010 against the local gateway:

```bash
PORT=3010 REACT_APP_API_URL=http://localhost:3000/api pnpm --dir services/web start
```

Run tests for a service that defines an Nx test target:

```bash
pnpm nx run user-service:test
```

## Operations

```bash
docker compose down
docker compose logs -f
docker compose logs -f user-service
docker compose exec postgres psql -U fintech_user -d fintech_db
```

For detailed service architecture and deployment notes, see
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).