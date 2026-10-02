require('dotenv').config();
require('./otel');
const express = require('express');
const cors = require('cors');
const { createLogger, errorHandler } = require('fintech-shared-libs');
const { sequelize } = require('./models');
const ledgerRoutes = require('./routes/ledger');

const app = express();
const logger = createLogger('Ledger-Service');

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ledger-service' });
});

app.use('/api/ledger', ledgerRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 3008;

let server = null;

const startServer = async () => {
  try {
    // Connect to database
    await sequelize.authenticate();
    logger.info('Database connected');
    await sequelize.sync({ alter: false });

    // Start HTTP server
    server = app.listen(PORT, () => {
      logger.info(`Ledger Service running on port ${PORT}`);
    });

    // Setup graceful shutdown
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

      await sequelize.close();
      process.exit(0);
    });
  });
};

startServer();

module.exports = app;
