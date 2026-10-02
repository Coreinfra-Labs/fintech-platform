// Utilities
const { createLogger } = require('./utils/logger');

// Middleware
const { errorHandler } = require('./middleware/errorHandler');
const { authMiddleware } = require('./middleware/auth');
const { rateLimitMiddleware } = require('./middleware/rateLimit');

// Services
const { KafkaService } = require('./services/kafka');

// Patterns
const { OutboxService, InboxService } = require('./patterns/outboxInbox');
const { DLQRetryPolicy } = require('./patterns/dlqRetryPolicy');

// Constants
const kafkaTopics = require('./constants/kafkaTopics');

// Validators
const { validateMessage } = require('./validators/kafkaSchemas');

module.exports = {
  createLogger,
  errorHandler,
  authMiddleware,
  rateLimitMiddleware,
  KafkaService,
  OutboxService,
  InboxService,
  DLQRetryPolicy,
  kafkaTopics,
  validateMessage,
};
