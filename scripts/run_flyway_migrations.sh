#!/usr/bin/env bash
set -euo pipefail

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-fintech_db}"
DB_USER="${DB_USER:-fintech_user}"
DB_PASSWORD="${DB_PASSWORD:-fintech_secure_password}"

echo "Running Flyway migrations for all service-owned schemas..."

for dir in \
  "$PWD/services/user-service/db/migration" \
  "$PWD/services/wallet-service/db/migration" \
  "$PWD/services/transaction-service/db/migration" \
  "$PWD/services/fraud-service/db/migration" \
  "$PWD/services/ledger-service/db/migration" \
  "$PWD/services/payment-service/db/migration" \
  "$PWD/services/notification-service/db/migration"
do
  if [ -d "$dir" ]; then
    echo "Running Flyway on $dir"
    docker run --rm \
      -v "$PWD:/workspace" \
      flyway/flyway:10-alpine \
      -url="jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}" \
      -user="${DB_USER}" \
      -password="${DB_PASSWORD}" \
      -locations="filesystem:/workspace/${dir#$PWD/}" \
      -baselineOnMigrate=true \
      -connectRetries=5 \
      migrate
  fi
done

echo "Migration complete."
