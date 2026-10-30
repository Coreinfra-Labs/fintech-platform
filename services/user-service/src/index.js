require('dotenv').config();
const { shutdown: shutdownTelemetry } = require('./otel');
const express = require('express');
const cors = require('cors');
const { createLogger, errorHandler } = require('fintech-shared-libs');
const { sequelize } = require('./models');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
require('express-async-errors');

const app = express();
const logger = createLogger('User-Service');

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'user-service', timestamp: new Date() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);

// Error handling
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3001;
let server = null;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connected successfully');

    await sequelize.sync({ alter: false });
    logger.info('Database models synced');

    server = app.listen(PORT, () => {
      logger.info(`User Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, async () => {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }

    await sequelize.close();
    await shutdownTelemetry();
    process.exit(0);
  });
}

module.exports = app;
