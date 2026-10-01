/**
 * Transaction routes tests.
 * Tests the /create endpoint with Kafka mocked.
 */

const request = require('supertest');
const { v4: uuidv4 } = require('uuid');
const express = require('express');
const transactionRoutes = require('../../src/routes/transaction');
const { Transaction } = require('../../src/models');

jest.mock('../../src/models');

describe('Transaction Routes', () => {
  let app;
  let mockKafkaService;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    mockKafkaService = {
      publishEvent: jest.fn().mockResolvedValue(undefined),
    };

    transactionRoutes.setKafkaService(mockKafkaService);
    app.use('/api/transaction', transactionRoutes);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /create', () => {
    it('should create a transaction and publish to Kafka', async () => {
      const transactionId = uuidv4();
      const sourceWalletId = uuidv4();
      const destinationWalletId = uuidv4();

      Transaction.findOne = jest.fn().mockResolvedValue(null);
      Transaction.create = jest.fn().mockResolvedValue({
        id: transactionId,
        sourceWalletId,
        destinationWalletId,
        amount: 1000,
        type: 'TRANSFER',
        reference: 'TXN-abc123',
        status: 'PENDING',
      });

      const response = await request(app)
        .post('/api/transaction/create')
        .send({
          sourceWalletId,
          destinationWalletId,
          amount: 1000,
          type: 'TRANSFER',
          idempotencyKey: uuidv4(),
        });

      expect(response.status).toBe(201);
      expect(response.body.transaction.status).toBe('PENDING');
      expect(mockKafkaService.publishEvent).toHaveBeenCalledWith(
        'transactions',
        expect.objectContaining({
          transactionId,
          type: 'TRANSFER',
          amount: 1000,
        })
      );
    });

    it('should return 400 for invalid input', async () => {
      const response = await request(app)
        .post('/api/transaction/create')
        .send({
          sourceWalletId: 'invalid-uuid',
          amount: -100,
          type: 'TRANSFER',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should return 200 if transaction already processed (idempotency)', async () => {
      const transactionId = uuidv4();
      const idempotencyKey = uuidv4();

      Transaction.findOne = jest.fn().mockResolvedValue({
        id: transactionId,
        status: 'COMPLETED',
      });

      const response = await request(app)
        .post('/api/transaction/create')
        .send({
          sourceWalletId: uuidv4(),
          destinationWalletId: uuidv4(),
          amount: 1000,
          type: 'TRANSFER',
          idempotencyKey,
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toMatch(/already processed/i);
    });
  });
});
