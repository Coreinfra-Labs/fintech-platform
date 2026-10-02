const { createLogger } = require('fintech-shared-libs');

const logger = createLogger('DLQ-Service');

class DLQService {
  constructor(kafkaService) {
    this.kafkaService = kafkaService;
  }

  async sendToDLQ(dlqTopic, originalMessage, error, metadata = {}) {
    try {
      const dlqMessage = {
        timestamp: new Date().toISOString(),
        originalMessage,
        error: {
          message: error && error.message ? error.message : 'Unknown error',
          stack: error && error.stack ? error.stack : null,
        },
        metadata,
      };

      await this.kafkaService.publishEvent(dlqTopic, dlqMessage);
      logger.warn(`Message sent to DLQ topic: ${dlqTopic}`, {
        dlqTopic,
        metadata,
      });
    } catch (dlqError) {
      logger.error(`Failed to send message to DLQ topic ${dlqTopic}: ${dlqError.message}`, {
        dlqTopic,
        metadata,
        originalMessage,
      });
    }
  }
}

module.exports = { DLQService };
