# Kafka Event Architecture Implementation Summary

## Changes Overview

This implementation refactors the fintech platform's Kafka event architecture to fix critical bugs, implement missing functionality, and improve reliability.

## Files Changed

### **New Files Created**

1. **`libs/shared-libs/constants/kafkaTopics.js`**
   - Centralized Kafka topic and consumer group definitions
   - Ensures consistency across all services

2. **`libs/shared-libs/__tests__/constants/kafkaTopics.test.js`**
   - Tests for kafka topics constants

3. **`services/transaction-service/__tests__/routes/transaction.test.js`**
   - Unit tests for transaction route with Kafka mocked

4. **`services/transaction-service/__tests__/consumers/transactionConsumer.test.js`**
   - Unit tests for transaction consumer (success, failure, no-ledger cases)

5. **`services/fraud-service/__tests__/consumers/fraudConsumer.test.js`**
   - Unit tests for fraud consumer and fraud scoring

6. **`services/notification-service/__tests__/consumers/notificationConsumer.test.js`**
   - Unit tests for notification consumer (email/SMS)

7. **`.env.example`**
   - Example environment variables for all services

8. **`docs/KAFKA_ARCHITECTURE.md`**
   - Complete Kafka architecture documentation

9. **`docs/KAFKA_IMPLEMENTATION_SUMMARY.md`**
   - This file

### **Files Updated**

#### **Shared Library**
- **`libs/shared-libs/index.js`**: Export kafkaTopics constants
- **`libs/shared-libs/services/kafka.js`**: 
  - Add producer initialization check
  - Improve error handling in subscribeToTopic
  - Non-blocking consumer startup
  - Better error messages

#### **Transaction Service**
- **`services/transaction-service/src/index.js`**:
  - Single KafkaService instance created at startup
  - Inject into routes
  - Non-blocking HTTP server + consumer startup
  - Graceful shutdown on SIGTERM/SIGINT
  
- **`services/transaction-service/src/routes/transaction.js`**:
  - Remove unconnected KafkaService instantiation
  - Use injected service via `setKafkaService()`
  - Use kafkaTopics constants
  - Handle missing kafka service gracefully

- **`services/transaction-service/src/consumers/transactionConsumer.js`**:
  - Support configurable LEDGER_SERVICE_URL
  - Document limitation if ledger service not available
  - Add 5-second timeout for ledger calls
  - Use kafkaTopics constants
  - Enhanced error logging

#### **Fraud Service**
- **`services/fraud-service/src/index.js`**:
  - Single KafkaService instance at startup
  - Non-blocking consumer startup
  - Graceful shutdown

- **`services/fraud-service/src/consumers/fraudConsumer.js`**:
  - Implement complete fraud scoring logic
  - Support FRAUD_THRESHOLD and HIGH_RISK_THRESHOLD env vars
  - Rule 1: High-amount detection
  - Rule 2: Unusual time (2-5 AM)
  - Rule 3: Multiple recent alerts
  - Create FraudAlert if risk >= threshold
  - Better error handling

#### **Notification Service**
- **`services/notification-service/src/index.js`**:
  - Single KafkaService instance at startup
  - Non-blocking consumer startup
  - Graceful shutdown

- **`services/notification-service/src/consumers/notificationConsumer.js`**:
  - Implement email and SMS notification sending
  - Fetch user contact info from user service
  - Send email using Nodemailer
  - Send SMS using Twilio
  - Parallel sending with error isolation
  - Better logging

#### **Payment & Wallet Services**
- **`services/payment-service/src/index.js`**:
  - Remove unused Kafka initialization
  - Add graceful shutdown

- **`services/wallet-service/src/index.js`**:
  - Remove unused Kafka initialization
  - Add graceful shutdown

#### **Docker Compose**
- **`docker-compose.yml`**:
  - Update all service configurations
  - Add environment variables for new features
  - Configure LEDGER_SERVICE_URL for transaction-service

### **Files Deleted**

1. **`services/transaction-service/src/services/kafka.js`**
   - Unused duplicate local implementation

2. **`services/fraud-service/src/services/kafka.js`**
   - Unused duplicate local implementation

3. **`services/payment-service/src/services/kafka.js`** (if exists)
   - Unused local implementation

4. **`services/wallet-service/src/services/kafka.js`** (if exists)
   - Unused local implementation

## Architecture After Implementation


Testing
Unit Tests

Run the unit tests for each service and the shared library:

Transaction Service
cd services/transaction-service
npm test

Fraud Service
cd services/fraud-service
npm test

Notification Service
cd services/notification-service
npm test

Shared Library
cd libs/shared-libs
npm test

Integration Tests

Integration tests require Docker Compose to be running.

Start the services:

docker-compose up


Then run the integration tests:

npm test -- --integration

Monitoring
Kafka UI

You can monitor Kafka topics and messages using Kafka UI.

Once the services are running, open:

http://localhost:8080

Check Consumer Lag

To check consumer lag for the transaction service, run:

docker exec kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group transaction-service-group \
  --describe


Kafka Consumers

The system uses Kafka topics to process transactions asynchronously across multiple services.

Transaction Service

Role: Processes transactions, calls the Ledger Service for settlement, and publishes a completion event.

Consumes messages from the transactions topic.

Updates the transaction status to PROCESSING.

Calls the Ledger Service to record ledger entries.

Updates the transaction status to COMPLETED.

Publishes a transaction-completed event.

Fraud Service

Role: Evaluates transactions for potential fraud.

Consumes messages from the transactions topic.

Evaluates configured fraud rules.

Calculates a risk score.

Creates a FraudAlert when the transaction is considered high-risk.

transaction-completed Topic
Producer

The transaction-service publishes to this topic after successful ledger settlement.

Event Payload
{
  "transactionId": "uuid",
  "status": "COMPLETED",
  "amount": 1000,
  "type": "TRANSFER",
  "sourceWalletId": "uuid",
  "destinationWalletId": "uuid"
}

Consumer

notification-service

The notification service:

Consumes transaction-completed events.

Fetches the user's contact information.

Sends email and SMS notifications.

End-to-End Transaction Flow

The complete transaction flow is:

POST /api/transaction/create
Yes
No
Client
Transaction Service
Create TransactionStatus: PENDING
Publish to transactions topic
Transaction Service Consumer
Fraud Service Consumer
Update Status to PROCESSING
Call Ledger Service
Update Status to COMPLETED
Publish transaction-completed
Evaluate Fraud Rules
Risk Score >= 50?
Create FraudAlert
No Alert
Notification Service Consumer
Fetch User Contact Info
Send Email + SMS
Step-by-Step Flow

The client calls POST /api/transaction/create.

The transaction-service creates a transaction with status PENDING.

The transaction is published to the transactions Kafka topic.

The transaction is processed in parallel:

Transaction Service Consumer

Updates the status to PROCESSING.

Calls LEDGER_SERVICE_URL to record ledger entries.

Updates the status to COMPLETED.

Publishes an event to transaction-completed.

Fraud Service Consumer

Evaluates the transaction against fraud rules.

Calculates the fraud risk score.

Creates a FraudAlert if the risk score is 50 or higher.

The notification-service consumes the transaction-completed event.

The notification service fetches the user's contact information.

Email and SMS notifications are sent to the user.

Environment Configuration
Transaction Service
# Ledger service integration
LEDGER_SERVICE_URL=http://ledger-service:3005/api/ledger


Note: If LEDGER_SERVICE_URL is not configured, transactions will be marked as COMPLETED without ledger settlement. This fallback is intended for development and testing environments.

Fraud Service
# Amount threshold for high-amount transactions
FRAUD_THRESHOLD=500000

# Risk score threshold for creating a fraud alert
HIGH_RISK_THRESHOLD=50

Fraud Rules

The fraud service evaluates transactions using the following rules:

Rule	Condition	Risk Score
High-amount transaction	amount > FRAUD_THRESHOLD	+40
Unusual transaction time	Between 2 AM and 5 AM	+20
Multiple recent alerts	Same wallet has multiple recent alerts	+30

A FraudAlert is created when the total risk score is greater than or equal to HIGH_RISK_THRESHOLD.

Example:

High amount       +40
Unusual time      +20
---------------------
Total risk score  60


Since 60 >= 50, a fraud alert will be created.

Notification Service

Configure the notification service using the following environment variables:

EMAIL_USER=noreply@fintech.com
EMAIL_PASSWORD=your-app-password

TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE=+1234567890

USER_SERVICE_URL=http://user-service:3001


Security: Never commit real credentials, passwords, API keys, or authentication tokens to the repository. Use environment variables or a secrets manager in production.

Graceful Shutdown

All services that implement Kafka consumers support graceful shutdown.

You can send a SIGTERM signal to a running service:

kill -TERM <pid>


Or stop the service using Ctrl+C, which sends SIGINT in most terminal environments.

Shutdown Sequence

When a shutdown signal is received, the service will:

Stop accepting new HTTP requests.

Disconnect the Kafka producer and consumer.

Complete the shutdown process.

Exit cleanly.

This helps prevent partially processed messages and allows Kafka consumers and producers to close their connections safely.






## Kafka Topics & Consumer Groups
