# Nx Workspace Guide

Nx is already configured at the repository root. The pnpm workspace includes
`services/*` and `libs/*`; service targets are defined in project files and
Nx plugins provide additional targets. Use the existing project configuration
instead of generating duplicate applications.

## Prerequisites and install

- Use Node.js `20.19+` or `22.12+` for local workspace commands; Vite 8 has
  this requirement. Service containers currently use Node.js 18.
- The Nx CI workflow pins Node.js 23.3.0 and pnpm 9.8.0. The lockfile uses
  lockfile format 9.

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm nx report
```

## Inspect projects and targets

```bash
pnpm nx show projects
pnpm nx show project user-service
pnpm nx show project web
pnpm nx graph
```

The workspace includes the API Gateway, backend services, shared library, web
application, and web e2e project. The frontend has a `build` target but no Nx
`serve` target; use its package script for local interactive development:

```bash
PORT=3010 REACT_APP_API_URL=http://localhost:3000/api pnpm --dir services/web start
```

## Run targets

Use the target names declared by each project. For example:

```bash
pnpm nx run user-service:serve
pnpm nx run api-gateway:lint
pnpm nx run transaction-service:test
pnpm nx run web:build
```

Not every project defines the same targets. Inspect a project before using
`run-many` with a target across all projects.

## CI

`.github/workflows/nx-ci.yaml` runs affected lint, test-ci, typecheck, build,
and e2e targets for pull requests and pushes to `develop` or `main`. A manual
workflow dispatch requests the full target set. Nx Cloud distribution is
currently commented out; CI passes `--no-cloud`.

The workflow currently pins pnpm 9.8.0 and Node.js 23.3.0. Keep those versions
and the package manager/lockfile configuration in sync when changing CI.

## Troubleshooting commands

```bash
pnpm nx reset
NX_DAEMON=false pnpm nx graph --verbose
pnpm nx show projects
```