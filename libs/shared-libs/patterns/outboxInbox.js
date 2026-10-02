const { createLogger } = require('../utils/logger');

const logger = createLogger('Outbox-Inbox');

class OutboxService {
  constructor(sequelize, kafkaService) {
    this.sequelize = sequelize;
    this.kafkaService = kafkaService;
  }

  async write(transaction, aggregateId, aggregateType, eventType, payload, kafkaTopic) {
    try {
      const outbox = await this.sequelize.models.Outbox.create(
        {
          aggregateId,
          aggregateType,
          eventType,
          payload,
          kafkaTopic,
          published: false,
          createdAt: new Date(),
        },
        { transaction }
      );

      logger.info(`Outbox entry created: ${outbox.id}`, {
        aggregateId,
        aggregateType,
        eventType,
      });

      return outbox;
    } catch (error) {
      logger.error(`Failed to write to outbox: ${error.message}`);
      throw error;
    }
  }

  async pollAndPublish() {
    try {
      const unpublished = await this.sequelize.models.Outbox.findAll({
        where: { published: false },
        limit: 100,
        order: [['createdAt', 'ASC']],
      });

      if (unpublished.length === 0) {
        return;
      }

      logger.info(`Found ${unpublished.length} unpublished outbox entries`);

      for (const entry of unpublished) {
        try {
          await this.kafkaService.publishEvent(entry.kafkaTopic, entry.payload, entry.aggregateId);
          await entry.update({ published: true, publishedAt: new Date() });
          logger.info(`Outbox entry published: ${entry.id}`, { topic: entry.kafkaTopic });
        } catch (error) {
          logger.error(`Failed to publish outbox entry ${entry.id}: ${error.message}`);
        }
      }
    } catch (error) {
      logger.error(`Outbox poll failed: ${error.message}`);
    }
  }
}

class InboxService {
  constructor(sequelize) {
    this.sequelize = sequelize;
  }

  async isProcessed(messageId) {
    try {
      const entry = await this.sequelize.models.Inbox.findOne({
        where: { messageId, processed: true },
      });
      return !!entry;
    } catch (error) {
      logger.error(`Failed to check inbox: ${error.message}`);
      return false;
    }
  }

  async markProcessed(messageId, message, consumerGroup) {
    try {
      return await this.sequelize.models.Inbox.create({
        messageId,
        message,
        consumerGroup,
        processed: true,
        processedAt: new Date(),
      });
    } catch (error) {
      logger.error(`Failed to mark message as processed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = { OutboxService, InboxService };
