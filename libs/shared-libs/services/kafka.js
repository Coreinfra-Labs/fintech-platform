const { Kafka } = require('kafkajs');
const { createLogger } = require('../utils/logger');

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
    if (!this.producer) throw new Error('Producer not initialized');

    const payload = {
      messageId: message.messageId || crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...message,
    };

    await this.producer.send({
      topic,
      messages: [{
        key: key || payload.messageId,
        value: JSON.stringify(payload),
      }],
    });

    logger.info(`Event published to ${topic}`, { messageId: payload.messageId });
    return payload;
  } catch (error) {
    logger.error(`Failed to publish event to ${topic}: ${error.message}`);
    throw error;
  }
}
async subscribeToTopic(topic, callback) {
  if (!this.consumer) throw new Error('Consumer not initialized');

  await this.consumer.subscribe({ topic, fromBeginning: false });

  await this.consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const raw = message.value?.toString();
        if (!raw) return;

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
  });
}
  
}

module.exports = { KafkaService };
