// Utilities
const { createLogger } = require('./utils/logger');

// Middleware
const { errorHandler } = require('./middleware/errorHandler');
const { authMiddleware } = require('./middleware/auth');
const { rateLimitMiddleware } = require('./middleware/rateLimit');

// Services
const { KafkaService } = require('./services/kafka');

// Constants
const kafkaTopics = require('./constants/kafkaTopics');

// Validators
const { validateMessage } = require('./validators/kafkaSchemas');

module.exports = {
  // Utils
  createLogger,
  
  // Middleware
  errorHandler,
  authMiddleware,
  rateLimitMiddleware,
  
  // Services
  KafkaService,
  
  // Constants
  kafkaTopics,
  
  // Validators
  validateMessage,
};
