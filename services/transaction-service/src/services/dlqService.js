const { createLogger } = require('fintech-shared-libs');

const logger = createLogger('DLQ-Service');

/**
 * Dead Letter Queue (DLQ) Service
 * 
 * Handles failed message processing by:
 * 1. Publishing to DLQ topic
 * 2. Logging error details
 * 3. Creating retry metadata
 */
class DLQService {
  constructor(kafkaService) {
    this.kafkaService = kafkaService;
  }

  /**
   * Send message to Dead Letter Queue
   */
  async sendToDLQ(dlqTopic, originalMessage, error, context = {}) {
    try {
      const dlqMessage = {
        originalMessage,
        error: {
          message: error.message,
          stack: error.stack,
          code: error.code,
        },
        context,
        dlqTimestamp: new Date(),
        retryCount: context.retryCount || 0,
        maxRetries: context.maxRetries || 3,
      };

      await this.kafkaService.publishEvent(dlqTopic, dlqMessage);
      
      logger.warn(
        `Message sent to DLQ: ${dlqTopic} | ` +
        `Original topic: ${context.originalTopic} | ` +
        `Error: ${error.message}`
      );

      return true;
    } catch (dlqError) {
      logger.error(`Failed to send message to DLQ ${dlqTopic}: ${dlqError.message}`);
      return false;
    }
  }

  /**
   * Process DLQ message with retry logic
   */
  async processDLQMessage(dlqMessage, retryHandler) {
    try {
      const { originalMessage, retryCount, maxRetries } = dlqMessage;

      if (retryCount >= maxRetries) {
        logger.error(
          `DLQ message exceeded max retries (${maxRetries}): ${JSON.stringify(originalMessage)}`
        );
        return false;
      }

      logger.info(`Retrying DLQ message (attempt ${retryCount + 1}/${maxRetries})`);

      // Call the retry handler function
      await retryHandler(originalMessage);

      logger.info('DLQ message reprocessed successfully');
      return true;
    } catch (error) {
      logger.error(`DLQ reprocessing failed: ${error.message}`);
      return false;
    }
  }
}

module.exports = { DLQService };
