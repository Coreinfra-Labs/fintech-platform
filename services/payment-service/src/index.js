require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createLogger, errorHandler } = require('fintech-shared-libs');
const { sequelize } = require('./models');
const paymentRoutes = require('./routes/payment');

const app = express();
const logger = createLogger('Payment-Service');

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'payment-service' });
});

app.use('/api/payment', paymentRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 3004;

let server = null;

const startServer = async () => {
  // Start the API immediately
  server = app.listen(PORT, () => {
    logger.info(`Payment Service running on port ${PORT}`);
  });

  // Initialize PostgreSQL
  try {
    await sequelize.authenticate();
    logger.info('Database connected');

    await sequelize.sync({ alter: false });
  } catch (error) {
    logger.error('Database unavailable:', error.message);
  }

  // Setup graceful shutdown
  setupGracefulShutdown();
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

      process.exit(0);
    });
  });
};

startServer();

module.exports = app;
