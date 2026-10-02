require('dotenv').config();
const express = require('express');
const proxy = require('express-http-proxy');
const cors = require('cors');
const { createLogger, authMiddleware, rateLimitMiddleware } = require('fintech-shared-libs');

const app = express();
const logger = createLogger('API-Gateway');
let server = null;

app.use(cors());
app.use(express.json());
app.use(rateLimitMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

// Auth routes (no auth required)
app.use(
  '/api/auth',
  proxy(process.env.USER_SERVICE_URL || 'http://localhost:3001', {
    proxyReqPathResolver: (req) => `/api/auth${req.baseUrl.substring(9)}`,
  })
);

// Protected routes
app.use(authMiddleware);

// User routes
app.use(
  '/api/profile',
  proxy(process.env.USER_SERVICE_URL || 'http://localhost:3001', {
    proxyReqPathResolver: (req) => `/api/profile${req.baseUrl.substring(12)}`,
  })
);

// Wallet routes
app.use(
  '/api/wallet',
  proxy(process.env.WALLET_SERVICE_URL || 'http://localhost:3002', {
    proxyReqPathResolver: (req) => `/api/wallet${req.baseUrl.substring(11)}`,
  })
);

// Transaction routes
app.use(
  '/api/transaction',
  proxy(process.env.TRANSACTION_SERVICE_URL || 'http://localhost:3003', {
    proxyReqPathResolver: (req) => `/api/transaction${req.baseUrl.substring(15)}`,
  })
);

// Payment routes
app.use(
  '/api/payment',
  proxy(process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004', {
    proxyReqPathResolver: (req) => `/api/payment${req.baseUrl.substring(12)}`,
  })
);

// Fraud routes
app.use(
  '/api/fraud',
  proxy(process.env.FRAUD_SERVICE_URL || 'http://localhost:3005', {
    proxyReqPathResolver: (req) => `/api/fraud${req.baseUrl.substring(10)}`,
  })
);

// Notification routes
app.use(
  '/api/notification',
  proxy(process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006', {
    proxyReqPathResolver: (req) => `/api/notification${req.baseUrl.substring(17)}`,
  })
);

// Error handling
app.use((err, req, res, next) => {
  logger.error('Gateway error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

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

server = app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
  setupGracefulShutdown();
});

module.exports = app;
