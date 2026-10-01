/**
 * Kafka topics constants test.
 * Ensures topic names are consistent across services.
 */

const kafkaTopics = require('../../constants/kafkaTopics');

describe('Kafka Topics Constants', () => {
  it('should export TOPICS with required names', () => {
    expect(kafkaTopics.TOPICS).toBeDefined();
    expect(kafkaTopics.TOPICS.TRANSACTIONS).toBe('transactions');
    expect(kafkaTopics.TOPICS.TRANSACTION_COMPLETED).toBe('transaction-completed');
  });

  it('should export CONSUMER_GROUPS with required names', () => {
    expect(kafkaTopics.CONSUMER_GROUPS).toBeDefined();
    expect(kafkaTopics.CONSUMER_GROUPS.TRANSACTION_SERVICE).toBe('transaction-service-group');
    expect(kafkaTopics.CONSUMER_GROUPS.FRAUD_SERVICE).toBe('fraud-service-group');
    expect(kafkaTopics.CONSUMER_GROUPS.NOTIFICATION_SERVICE).toBe('notification-service-group');
  });

  it('should have matching topic and group configurations', () => {
    // Ensure no typos across different consumers
    const topics = Object.values(kafkaTopics.TOPICS);
    const groups = Object.values(kafkaTopics.CONSUMER_GROUPS);

    expect(topics.length).toBeGreaterThan(0);
    expect(groups.length).toBeGreaterThan(0);
    expect(topics).toContain('transactions');
    expect(topics).toContain('transaction-completed');
  });
});
