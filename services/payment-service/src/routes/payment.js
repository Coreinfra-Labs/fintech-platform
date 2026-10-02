const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const axios = require('axios');
const { Payment } = require('../models');
const { createLogger, kafkaTopics } = require('fintech-shared-libs');

const router = express.Router();
const logger = createLogger('Payment-Routes');

let kafkaService = null;

const setKafkaService = (service) => {
  kafkaService = service;
};

const bankTransferSchema = Joi.object({
  sourceWalletId: Joi.string().uuid().required(),
  destinationAccountNumber: Joi.string().required(),
  destinationBankCode: Joi.string().required(),
  amount: Joi.number().positive().required(),
  description: Joi.string().allow(null),
  idempotencyKey: Joi.string().required(),
});

router.post('/bank-transfer', async (req, res) => {
  try {
    const { error, value } = bankTransferSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check for idempotency
    const existing = await Payment.findOne({
      where: { idempotencyKey: value.idempotencyKey },
    });
    if (existing) {
      return res.status(200).json({
        message: 'Payment already processed',
        payment: existing,
      });
    }

    // Create payment record
    const payment = await Payment.create({
      sourceWalletId: value.sourceWalletId,
      destinationAccountNumber: value.destinationAccountNumber,
      destinationBankCode: value.destinationBankCode,
      amount: value.amount,
      reference: `PAY-${uuidv4().substring(0, 8)}`,
      idempotencyKey: value.idempotencyKey,
      description: value.description,
      status: 'INITIATED',
    });

    // Publish payment initiated event
    if (kafkaService) {
      try {
        await kafkaService.publishEvent(kafkaTopics.TOPICS.PAYMENT_INITIATED, {
          paymentId: payment.id,
          sourceWalletId: value.sourceWalletId,
          amount: value.amount,
          destinationAccountNumber: value.destinationAccountNumber,
          destinationBankCode: value.destinationBankCode,
          reference: payment.reference,
          status: 'INITIATED',
          timestamp: new Date(),
        });
        logger.info(`Payment initiated event published: ${payment.id}`);
      } catch (kafkaError) {
        logger.error(`Failed to publish payment initiated event: ${kafkaError.message}`);
      }
    }

    logger.info(`Payment created: ${payment.id}`);

    res.status(201).json({
      message: 'Bank transfer initiated',
      payment: {
        id: payment.id,
        reference: payment.reference,
        amount: payment.amount,
        status: payment.status,
      },
    });
  } catch (error) {
    logger.error('Payment creation error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

router.get('/status/:reference', async (req, res) => {
  try {
    const payment = await Payment.findOne({
      where: { reference: req.params.reference },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({
      id: payment.id,
      reference: payment.reference,
      amount: payment.amount,
      status: payment.status,
      destinationAccountNumber: payment.destinationAccountNumber,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    });
  } catch (error) {
    logger.error('Payment status retrieval error:', error);
    res.status(500).json({ error: 'Failed to fetch payment status' });
  }
});

router.post('/validate-account', async (req, res) => {
  try {
    const { accountNumber, bankCode } = req.body;

    if (!accountNumber || !bankCode) {
      return res.status(400).json({ error: 'Account number and bank code are required' });
    }

    // Call NIBSS mock service to validate account
    const nibssResponse = await axios.post(
      `${process.env.NIBSS_API_URL || 'http://nibss-mock:3007'}/api/validate-account`,
      { accountNumber, bankCode },
      { timeout: 5000 }
    );

    res.json({
      valid: nibssResponse.data.valid,
      accountName: nibssResponse.data.accountName,
      bankCode: nibssResponse.data.bankCode,
    });
  } catch (error) {
    logger.error('Account validation error:', error.message);
    res.status(500).json({ error: 'Failed to validate account' });
  }
});

module.exports = router;
module.exports.setKafkaService = setKafkaService;
