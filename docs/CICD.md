# CI/CD Workflows

GitHub Actions workflows are under `.github/workflows/`. This page summarizes
the checked-in configuration; it does not imply that cloud deployments are
ready to run.

## Workflow map

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| `security/security-gate.yml` | Pull requests to and pushes to `develop` and `main`; manual dispatch | Aggregate required PR/push gate for Nx CI, SonarQube, Gitleaks, and dependency scans. |
| `nx-ci.yaml` | Pull requests; manual dispatch; reusable workflow call | Runs affected Nx checks for normal events and full Nx checks on manual dispatch. The security gate calls it as a reusable workflow. |
| `pr-lifecycle-notification.yaml` | Successful CI Security Gate run; approval and merge events for PRs to `develop`/`main` | Sends Slack messages for current-head checks-passed, any approval, and merge. |
| `security-scheduled.yaml` | Daily at 02:00 UTC; manual dispatch | Runs the reusable SCA workflow and stores scan statuses. |
| `security-notification.yaml` | Completion of Security - Scheduled | Sends a Slack security summary only when the scheduled workflow fails. |
| `release.yml` | Manual dispatch | Builds and publishes one selected service image to AWS ECR. Release must be dispatched from `develop`. |
| `deploy-dev.yaml` | Manual dispatch (`list` or `deploy`) | Lists successful releases or deploys selected release runs to dev. |
| `deploy-staging.yaml` | Manual dispatch with a Release run ID | Validates a successful Release run from `develop`, then promotes through staging GitOps and Argo CD. |
| `deploy-production.yaml` | Manual dispatch | Promotes an approved release through the production GitOps repository and Argo CD. |
| `flyway-migration.yaml` | Workflow-specific trigger | Runs database migration automation. |

Additional workflows handle Dependabot updates and notifications. For the
end-to-end PR review, branch ruleset, Slack setup, and operator procedures, see
[PR-LIFECYCLE-RUNBOOK.md](PR-LIFECYCLE-RUNBOOK.md). Inspect individual workflow
files for exact inputs and required credentials.

## Nx CI

For pull requests and pushes to `develop` or `main`,
`security/security-gate.yml` calls Nx CI, SonarQube, Gitleaks, and the
dependency scan. Its aggregate `Security Gate` job fails unless all four
checks succeed. `nx-ci.yaml` also has a direct pull-request trigger, so Nx CI
may run separately in addition to the reusable run inside the security gate.
A manual dispatch runs the corresponding targets across all projects. The Nx
workflow pins Node.js 23.3.0 and pnpm 9.8.0. Nx Cloud distribution is
commented out and the Nx commands use `--no-cloud`.

## Release images

`release.yml` is manually dispatched with a service and semantic version. It
currently accepts:

```text
api-gateway
dlq-processor
mock-service
ledger-service
user-service
payment-service
wallet-service
transaction-service
notification-service
fraud-service
web
```

The workflow validates that it runs from `develop`, builds the selected service
image, checks ECR tag immutability, pushes a version and commit-based tag, and
records release metadata including the image digest. The `mock-service` option
uses the NIBSS mock Dockerfile path.

## Environment deployments

- Dev uses direct `kubectl` operations against EKS and is manually dispatched
  to list or deploy selected release runs. Configure `EKS_CLUSTER_NAME` as a
  variable and the required AWS credentials in the `dev` GitHub Environment.
  The workflow fails clearly if the cluster name is missing and checks that
  AWS reports the cluster as `ACTIVE`.
- Staging and production update a separate GitOps repository and use Argo CD.
  Their checked-in workflow files still contain `YOUR_ORG`, repository, and
  Argo CD server placeholders, and require GitHub App/AWS/Argo CD credentials.
- Production is manually dispatched and requires the release run ID, release
  ID, service, and version.
- The checked-in deployment workflows do not currently send Slack deployment
  success/failure notifications.

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