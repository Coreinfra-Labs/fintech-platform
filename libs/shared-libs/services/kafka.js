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

  async publishEvent(topic, message) {
    try {
      if (!this.producer) {
        throw new Error('Producer not initialized. Call connect() first.');
      }
      await this.producer.send({
        topic,
        messages: [{ value: JSON.stringify(message) }],
      });
      logger.info(`Event published to ${topic}`);
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
      
      // Start consumer in the background without blocking
      this.consumerRunning = true;
      this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const data = JSON.parse(message.value.toString());
            await callback(data);
          } catch (error) {
            logger.error(`Error processing message from ${topic}: ${error.message}`);
            // Message is not requeued; log for manual intervention
          }
        },
      }).catch((error) => {
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
