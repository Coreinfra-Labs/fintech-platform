require('dotenv').config();
require('./otel');
const express = require('express');
const cors = require('cors');
const { createLogger, KafkaService, errorHandler, kafkaTopics } = require('fintech-shared-libs');
const notificationRoutes = require('./routes/notification');
const { startNotificationConsumer } = require('./consumers/notificationConsumer');

const app = express();
const logger = createLogger('Notification-Service');

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification-service' });
});

app.use('/api/notification', notificationRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 3006;

let kafkaService = null;
let server = null;

const startServer = async () => {
  try {
    // 1. Initialize Kafka service (single instance)
    kafkaService = new KafkaService('notification-service', kafkaTopics.CONSUMER_GROUPS.NOTIFICATION_SERVICE);
    await kafkaService.connect();
    logger.info('Kafka connected');

    // 2. Start HTTP server (non-blocking)
    server = app.listen(PORT, () => {
      logger.info(`Notification Service running on port ${PORT}`);
    });

    // 3. Start Kafka consumer in background (non-blocking)
    await startNotificationConsumer(kafkaService);

    // 4. Setup graceful shutdown
    setupGracefulShutdown();
  } catch (error) {
    logger.error('Failed to start server:', error);
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

startServer();

module.exports = app;
