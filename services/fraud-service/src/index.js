require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createLogger, KafkaService, errorHandler, kafkaTopics } = require('fintech-shared-libs');
const { sequelize } = require('./models');
const fraudRoutes = require('./routes/fraud');
const { startFraudConsumer } = require('./consumers/fraudConsumer');

const app = express();
const logger = createLogger('Fraud-Service');

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'fraud-service' });
});

app.use('/api/fraud', fraudRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 3005;

let kafkaService = null;
let server = null;

const startServer = async () => {
  try {
    // 1. Connect to database
    await sequelize.authenticate();
    logger.info('Database connected');
    await sequelize.sync({ alter: false });

    // 2. Initialize Kafka service (single instance)
    kafkaService = new KafkaService('fraud-service', kafkaTopics.CONSUMER_GROUPS.FRAUD_SERVICE);
    await kafkaService.connect();
    logger.info('Kafka connected');

    // 3. Start HTTP server (non-blocking)
    server = app.listen(PORT, () => {
      logger.info(`Fraud Service running on port ${PORT}`);
    });

    // 4. Start Kafka consumer in background (non-blocking)
    await startFraudConsumer(kafkaService);

    // 5. Setup graceful shutdown
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
