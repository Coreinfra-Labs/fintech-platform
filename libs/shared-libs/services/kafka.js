const { Kafka } = require('kafkajs');
const { createLogger } = require('../utils/logger');
const crypto = require('crypto');

const logger = createLogger('Kafka-Service');

class KafkaService {
  constructor(serviceName, groupId = null) {
    this.serviceName = serviceName;
    this.groupId = groupId;
    this.kafka = new Kafka({
      clientId: serviceName,
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });
    this.producer = null;
    this.consumer = null;
    this.consumerRunning = false;
  }

  async connect() {
    try {
      this.producer = this.kafka.producer();
      await this.producer.connect();
      if (this.groupId) {
        this.consumer = this.kafka.consumer({ groupId: this.groupId });
        await this.consumer.connect();
      }
      logger.info(`Kafka connected for ${this.serviceName}`);
    } catch (error) {
      logger.error(`Failed to connect to Kafka: ${error.message}`);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.producer) await this.producer.disconnect();
      if (this.consumer) await this.consumer.disconnect();
      this.consumerRunning = false;
      logger.info(`Kafka disconnected for ${this.serviceName}`);
    } catch (error) {
      logger.error(`Failed to disconnect from Kafka: ${error.message}`);
    }
  }

  async publishEvent(topic, message, key = null) {
    try {
      if (!this.producer) {
        throw new Error('Producer not initialized. Call connect() first.');
      }

      const payload = {
        messageId: message.messageId || crypto.randomUUID(),
        timestamp: message.timestamp || new Date().toISOString(),
        ...message,
      };

      await this.producer.send({
        topic,
        messages: [
          {
            key: key || payload.messageId,
            value: JSON.stringify(payload),
          },
        ],
      });

      logger.info(`Event published to ${topic}`, { messageId: payload.messageId });
      return payload;
    } catch (error) {
      logger.error(`Failed to publish event to ${topic}: ${error.message}`);
      throw error;
    }
  }

  async subscribeToTopic(topic, callback) {
    try {
      if (!this.consumer) {
        throw new Error('Consumer not initialized. Provide groupId in constructor.');
      }

      await this.consumer.subscribe({ topic, fromBeginning: false });

      this.consumerRunning = true;
      this.consumer
        .run({
          eachMessage: async ({ topic, partition, message }) => {
            try {
              const raw = message.value?.toString();
              if (!raw) {
                logger.warn(`Empty message received from ${topic}`);
                return;
              }

              const data = JSON.parse(raw);

              if (!data.messageId) {
                logger.warn(`Message without messageId from ${topic}`);
                return;
              }

              await callback(data);
            } catch (error) {
              logger.error(`Error processing message from ${topic}: ${error.message}`);
              throw error;
            }
          },
        })
        .catch((error) => {
          logger.error(`Consumer run failed for ${topic}: ${error.message}`);
          this.consumerRunning = false;
        });

      logger.info(`Subscribed to topic: ${topic}`);
    } catch (error) {
      logger.error(`Failed to subscribe to ${topic}: ${error.message}`);
      throw error;
    }
  }
}

module.exports = { KafkaService };
