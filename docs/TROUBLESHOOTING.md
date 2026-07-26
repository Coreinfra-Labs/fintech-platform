# Troubleshooting

This document contains common Nx issues encountered during development and their solutions.

---

# Mixed Nx Plugin Versions

## Symptoms

```text
Cannot read properties of undefined (reading 'filter')
```

## Cause

Different Nx packages are installed using different versions.

Example:

```text
nx              23.1.0

@nx/react       23.1.0

@nx/node        19.8.4
```

---

## Solution

Check installed versions.

```bash
pnpm nx report

pnpm list @nx/node @nx/express @nx/jest @nx/devkit
```

Upgrade every Nx package.

```bash
pnpm up -D @nx/* -w
```

or

```bash
pnpm add -D \
@nx/node@23.1.0 \
@nx/express@23.1.0 \
@nx/react@23.1.0 \
@nx/js@23.1.0
```

---

# Reset Nx Cache

```bash
pnpm nx reset
```

---

# Clean Installation

```bash
rm -rf node_modules

rm pnpm-lock.yaml

pnpm install
```

---

# Verify Installation

```bash
pnpm nx report
```

---

# Verify Registered Projects

```bash
pnpm nx show projects
```

---

# Project Graph Not Loading

```bash
NX_DAEMON=false pnpm nx graph --verbose
```

---

# Nx Cloud

Reconnect the workspace.

```bash
pnpm nx connect
```

---

# Helpful Commands

```bash
pnpm nx list

pnpm nx graph

pnpm nx report

pnpm nx reset

pnpm nx show projects
```