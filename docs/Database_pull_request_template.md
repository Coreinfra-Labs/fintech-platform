## Database Governance Checklist

- [ ] Only schemas owned by this service were modified.
- [ ] No cross-service model imports were added.
- [ ] No cross-schema foreign keys were introduced.
- [ ] Migrations are under the correct service `db/migration/` dir.
- [ ] Flyway naming convention is honored: `V1__Description.sql`.
- [ ] Seed data is idempotent and safe to re-run.
- [ ] Service-to-service communication remains via API or Kafka.
