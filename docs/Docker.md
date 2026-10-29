# Docker and Compose

The supported local container workflow is defined in the repository-root
`docker-compose.yaml`.

## Build and start

```bash
docker compose build
docker compose up
```

To rebuild before starting:

```bash
docker compose up --build
```

Build one service image with `docker compose build <service>`. Compose also
starts PostgreSQL, Redis, Zookeeper, Kafka, Kafka UI, the NIBSS mock, the
services, the frontend, and the OpenTelemetry Collector.

## Container layout

- Backend service images use Node.js 18 Alpine and run their Node application.
- The web image builds the React app with Node.js 18 and serves the static build
  using Nginx on container port 80. Compose publishes it at
  `http://localhost:3010`.
- Ledger and DLQ Processor use the repository root as the Docker build context
  because their Dockerfiles copy the shared library.
- Services connect to one another using Compose service names, for example
  Kafka at `kafka:29092` and PostgreSQL at `postgres:5432`.

The Dockerfiles are service-specific; this guide is not a standalone Dockerfile
template. In particular, the Wallet Service image does not currently bundle
with esbuild or declare a non-root runtime user.

## Operations

```bash
docker compose ps
docker compose logs -f
docker compose logs -f transaction-service
docker compose down
```

`docker compose down -v` also deletes the PostgreSQL data volume; use it only
when database data can be discarded. The root `.env.example` is a reference,
not an automatically loaded file. Copy needed Compose variables to `.env` in
the repository root.