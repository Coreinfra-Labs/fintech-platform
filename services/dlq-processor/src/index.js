const express = require('express');
require('./otel');
const { createLogger, KafkaService, kafkaTopics } = require('fintech-shared-libs');

const app = express();
const logger = createLogger('DLQ-Processor');

const PORT = process.env.PORT || 3009;
let kafkaService = null;
let server = null;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'dlq-processor' });
});

const dlqTopics = [
  kafkaTopics.TOPICS.TRANSACTION_FAILED_DLQ,
  kafkaTopics.TOPICS.FRAUD_CHECK_DLQ,
  kafkaTopics.TOPICS.NOTIFICATION_DLQ,
  kafkaTopics.TOPICS.PAYMENT_FAILED_DLQ,
];

const startProcessor = async () => {
  try {
    kafkaService = new KafkaService('dlq-processor', kafkaTopics.CONSUMER_GROUPS.DLQ_PROCESSOR);
    await kafkaService.connect();
    logger.info('Kafka connected for DLQ processing');

    for (const topic of dlqTopics) {
      await kafkaService.subscribeToTopic(topic, async (message) => {
        logger.warn(`DLQ message received from ${topic}`, { topic, message });
      });
    }

    server = app.listen(PORT, () => {
      logger.info(`DLQ Processor running on port ${PORT}`);
    });

    setupGracefulShutdown();
  } catch (error) {
    logger.error('Failed to start DLQ processor:', error);
    process.exit(1);
  }
};

const setupGracefulShutdown = () => {
  const signals = ['SIGTERM', 'SIGINT'];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      if (server) {
        server.close(() => {
          logger.info('HTTP server closed');
        });
      }

      if (kafkaService) {
        await kafkaService.disconnect();
      }

      process.exit(0);
    });
  });
};

startProcessor();

module.exports = app;
