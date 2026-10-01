/**
 * Centralized Kafka topic definitions.
 * All producers and consumers use these constants to avoid typos and ensure consistency.
 */

module.exports = {
  TOPICS: {
    TRANSACTIONS: 'transactions',
    TRANSACTION_COMPLETED: 'transaction-completed',
    TRANSACTION_FAILED_DLQ: 'transaction-failed-dlq',
    FRAUD_CHECK_DLQ: 'fraud-check-dlq',
    NOTIFICATION_DLQ: 'notification-dlq',
  },
  
  CONSUMER_GROUPS: {
    TRANSACTION_SERVICE: 'transaction-service-group',
    FRAUD_SERVICE: 'fraud-service-group',
    NOTIFICATION_SERVICE: 'notification-service-group',
    DLQ_PROCESSOR: 'dlq-processor-group',
  },
};
