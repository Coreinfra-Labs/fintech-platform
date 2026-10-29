# Deployment Guide

## Local Compose deployment

The checked-in Compose file is the available all-in-one development stack. From
the repository root:

```bash
docker compose up --build
docker compose ps
docker compose logs -f
```

The web app is available at `http://localhost:3010` and the API Gateway at
`http://localhost:3000`. Compose publishes PostgreSQL, Redis, Kafka, Zookeeper,
and service ports on the host for development. Do not expose this configuration
directly as a production deployment: it has no production override and includes
development credentials and broadly published ports.

Environment variables interpolated by Compose can be supplied in a root `.env`
file. PostgreSQL settings and `FRAUD_THRESHOLD` are currently hard-coded in
`docker-compose.yaml`; editing similarly named `.env` values will not override
them.

## Cloud workflow status

The repository contains these GitHub Actions workflows:

1. `release.yml` manually builds one selected service image and pushes an
   immutable tag to AWS ECR. It must be run from `develop` and currently
   supports the API Gateway, User, Wallet, Transaction, Payment, Fraud, and
   Notification services only.
2. `deploy-dev.yaml` follows a successful release and deploys to EKS using
   direct `kubectl` commands.
3. `deploy-staging.yaml` promotes release metadata through a GitOps repository
   and Argo CD.
4. `deploy-production.yaml` manually promotes an approved release through
   GitOps and Argo CD.

These are workflow implementations, not a ready-to-use deployment environment.
The dev workflow contains `YOUR-DEV-EKS-CLUSTER`; staging and production contain
`YOUR_ORG`, source/GitOps repository, and Argo CD server placeholders. AWS
roles, repository access, GitHub environments, and required secrets must be
configured and the workflows tested before deployment. No Helm chart or
`docker-compose.prod.yaml` is checked in.

## Database migrations

Service Flyway migrations are stored in
`services/<service>/db/migration/`. The `flyway-migration.yaml` workflow attempts
to run these migrations against a temporary PostgreSQL instance; review that
workflow's triggers and environment before relying on it. The separate
`scripts/migrate-db.sh` script looks for `./migrations` at the repository root,
which is not where the service Flyway migrations live, so it is not a substitute
for the Flyway workflow.

## Health and operations

Compose defines health checks for its services. Useful local checks:

```bash
docker compose ps
curl http://localhost:3000/health
curl http://localhost:3010/
docker compose logs -f <service-name>
```

For current ports and local operations, see [Docker.md](Docker.md). For cloud
workflow details and required configuration, see [CICD.md](CICD.md).