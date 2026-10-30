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

Backend services expose their OpenTelemetry metrics endpoint on container port
`9464`. `monitoring/prometheus.yml` is configured to scrape these endpoints;
Prometheus itself is not currently a Compose service and must join the
`fintech-network` (or have the metrics ports published) to reach them. The
The Node SDKs enable HTTP, Express, KafkaJS and PostgreSQL auto-instrumentation;
HTTP and KafkaJS emit metrics to the Prometheus endpoints. The web app sends
browser traces through the web container's same-origin `/otel/` proxy to the
Collector, avoiding Docker-only DNS in the browser. The Collector receives
OTLP traces on ports `4317`/`4318`, but its configured trace pipeline writes to
Collector logs rather than persistent trace storage. Application logs are
JSON on stdout for a separately configured log shipper; trace/span IDs are
included when a span is active.

## Container layout

- Backend service images use the repository root as their Docker build context.
  Their Dockerfiles install the root pnpm workspace and run the selected
  service entry point; service runtime dependencies are declared in the root
  `package.json`.
- The web app remains standalone, with its own `package.json` and lockfile. Its
  image builds the React app with Node.js 18 and serves the static build using
  Nginx on container port 80. Compose publishes it at `http://localhost:3010`.
- Services connect to one another using Compose service names, for example
  Kafka at `kafka:29092` and PostgreSQL at `postgres:5432`.

The backend Dockerfiles use the repository-root `pnpm-lock.yaml` for
reproducible dependency installation. They include the installed workspace in
the runtime image so local shared-library links resolve correctly.

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