const Joi = require('joi');

/**
 * Kafka message schemas for validation.
 * Ensures all messages conform to expected structure and types.
 */

const schemas = {
  // transactions topic
  TRANSACTIONS_MESSAGE: Joi.object({
    transactionId: Joi.string().uuid().required(),
    type: Joi.string().valid('TRANSFER', 'DEPOSIT', 'WITHDRAWAL', 'PAYMENT').required(),
    amount: Joi.number().positive().required(),
    sourceWalletId: Joi.string().uuid().required(),
    destinationWalletId: Joi.string().uuid().allow(null).optional(),
    status: Joi.string().valid('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED').required(),
    timestamp: Joi.date().required(),
  }),

  // transaction-completed topic
  TRANSACTION_COMPLETED_MESSAGE: Joi.object({
    transactionId: Joi.string().uuid().required(),
    status: Joi.string().valid('COMPLETED', 'FAILED').required(),
    amount: Joi.number().positive().required(),
    type: Joi.string().valid('TRANSFER', 'DEPOSIT', 'WITHDRAWAL', 'PAYMENT').required(),
    sourceWalletId: Joi.string().uuid().required(),
    destinationWalletId: Joi.string().uuid().allow(null).optional(),
  }),

  // DLQ message
  DLQ_MESSAGE: Joi.object({
    originalMessage: Joi.object().required(),
    error: Joi.object({
      message: Joi.string().required(),
      stack: Joi.string().allow(null),
      code: Joi.string().allow(null),
    }).required(),
    context: Joi.object().required(),
    dlqTimestamp: Joi.date().required(),
    retryCount: Joi.number().min(0).required(),
    maxRetries: Joi.number().min(1).required(),
  }),
};

/**
 * Validates a message against its schema.
 * @param {string} messageType - The type of message (e.g., 'TRANSACTIONS_MESSAGE')
 * @param {object} message - The message to validate
 * @returns {object} - { valid: boolean, error?: string, value?: object }
 */
const validateMessage = (messageType, message) => {
  const schema = schemas[messageType];
  if (!schema) {
    return { valid: false, error: `Unknown message type: ${messageType}` };
  }

  const { error, value } = schema.validate(message, {
    abortEarly: false,
    stripUnknown: false,
  });

  if (error) {
    return {
      valid: false,
      error: error.details.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
    };
  }

  return { valid: true, value };
};

module.exports = {
  schemas,
  validateMessage,
};
