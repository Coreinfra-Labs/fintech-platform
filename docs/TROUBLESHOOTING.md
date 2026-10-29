# Troubleshooting

Run commands from the repository root unless noted otherwise.

## Nx cannot find a project or target

```bash
pnpm nx show projects
pnpm nx show project <project-name>
pnpm nx report
```

Projects and targets are declared in `project.json` files or inferred by Nx
plugins. Not every project provides the same targets. Use `pnpm nx reset` to
clear Nx's local cache; this does not remove dependencies or the lockfile.

## Dependency install or lockfile mismatch

Use the checked-in lockfile and the CI package-manager version:

```bash
pnpm --version
pnpm install --frozen-lockfile
```

Do not delete `pnpm-lock.yaml` as a troubleshooting step. If dependency
resolution fails, inspect the package-manager error and make any intended
manifest/lockfile update explicitly.

## Compose service is unhealthy or exits

```bash
docker compose ps
docker compose logs --tail=100 <service-name>
docker compose config
```

Check dependencies first: PostgreSQL, Redis, Zookeeper, and Kafka are shared by
services. Health endpoints are available at `/health` on the backend service
ports. The web container serves Nginx on container port 80 and host port 3010.

## Database connection or schema issue

```bash
docker compose logs --tail=100 postgres
docker compose exec postgres pg_isready -U fintech_user -d fintech_db
docker compose exec postgres psql -U fintech_user -d fintech_db
```

Compose currently defines the development database credentials directly in
`docker-compose.yaml`. Do not assume values in `.env` override those hard-coded
settings. Flyway migrations are stored under each service's `db/migration`
directory; review [DEPLOYMENT.md](DEPLOYMENT.md) and the migration workflow
before applying changes.

## Kafka connection issue

```bash
docker compose logs --tail=100 zookeeper kafka
docker compose logs --tail=100 transaction-service
docker compose exec kafka kafka-topics --bootstrap-server kafka:29092 --list
```

Containers use `kafka:29092`; host tools use `localhost:9092`. Kafka UI is at
http://localhost:8080. The DLQ Processor currently logs dead-letter messages;
it does not retry or redrive them.

## Frontend cannot reach the API

The gateway is `http://localhost:3000`; the web container is
`http://localhost:3010`. For local frontend development, set
`REACT_APP_API_URL=http://localhost:3000/api` and run the web package on a free
port. Confirm the gateway is healthy with `curl http://localhost:3000/health`.