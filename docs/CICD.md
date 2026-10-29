# CI/CD Workflows

GitHub Actions workflows are under `.github/workflows/`. This page summarizes
the checked-in configuration; it does not imply that cloud deployments are
ready to run.

## Workflow map

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| `nx-ci.yaml` | Pull requests; pushes to `develop` and `main`; manual dispatch | Runs affected Nx checks for normal events and full Nx checks on manual dispatch. |
| `release.yml` | Manual dispatch | Builds and publishes one selected service image to AWS ECR. Release must be dispatched from `develop`. |
| `deploy-dev.yaml` | Successful Release workflow run from `develop` | Verifies release metadata and deploys the released image to the dev EKS cluster. |
| `deploy-staging.yaml` | Successful Deploy Dev workflow run | Promotes the release through the staging GitOps repository and Argo CD. |
| `deploy-production.yaml` | Manual dispatch | Promotes an approved release through the production GitOps repository and Argo CD. |
| `flyway-migration.yaml` | Workflow-specific trigger | Runs database migration automation. |

Additional workflows handle security scanning and Dependabot notifications.
Inspect the individual YAML files for their exact triggers and required secrets.

## Nx CI

For pull requests and pushes to `develop` or `main`, `nx-ci.yaml` runs affected
`lint`, `test-ci`, `typecheck`, `build`, and `e2e` targets. A manual dispatch
runs the corresponding targets across all projects. The workflow pins Node.js
23.3.0 and pnpm 9.8.0. Nx Cloud distribution is commented out and the Nx
commands use `--no-cloud`.

## Release images

`release.yml` is manually dispatched with a service and semantic version. It
currently accepts only:

```text
api-gateway
user-service
payment-service
wallet-service
transaction-service
notification-service
fraud-service
```

Ledger, DLQ Processor, web, and NIBSS Mock have Dockerfiles but are not accepted
by this release workflow. The release validates that it runs from `develop`,
builds the selected service image, checks ECR tag immutability, pushes a version
and commit-based tag, and records release metadata including the image digest.

## Environment deployments

- Dev uses direct `kubectl` operations against EKS. The workflow still contains
  `YOUR-DEV-EKS-CLUSTER` and requires its AWS and release-artifact credentials.
- Staging and production update a separate GitOps repository and use Argo CD.
  Their checked-in workflow files still contain `YOUR_ORG`, repository, and
  Argo CD server placeholders, and require GitHub App/AWS/Argo CD credentials.
- Production is manually dispatched and requires the release run ID, release
  ID, service, and version.

Replace and validate these placeholders, configure repository environments and
secrets, and test the deployment workflows before treating them as operational.
There is no checked-in Helm chart or `ci.yml`/`deploy.yml` workflow matching the
older documentation.

## Local checks

The Nx CI commands can be run locally from the repository root:

```bash
pnpm nx affected -t lint,test-ci,typecheck,build --no-cloud
pnpm nx affected -t e2e --no-cloud
```

Use the full-project `run-many` targets from `nx-ci.yaml` when validating all
projects. Some projects do not define every target, so inspect Nx project
configuration when a local target is unavailable.