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



Kafka Architecture
Kafka Topics
transactions

The transactions topic is used to process newly created transactions and perform fraud checks.

transactions
│
├── Producer
│   └── transaction-service
│
├── Consumer: transaction-service-group
│   └── transaction-service
│       ├── Process transaction
│       ├── Call ledger service
│       └── Publish completion event
│
└── Consumer: fraud-service-group
    └── fraud-service
        ├── Perform fraud check
        └── Create fraud alerts

transaction-completed

The transaction-completed topic is published after a transaction has been successfully processed and settled.

transaction-completed
│
├── Producer
│   └── transaction-service
│
└── Consumer: notification-service-group
    └── notification-service
        ├── Fetch user contact information
        └── Send email/SMS notification

Service Startup Sequence
Transaction Service

The transaction service starts its database connection, initializes Kafka, starts the HTTP server, and runs the Kafka consumer in the background.

1. Connect to database
2. Create a single KafkaService instance
3. Connect to Kafka (producer + consumer)
4. Inject KafkaService into routes
5. Start HTTP server (non-blocking)
6. Start consumer loop (background)
7. Configure graceful shutdown

Fraud Service
1. Connect to database
2. Create a single KafkaService instance
3. Connect to Kafka
4. Start HTTP server (non-blocking)
5. Start consumer loop (background)
6. Configure graceful shutdown

Notification Service
1. Create a single KafkaService instance
2. Connect to Kafka
3. Start HTTP server (non-blocking)
4. Start consumer loop (background)
5. Configure graceful shutdown

Payment & Wallet Services

These services do not use Kafka.

1. Connect to database
2. Start HTTP server
3. Configure graceful shutdown

Critical Bug Fixes
1. Ledger Service Port Error
Problem

Previously, transaction-service used a hard-coded URL:

http://localhost:3005/api/ledger


This could result in requests being sent to the wrong service/port.

Fix

The ledger service URL is now configurable through an environment variable:

LEDGER_SERVICE_URL=http://ledger-service:3005/api/ledger

Impact

Transactions now use the configured ledger service endpoint and fail safely with appropriate logging when the ledger service is unavailable.

2. Unconnected Kafka Producer in Routes
Problem

A new KafkaService instance was created inside the routes but was never connected to Kafka.

new KafkaService()
    ↓
Never connected
    ↓
Kafka publish fails

Fix

A single KafkaService instance is created and connected during service startup. The connected instance is then injected into the routes.

Application Startup
       │
       ▼
Create KafkaService
       │
       ▼
Connect to Kafka
       │
       ▼
Inject into Routes
       │
       ▼
POST /api/transaction/create
       │
       ▼
Publish to Kafka

Impact

POST /api/transaction/create can now successfully publish transaction events to Kafka.

3. Blocking Consumer Startup
Problem

Previously, calling consumer.run() directly could block the HTTP server from starting.

consumer.run()
     │
     └── Blocks application startup
             │
             └── HTTP server cannot start

Fix

The Kafka consumer is started in the background without blocking HTTP server initialization.

Application Startup
       │
       ├── Start HTTP Server
       │
       └── Start Kafka Consumer
             └── Background

Impact

The HTTP server can start and accept requests while the Kafka consumer initializes.

4. Unused Kafka Connections
Problem

payment-service and wallet-service initialized Kafka connections even though they did not use Kafka.

Fix

Unused Kafka initialization was removed from these services.

Graceful shutdown handling was also added.

Impact

This prevents unnecessary Kafka connections and reduces the risk of resource leaks.

Configuration
Required Environment Variables
Transaction Service
KAFKA_BROKERS=kafka:29092

# Optional
LEDGER_SERVICE_URL=http://ledger-service:3005/api/ledger


LEDGER_SERVICE_URL is optional. Configure it when the ledger service is available.

Fraud Service
KAFKA_BROKERS=kafka:29092

FRAUD_THRESHOLD=500000
HIGH_RISK_THRESHOLD=50

Variable	Description
KAFKA_BROKERS	Kafka broker connection address
FRAUD_THRESHOLD	Amount above which a high-amount fraud rule is triggered
HIGH_RISK_THRESHOLD	Minimum risk score required to create a fraud alert
Notification Service
KAFKA_BROKERS=kafka:29092

EMAIL_USER=noreply@fintech.com
EMAIL_PASSWORD=your-app-password

TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE=+1234567890

USER_SERVICE_URL=http://user-service:3001

Variable	Description
KAFKA_BROKERS	Kafka broker connection address
EMAIL_USER	Email sender address
EMAIL_PASSWORD	Email provider password/app password
TWILIO_ACCOUNT_SID	Twilio account identifier
TWILIO_AUTH_TOKEN	Twilio authentication token
TWILIO_PHONE	Phone number used to send SMS
USER_SERVICE_URL	URL of the user service
Testing
Run Unit Tests
All Tests
npm test

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

Run Integration Tests

Integration tests require Docker Compose.

1. Start the Services
docker-compose up

2. Run Integration Tests
npm test -- --integration

Validation Checklist

Use the following checklist to verify the Kafka-based transaction flow.

Kafka

 Kafka broker is running.

 KAFKA_BROKERS is configured correctly.

 transactions topic is available.

 transaction-completed topic is available.

 Transaction service producer connects successfully.

 Transaction service consumer connects successfully.

 Fraud service consumer connects successfully.

 Notification service consumer connects successfully.

Transaction Service

 Database connection succeeds.

 KafkaService is initialized once.

 KafkaService connects successfully.

 KafkaService is injected into transaction routes.

 POST /api/transaction/create publishes to transactions.

 Transaction status changes from PENDING to PROCESSING.

 Ledger service is called when configured.

 Transaction status changes to COMPLETED.

 transaction-completed event is published.

Fraud Service

 Database connection succeeds.

 KafkaService connects successfully.

 transactions events are consumed.

 Fraud rules are evaluated.

 High-risk transactions create FraudAlert records.

Notification Service

 KafkaService connects successfully.

 transaction-completed events are consumed.

 User contact information is retrieved.

 Email notification is sent.

 SMS notification is sent.

Payment & Wallet Services

 Database connections succeed.

 HTTP servers start successfully.

 No unnecessary Kafka connections are created.

 Graceful shutdown works correctly.

Graceful Shutdown

 Services respond correctly to SIGTERM.

 Services respond correctly to SIGINT.

 HTTP server stops accepting new requests.

 Kafka connections are disconnected.

 Services exit cleanly.
