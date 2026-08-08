# Nx CI/CD

This repository uses **Nx** to manage CI/CD across a multi-service monorepo.

The CI pipeline is designed to provide fast Pull Request validation while also supporting full monorepo validation when required. **Nx Cloud** is used for distributed task execution, dynamic CI scaling, and remote caching.

---

## 🚀 What Was Implemented

The following Nx CI/CD capabilities have been implemented:

- Nx affected CI for Pull Requests and normal pushes
- Full monorepo CI using `nx run-many --all`
- Nx Cloud distributed task execution
- Dynamic Nx Cloud agent distribution
- Smaller, medium, large, and extra-large CI workload configurations
- Agent assignment based on workload type
- Vitest CI testing using `test-ci`
- Playwright E2E testing using `e2e`
- TypeScript type checking
- ESLint validation
- Application and service builds
- Manual full CI execution through GitHub Actions
- Nx Cloud remote caching
- Parallel task execution
- Automatic Nx project discovery

---

## 🏗️ CI/CD Architecture

```text
                         GitHub
                           │
              ┌────────────┴────────────┐
              │                         │
        Pull Request                 Push / Manual
              │                         │
              ▼                         ▼
        Nx Affected                Full Nx CI
              │                         │
              │                  nx run-many --all
              │                         │
              └────────────┬────────────┘
                           │
                           ▼
                      Nx Cloud
                           │
                  Dynamic Distribution
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
     Small Agents    Medium Agents    Large Agents
          │                │                │
          ▼                ▼                ▼
        Lint         Test / Typecheck     Build
                                             │
                                             ▼
                                            E2E
                                             │
                                             ▼
                                      Nx Cloud Cache



    ## 🛡️ CI Failure and Nx Cache Protection

Nx uses task hashing and caching to avoid repeating work that has already
produced a valid result.

A failed CI task must not be treated as a successful cached result.

The CI pipeline therefore relies on Nx task hashing to ensure that tasks are
re-executed when their inputs change.

### CI Cache Behaviour

```text
Commit A
   │
   ▼
Nx Task
   │
   ├── Success ───────► Cache Result
   │
   └── Failure ───────► Do NOT use as successful cache
                            │
                            ▼
                       CI remains failed


##  🛡️ CI Failure and Cache Protection

Nx Cloud uses task hashing to determine whether a task can safely reuse a
previous result.

A failed CI execution must not be treated as a successful cached result.

When a failure is fixed and a new commit changes the task inputs, Nx generates
a new task hash and executes the task again.

```text
Failed Commit
     │
     ▼
Task Hash A
     │
     ▼
Task Fails ❌
     │
     ▼
Fix Applied
     │
     ▼
New Commit
     │
     ▼
Task Hash B
     │
     ▼
Task Runs Again
     │
     ▼
Success ✅
     │
     ▼
Valid Result Cached



Normal CI

Normal CI should use Nx caching:

pnpm nx affected -t lint,test-ci,typecheck,build
pnpm nx affected -t e2e

This allows successful tasks to be reused while ensuring changed inputs are
re-evaluated.

Clean Retry

If a CI result appears suspicious or a completely fresh execution is required,
the cache can be bypassed:

pnpm nx affected -t lint,test-ci,typecheck,build --skip-nx-cache
pnpm nx affected -t e2e --skip-nx-cache

--skip-nx-cache should be used as an exception for troubleshooting or
forced-clean validation, not as the default CI configuration.

Local Cache Reset

For local troubleshooting:

pnpm nx reset

This clears the local Nx state and cache.

Important Principle

The pipeline should cache successful task results, not failures.

A fixed commit must produce a new task hash when its relevant inputs have
changed, causing the task to execute again rather than relying on the result
of the previous failed execution.


## So the architecture you want is:

**Normal CI → Nx cache ON → failed task gets fixed → new commit/hash → task runs again.**

**Suspicious result → `--skip-nx-cache` → guaranteed fresh execution.**

That is the safer approach than deleting Nx Cloud's entire cache after every failed pipeline.