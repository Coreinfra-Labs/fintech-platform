# Dependency Management Policy

## Purpose

This repository uses Dependabot to continuously maintain application,
development, GitHub Actions, and security dependencies.

The goal is to balance:

- Security
- Stability
- Maintainability
- Controlled change
- Developer productivity

---

## Dependency Update Policy

### 1. Security Updates

Security updates have the highest priority.

Dependabot security updates must be reviewed and processed according
to the severity of the vulnerability.

Priority:

| Severity | Priority |
|---|---|
| Critical | Immediate |
| High | High priority |
| Medium | Normal maintenance |
| Low | Normal maintenance |

Security updates must pass the repository CI and security gates before
being merged.

---

### 2. Patch Updates

Patch updates normally contain bug fixes and security fixes.

Examples:

```text
10.4.0 → 10.4.1
5.8.2 → 5.8.3