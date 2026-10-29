# Kafka and Nx Implementation Status

This is a current-state checklist, not a plan claiming every listed feature is
complete. Checkmarks indicate repository configuration/source presence, not a
successful production deployment.

## Nx Workspace

- [x] Nx workspace configuration and pnpm workspace are present.
- [x] Service and shared-library projects are registered with Nx.
- [x] CI runs affected Nx lint, test-ci, typecheck, build, and e2e targets.
- [ ] Nx Cloud distribution is enabled; it is currently commented out in CI.
- [ ] Every registered service defines and successfully runs every CI target.

## Kafka Implementation

- [x] Shared Kafka client, topic constants, and message validators exist.
- [x] Transaction Service publishes and consumes `transactions`.
- [x] Fraud Service consumes `transactions` and can publish `fraud-alert`.
- [ ] Notification Service can consume both configured topics. KafkaJS currently
	rejects its second subscription after `consumer.run()` starts.
- [x] Transaction Service can publish ledger failures to
	`transaction-failed-dlq`.
- [ ] DLQ Processor can consume all declared dead-letter topics. It currently
	fails on the second subscription and has no retry/redrive implementation.
- [ ] Fraud consumer callback failures are published to its DLQ topic.
- [ ] Payment Service starts Kafka and publishes its declared payment events.
- [ ] Notification consumer user lookup matches a registered User Service route.
- [ ] Transaction completion is prevented when ledger settlement is disabled.

## Deployment Readiness

- [x] Docker Compose defines Kafka, services, health checks, and Kafka UI.
- [x] Release workflow builds an explicitly selected service image and pushes it
	to AWS ECR.
- [ ] Release workflow includes Ledger, DLQ Processor, web, and NIBSS Mock; its
	current service choices do not include these projects.
- [ ] Dev, staging, and production deployment workflows are fully configured;
	they still contain environment/repository placeholders.
- [ ] End-to-end Kafka flow and failure recovery are verified in a running
	environment.

For detailed event behavior and limitations, see
[KAFKA_ARCHITECTURE.md](KAFKA_ARCHITECTURE.md) and
[KAFKA_IMPLEMENTATION_SUMMARY.md](KAFKA_IMPLEMENTATION_SUMMARY.md).
