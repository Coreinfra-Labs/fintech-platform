# Complete Nx Setup Guide

This document explains how Nx was integrated into an existing microservices project.

---

# Initialize Nx

```bash
pnpm dlx nx@latest init
```

---

# Verify Nx Installation

```bash
pnpm nx report
```

All official Nx packages should use the same version.

---

# Install Nx Plugins

Core plugins used in this project:

| Plugin | Purpose |
|---------|----------|
| @nx/node | Node.js applications |
| @nx/express | Express integration |
| @nx/react | React frontend |
| @nx/js | Shared libraries |
| @nx/vite | Frontend bundler |
| @nx/vitest | Unit testing |
| @nx/playwright | End-to-end testing |
| @nx/eslint | Linting |

Upgrade all plugins:

```bash
pnpm up -D @nx/* -w
```

---

# Project Graph

Generate the dependency graph.

```bash
pnpm nx graph
```

Useful commands:

```bash
pnpm nx list

pnpm nx reset

NX_DAEMON=false pnpm nx graph --verbose
```

---

# Register Existing Services

This repository already contains working microservices.

Instead of generating new applications, each service is registered with Nx.

Example:

```json
{
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "name": "payment-service",
  "projectType": "application",
  "sourceRoot": "services/payment-service/src",
  "targets": {}
}
```

Verify registration:

```bash
pnpm nx show projects

pnpm nx show project payment-service
```

---

# Common Commands

Serve

```bash
pnpm nx serve payment-service
```

Build

```bash
pnpm nx build payment-service
```

Test

```bash
pnpm nx test payment-service
```

Lint

```bash
pnpm nx lint payment-service
```

---

# Nx Cloud

Connect the workspace.

```bash
pnpm nx connect
```

Benefits:

- Remote cache
- Distributed execution
- Faster CI
- Nx Agents

---

# Generate CI Workflow

```bash
pnpm nx g ci-workflow
```

---

# Verify Workspace

```bash
pnpm nx report

pnpm nx show projects

pnpm nx graph
```