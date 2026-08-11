🔐 DevSecOps Security Workflows Integration

This repository implements a production‑grade DevSecOps pipeline using GitHub Actions and Slack API. It automates vulnerability detection, notification, SLA enforcement, and escalation across engineering teams — with real‑time Slack alerts by severity.

| Workflow | Purpose |

| --- | --- |
| ``security-scheduled.yaml`` | Runs daily scans (Trivy, SonarQube, Gitleaks, Checkov, OWASP ZAP) and enforces a security gate. |
| ``security-notification.yaml`` | Normalizes and deduplicates findings, creates GitHub issues, assigns ownership via CODEOWNERS, and sends Slack alerts. |
| ``ownership-sla.yaml`` | Enforces SLA deadlines, escalates overdue issues, updates GitHub Projects dashboards, and routes Slack notifications by severity. |

⚙️ Implementation Flow
flowchart TD
    A[Scheduled Scans<br>security-scheduled.yaml] --> B[Notification & Deduplication<br>security-notification.yaml]
    B --> C[SLA Enforcement & Escalation<br>ownership-sla.yaml]
    C --> D[Slack Alerts]
    C --> E[GitHub Projects Dashboard]
    B --> F[GitHub Issues]
    F --> C

🚀 Quick Start Guide
Step 1 — Create Slack Workspace

    Visit Slack Get Started (bing.com in Bing).

    Create a workspace (e.g., Coreinfra Security).

    Add channels for each severity:

        #security-critical

        #security-high

        #security-medium

        #security-low

Step 2 — Create Slack App

    Go to Slack API – Your Apps.

    Click Create New App → From scratch.

    Name it DevSecOps Alerts and select your workspace.

    Choose Starter App template.

    Click Continue.

Step 3 — Enable Incoming Webhooks

    In the left sidebar, open Features → Incoming Webhooks.

    Toggle Activate Incoming Webhooks → ON.

    Click Add New Webhook to Workspace.

    Select a channel (e.g., #security-low) and click Allow.

    Copy the generated Webhook URL — it looks like:
   
T
    Repeat for each severity channel.

Step 4 — Add Webhooks to GitHub Secrets

In your GitHub repository:

    Go to Settings → Secrets and variables → Actions.

    Click New repository secret.

    Add each webhook URL:

        SLACK_CRITICAL_WEBHOOK → URL for #security-critical

        SLACK_HIGH_WEBHOOK → URL for #security-high

        SLACK_MEDIUM_WEBHOOK → URL for #security-medium

        SLACK_LOW_WEBHOOK → URL for #security-low

Step 5 — Configure CODEOWNERS

Add a CODEOWNERS file to map ownership

# Backend services
/services/api-gateway/*      @Coreinfra-Labs/backend
/services/payment-service/*  @Coreinfra-Labs/backend

# Frontend services
/services/web/*              @Coreinfra-Labs/frontend

# Shared libraries
/libs/*                      @Coreinfra-Labs/backend

# DevSecOps workflows
/.github/workflows/security/* @Coreinfra-Labs/devsecops

# Security configs
/.github/dependabot.yml      @Coreinfra-Labs/security


Step 6 — Verify App Credentials

In Basic Information, confirm:

    App ID, Client ID, and Client Secret are generated.

    Save changes after verifying credentials.

Step 7 — Test Alerts

Trigger your workflow manually (workflow_dispatch) and confirm Slack messages appear in each channel.

🔑 Required Secrets

| Secret | Description |
| --- | --- |
| ``GITHUB_TOKEN`` | Default GitHub Actions token. |
| ``SONAR_TOKEN``, ``SONAR_HOST_URL`` | SonarQube integration. |
| ``SLACK_CRITICAL_WEBHOOK``, ``SLACK_HIGH_WEBHOOK``, ``SLACK_MEDIUM_WEBHOOK``, ``SLACK_LOW_WEBHOOK`` | Slack channel webhooks. |
| ``PROJECT_COLUMN_ID`` | GitHub Projects column ID for escalated issues. |

🎨 Slack Message Formatting

You can customize messages for readability. Example payload:

{
  "text": "🚨 *[CRITICAL]* Issue #42 in *Coreinfra-Labs* exceeded SLA.\nSee details: https://github.com/Coreinfra-Labs/repo/issues/42"
}

    *bold* → highlights severity.

    Emojis (🚨, ⚠️, ✅) → quick visual cues.

    Direct GitHub issue links → one‑click access for engineers.


🌟 Benefits

    Automated Detection across SCA, SAST, Secrets, IaC, and DAST.

    Deduplication prevents duplicate incidents.

    Ownership Mapping ensures accountability.

    Slack Alerts keep teams responsive.

    SLA Enforcement drives timely remediation.

    Projects Dashboards give managers visibility.

✅ End‑to‑End Outcome

You now have a fully automated DevSecOps system:
Detect → Assign → Alert → Enforce → Escalate → Track.