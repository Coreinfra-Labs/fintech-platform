require('dotenv').config();
require('./otel');
const express = require('express');
const cors = require('cors');
const { createLogger, KafkaService, errorHandler, kafkaTopics } = require('fintech-shared-libs');
const { sequelize } = require('./models');
const transactionRoutes = require('./routes/transaction');
const { startTransactionConsumer } = require('./consumers/transactionConsumer');

const app = express();
const logger = createLogger('Transaction-Service');

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'transaction-service' });
});

app.use('/api/transaction', transactionRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 3003;

let kafkaService = null;
let server = null;

const startServer = async () => {
  try {
    // 1. Connect to database
    await sequelize.authenticate();
    logger.info('Database connected');
    await sequelize.sync({ alter: false });

    // 2. Initialize Kafka service (single instance)
    kafkaService = new KafkaService('transaction-service', kafkaTopics.CONSUMER_GROUPS.TRANSACTION_SERVICE);
    await kafkaService.connect();
    logger.info('Kafka connected');

    // 3. Inject Kafka service into routes
    transactionRoutes.setKafkaService(kafkaService);

    // 4. Start HTTP server (non-blocking)
    server = app.listen(PORT, () => {
      logger.info(`Transaction Service running on port ${PORT}`);
    });

    // 5. Start Kafka consumer in background (non-blocking)
    await startTransactionConsumer(kafkaService);

    // 6. Setup graceful shutdown
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
