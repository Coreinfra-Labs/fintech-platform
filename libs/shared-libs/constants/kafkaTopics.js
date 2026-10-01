/**
 * Centralized Kafka topic definitions.
 * All producers and consumers use these constants to avoid typos and ensure consistency.
 */

module.exports = {
  TOPICS: {
    TRANSACTIONS: 'transactions',
    TRANSACTION_COMPLETED: 'transaction-completed',
  },
  
  CONSUMER_GROUPS: {
    TRANSACTION_SERVICE: 'transaction-service-group',
    FRAUD_SERVICE: 'fraud-service-group',
    NOTIFICATION_SERVICE: 'notification-service-group',
  },
};
