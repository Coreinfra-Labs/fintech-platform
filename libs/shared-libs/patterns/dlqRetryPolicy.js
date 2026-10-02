const { createLogger } = require('../utils/logger');

const logger = createLogger('DLQ-Retry-Policy');

class DLQRetryPolicy {
  constructor(kafkaService, sequelize, options = {}) {
    this.kafkaService = kafkaService;
    this.sequelize = sequelize;
    this.baseDelayMs = options.baseDelayMs || 1000;
    this.maxBackoffMs = options.maxBackoffMs || 300000;
    this.maxRetries = options.maxRetries || 3;
  }

  calculateBackoff(retryCount) {
    const delay = this.baseDelayMs * Math.pow(2, retryCount);
    return Math.min(delay, this.maxBackoffMs);
  }

  async storeDLQMessage(dlqTopic, originalMessage, error, metadata = {}) {
    try {
      const entry = await this.sequelize.models.DLQMessage.create({
        dlqTopic,
        originalMessage,
        errorMessage: error && error.message ? error.message : 'Unknown error',
        errorStack: error && error.stack ? error.stack : null,
        metadata,
        retryCount: 0,
        status: 'PENDING',
        nextRetryAt: new Date(Date.now() + this.calculateBackoff(0)),
      });

      logger.warn(`DLQ message stored: ${entry.id}`, { dlqTopic, nextRetryAt: entry.nextRetryAt });
      return entry;
    } catch (error) {
      logger.error(`Failed to store DLQ message: ${error.message}`);
      throw error;
    }
  }

  async getPendingRetries() {
    try {
      const now = new Date();
      return await this.sequelize.models.DLQMessage.findAll({
        where: {
          status: 'PENDING',
          nextRetryAt: { [this.sequelize.Sequelize.Op.lte]: now },
          retryCount: { [this.sequelize.Sequelize.Op.lt]: this.maxRetries },
        },
        order: [['nextRetryAt', 'ASC']],
        limit: 50,
      });
    } catch (error) {
      logger.error(`Failed to retrieve pending retries: ${error.message}`);
      return [];
    }
  }

  async retryMessage(dlqEntry, originalTopic) {
    try {
      await this.kafkaService.publishEvent(
        originalTopic || dlqEntry.metadata.originalTopic,
        dlqEntry.originalMessage,
        dlqEntry.originalMessage?.messageId
      );

      const nextRetryCount = dlqEntry.retryCount + 1;
      const nextRetryAt = new Date(Date.now() + this.calculateBackoff(nextRetryCount));

      await dlqEntry.update({
        retryCount: nextRetryCount,
        status: nextRetryCount >= this.maxRetries ? 'FAILED' : 'RETRYING',
        nextRetryAt,
        lastRetryAt: new Date(),
      });

      logger.info(`DLQ message retry scheduled: ${dlqEntry.id}`, {
        retryCount: nextRetryCount,
        nextRetryAt,
      });

      return true;
    } catch (error) {
      logger.error(`Failed to retry DLQ message ${dlqEntry.id}: ${error.message}`);
      return false;
    }
  }

  async markResolved(dlqEntry, resolution = 'max_retries_reached') {
    try {
      await dlqEntry.update({
        status: 'FAILED',
        resolution,
        resolvedAt: new Date(),
      });

      logger.warn(`DLQ message marked as failed: ${dlqEntry.id}`, {
        resolution,
        retryCount: dlqEntry.retryCount,
      });
    } catch (error) {
      logger.error(`Failed to mark DLQ message as resolved: ${error.message}`);
    }
  }
}

module.exports = { DLQRetryPolicy };
