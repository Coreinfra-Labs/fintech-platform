const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const { Transaction } = require('../models');
const { createLogger, kafkaTopics, validateMessage } = require('fintech-shared-libs');

const router = express.Router();
const logger = createLogger('Transaction-Routes');

let kafkaService = null;

const setKafkaService = (service) => {
  kafkaService = service;
};

const transactionSchema = Joi.object({
  sourceWalletId: Joi.string().uuid().required(),
  destinationWalletId: Joi.string().uuid().allow(null),
  destinationAccountNumber: Joi.string().allow(null),
  destinationBankCode: Joi.string().allow(null),
  amount: Joi.number().positive().required(),
  type: Joi.string()
    .valid('TRANSFER', 'DEPOSIT', 'WITHDRAWAL', 'PAYMENT')
    .required(),
  description: Joi.string().allow(null),
  idempotencyKey: Joi.string().required(),
});

router.post('/create', async (req, res) => {
  try {
    const { error, value } = transactionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const existing = await Transaction.findOne({
      where: { idempotencyKey: value.idempotencyKey },
    });
    if (existing) {
      return res.status(200).json({
        message: 'Transaction already processed',
        transaction: existing,
      });
    }

    const transaction = await Transaction.create({
      sourceWalletId: value.sourceWalletId,
      destinationWalletId: value.destinationWalletId,
      destinationAccountNumber: value.destinationAccountNumber,
      destinationBankCode: value.destinationBankCode,
      amount: value.amount,
      type: value.type,
      reference: `TXN-${uuidv4().substring(0, 8)}`,
      idempotencyKey: value.idempotencyKey,
      description: value.description,
      status: 'PENDING',
      metadata: {
        createdAt: new Date(),
        version: 1,
      },
    });

    if (kafkaService) {
      const messagePayload = {
        transactionId: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        sourceWalletId: transaction.sourceWalletId,
        destinationWalletId: transaction.destinationWalletId,
        status: 'PENDING',
        timestamp: new Date(),
      };

      // Validate message before publishing
      const validation = validateMessage('TRANSACTIONS_MESSAGE', messagePayload);
      if (!validation.valid) {
        logger.error(`Message validation failed: ${validation.error}`);
        return res.status(500).json({ error: 'Failed to publish transaction event' });
      }

      await kafkaService.publishEvent(kafkaTopics.TOPICS.TRANSACTIONS, validation.value);
    } else {
      logger.warn('Kafka service not initialized; transaction event not published');
    }

    logger.info(`Transaction created: ${transaction.id}`);

    res.status(201).json({
      message: 'Transaction initiated',
      transaction: {
        id: transaction.id,
        reference: transaction.reference,
        amount: transaction.amount,
        status: transaction.status,
      },
    });
  } catch (error) {
    logger.error('Transaction creation error:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

router.get('/:transactionId', async (req, res) => {
  try {
    const transaction = await Transaction.findByPk(req.params.transactionId);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({
      id: transaction.id,
      reference: transaction.reference,
      amount: transaction.amount,
      type: transaction.type,
      status: transaction.status,
      description: transaction.description,
      createdAt: transaction.createdAt,
      settledAt: transaction.settledAt,
    });
  } catch (error) {
    logger.error('Transaction retrieval error:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

router.get('/wallet/:walletId', async (req, res) => {
  try {
    const transactions = await Transaction.findAll({
      where: {
        sourceWalletId: req.params.walletId,
      },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    res.json({ transactions });
  } catch (error) {
    logger.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

module.exports = router;
module.exports.setKafkaService = setKafkaService;
