# 🚀 CI/CD Pipeline

This repository implements a production-ready Continuous Integration and Continuous Deployment (CI/CD) pipeline using **GitHub Actions**, **Nx**, **Docker**, **Amazon Elastic Container Registry (ECR)**, **Amazon Elastic Kubernetes Service (EKS)**, and **Helm**.

The pipeline follows the **Build Once, Deploy Many** principle. Docker images are built only once, versioned using immutable tags, stored in Amazon ECR, and promoted through environments without rebuilding.

---

# Pipeline Overview

```text
                        Pull Request
                             │
                             ▼
                    ┌────────────────┐
                    │    ci.yml      │
                    └────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
       Lint             Unit Tests      Security Scan
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                      Build Verification
                             │
                             ▼
                        Merge to Main
                             │
                             ▼
                  ┌────────────────────┐
                  │   release.yml      │
                  └────────────────────┘
                             │
                 Enter Version (v1.3.5)
                             │
                  Validate Semantic Version
                             │
                 Generate Release Metadata
                             │
      Version = v1.3.5
      Commit  = 48e21da
      Tag     = v1.3.5-48e21da
                             │
                             ▼
                Build Docker Images (Matrix)
                             │
                             ▼
                  Push Images to Amazon ECR
                             │
                             ▼
                  ┌────────────────────┐
                  │    deploy.yml      │
                  └────────────────────┘
                             │
          Select Environment + Existing Image Tag
                             │
                             ▼
                     Deploy to Amazon EKS
```

---

# Workflow Files

```text
.github/
└── workflows/
    ├── ci.yml
    ├── release.yml
    └── deploy.yml
```

---

# Workflow Responsibilities

| Workflow        | Trigger                      | Purpose                                                                |
| --------------- | ---------------------------- | ---------------------------------------------------------------------- |
| **ci.yml**      | Pull Request                 | Validate code quality before merge                                     |
| **release.yml** | Manual (`workflow_dispatch`) | Build Docker images, generate immutable tags and publish to Amazon ECR |
| **deploy.yml**  | Manual (`workflow_dispatch`) | Deploy an existing image from Amazon ECR to Amazon EKS                 |

---

# Continuous Integration (ci.yml)

The CI workflow runs automatically whenever a Pull Request is opened or updated.

## Objectives

* Validate source code quality
* Detect issues before merge
* Ensure every Pull Request is deployable

## Pipeline

```text
Checkout Repository
        │
        ▼
Install Dependencies
        │
        ▼
Restore Nx Cache
        │
        ▼
Lint
        │
        ▼
Unit Tests
        │
        ▼
Secret Scan (Gitleaks)
        │
        ▼
Dependency / Vulnerability Scan
        │
        ▼
Build Verification
        │
        ▼
Pull Request Status
```

## Responsibilities

* Checkout repository
* Install project dependencies
* Restore Nx cache
* Run ESLint
* Execute unit tests
* Scan for exposed secrets using Gitleaks
* Run dependency vulnerability scanning
* Build affected projects
* Report status back to GitHub

> **Note**
>
> The CI workflow **does not** build Docker images.
>
> The CI workflow **does not** push images.
>
> The CI workflow **does not** deploy applications.

---

# Release Pipeline (release.yml)

The Release workflow is responsible for producing immutable Docker images.

It **does not deploy** any application.

## Trigger

```text
GitHub Actions
    ↓
Run workflow
```

## Required Input

```text
Version

v1.3.5
```

---

# Semantic Version Validation

Every release version is validated before the build starts.

Accepted versions

```text
v1.0.0
v1.0.1
v1.3.5
v2.0.0
v10.15.7
```

Rejected versions

```text
1.3.5
latest
version1
v1
v1.3
```

The workflow fails immediately if the supplied version is invalid.

---

# Release Metadata

Once validation succeeds, release metadata is generated.

Example

```text
Version = v1.3.5
Commit  = 48e21da
```

Final image tag

```text
v1.3.5-48e21da
```

The image tag combines:

* Semantic Version
* Git Commit SHA

This guarantees traceability between a deployed container and the exact source code used to build it.

---

# Matrix Build Strategy

Each microservice is built independently using a GitHub Actions matrix.

```text
api-gateway

user-service

payment-service

wallet-service

transaction-service

notification-service

fraud-service
```

Each service receives the same release version.

Example

```text
api-gateway:v1.3.5-48e21da

payment-service:v1.3.5-48e21da

wallet-service:v1.3.5-48e21da

notification-service:v1.3.5-48e21da
```

---

# Container Registry

The pipeline publishes images exclusively to **Amazon Elastic Container Registry (Amazon ECR)**.

No images are pushed to Docker Hub or any other registry.

---

# Deployment Pipeline (deploy.yml)

Deployment is intentionally separated from image creation.

This workflow never builds Docker images.

Instead, it deploys an existing image stored in Amazon ECR.

---

# Trigger

```text
GitHub Actions
    ↓
Run workflow
```

---

# Required Inputs

```text
Environment

○ staging
○ production

Image Tag

v1.3.5-48e21da
```

---

# Deployment Process

```text
Authenticate to AWS
        │
        ▼
Configure kubectl
        │
        ▼
Connect to Amazon EKS
        │
        ▼
Helm Upgrade
        │
        ▼
Update Kubernetes Deployment
        │
        ▼
Pods Pull Existing Image
        │
        ▼
Deployment Complete
```

The deployment workflow references an existing image from Amazon ECR.

No Docker build occurs.

No Docker push occurs.

---

# Rollback Strategy

Rollback does not require rebuilding the application.

Instead, redeploy a previously released image.

Current deployment

```text
payment-service:v1.3.5-48e21da
```

Rollback target

```text
payment-service:v1.3.4-a8c1b20
```

Run **deploy.yml** again using:

```text
Environment

production

Image Tag

v1.3.4-a8c1b20
```

The deployment workflow updates Kubernetes to use the previous image.

No rebuild is required.

No new image is created.

---

# Image Lifecycle

```text
Developer
      │
      ▼
Git Commit
      │
      ▼
Pull Request
      │
      ▼
CI Validation
      │
      ▼
Merge to Main
      │
      ▼
Release
      │
      ▼
Amazon ECR
      │
      ├──────────────┐
      ▼              ▼
Staging          Production
      ▲              ▲
      └──────────────┘
         Deploy.yml
```

---

# Why Separate Release and Deployment?

Separating release from deployment provides several operational advantages.

## Build Once

Docker images are built exactly once.

## Immutable Artifacts

Every image receives a unique version and commit tag.

Example

```text
v1.3.5-48e21da
```

## Promote Existing Images

The same image can be promoted from:

```text
Development
        │
        ▼
Staging
        │
        ▼
Production
```

without rebuilding.

## Faster Rollbacks

Rollback simply means deploying an older image tag.

## Traceability

Every deployed image can be traced directly back to:

* Git commit
* Release version
* GitHub Actions run
* Amazon ECR image

---

# Summary

This CI/CD implementation follows modern cloud-native deployment practices.

* ✅ Pull Request validation
* ✅ Automated quality gates
* ✅ Semantic version validation
* ✅ Immutable Docker image tagging
* ✅ Matrix builds for all microservices
* ✅ Amazon ECR as the single container registry
* ✅ Manual promotion to staging or production
* ✅ Build once, deploy many
* ✅ Instant rollback using immutable image tags
* ✅ Complete traceability from source code to production deployment
