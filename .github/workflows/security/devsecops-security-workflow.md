====================================================
🔐 DevSecOps Security Workflows
=====================================================

This repository implements a closed‑loop DevSecOps pipeline using GitHub Actions. It automates vulnerability detection, notification, SLA enforcement, and escalation across engineering teams.
===============================================
📂 Workflow Files

🕒 Scheduled Scans → security-scheduled.yaml
================================================

Runs all security scanners daily and enforces a security gate.

    Trivy (SCA) → Dependency vulnerability scanning.

    SonarQube (SAST) → Source code analysis.

    Gitleaks (Secrets) → Secret detection.

    Checkov (IaC) → Infrastructure‑as‑Code misconfiguration scanning.

    OWASP ZAP (DAST) → Runtime application security testing.

    Security Gate → Collects results; fails pipeline if any scanner fails.

👉 Purpose: Automated daily scans + gatekeeping before code progresses.
=====================================================================
🔔 Notification + Slack Routing → security-notification.yaml
========================================================================

Processes scanner findings, deduplicates them, creates GitHub issues, and sends Slack alerts.

   * Normalization → Collects and merges scanner outputs.

   * Deduplication → Prevents duplicate incidents for recurring findings.

   * Issue Creation → Labels issues (severity:*, scanner:*, status:*) and   assigns ownership using CODEOWNERS logic.

   * Slack Routing → Alerts routed to severity‑specific Slack channels via webhook secrets.

   * Summary → Adds a GitHub Actions summary for audit visibility.

👉 Purpose: Turns raw findings into actionable issues + real‑time alerts.
=======================================================================
👥 Ownership + SLA Enforcement + CODEOWNERS + Slack Escalation → ownership-sla.yaml
==========================================================================

Enforces SLA deadlines, escalates overdue issues, and integrates with GitHub Projects dashboards.

   * Daily SLA Check → Runs at midnight UTC.

   * Severity Thresholds → Critical = 1 day, High = 3, Medium = 7, Low = 14.

   * CODEOWNERS Mapping → Escalates overdue issues to the correct team (backend, frontend, devsecops, security, platform).

    * Escalation Actions → Adds GitHub comments + status:escalated label.

    * Projects Integration → Adds overdue issues to a GitHub Projects column for manager visibility.

    * Slack Escalation → Sends overdue issue alerts to severity‑specific Slack channels.

👉 Purpose: Daily SLA enforcement + escalation to teams and dashboards.

===============================================
⚙️ Implementation Flow
===============================================

flowchart TD
    A[Scheduled Scans<br>security-scheduled.yaml] --> B[Notification<br>security-notification.yaml]
    B --> C[SLA Enforcement<br>ownership-sla.yaml]
    C --> D[Slack Alerts]
    C --> E[GitHub Projects Dashboard]
    B --> F[GitHub Issues]
    F --> C
==================================================
🔑 Secrets Required
=================================================

    GITHUB_TOKEN → Default GitHub Actions token.

    SONAR_TOKEN, SONAR_HOST_URL → For SonarQube integration.

    SLACK_CRITICAL_WEBHOOK, SLACK_HIGH_WEBHOOK, SLACK_MEDIUM_WEBHOOK, SLACK_LOW_WEBHOOK → Slack channel webhooks.

    PROJECT_COLUMN_ID → GitHub Projects column ID for escalated issues.

============================================================
🌟 Benefits
============================================================

    Automated detection across SCA, SAST, Secrets, IaC, and DAST.

    Deduplication prevents duplicate incidents.

    Ownership mapping ensures accountability.

    Slack alerts keep teams responsive.

    SLA enforcement drives timely remediation.

    Projects dashboards give managers visibility.

👉 With this setup, you have a production‑standard DevSecOps system: detect → assign → alert → enforce → escalate → track.
