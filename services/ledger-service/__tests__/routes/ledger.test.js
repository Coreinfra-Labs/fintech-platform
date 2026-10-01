/**
 * Ledger routes tests.
 * Tests the /record and /validate endpoints with database and wallet service mocked.
 */

const request = require('supertest');
const express = require('express');
const ledgerRoutes = require('../../src/routes/ledger');
const { LedgerEntry } = require('../../src/models');
const axios = require('axios');

jest.mock('../../src/models');
jest.mock('axios');

describe('Ledger Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/ledger', ledgerRoutes);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /record', () => {
    it('should create ledger entries for TRANSFER', async () => {
      const transactionId = 'txn-123';
      const sourceWalletId = 'wallet-1';
      const destWalletId = 'wallet-2';
      const amount = 1000;

      LedgerEntry.create = jest.fn().mockResolvedValue({
        id: 'entry-1',
        transactionId,
      });
      axios.post = jest.fn().mockResolvedValue({ data: {} });

      const response = await request(app)
        .post('/api/ledger/record')
        .send({
          transactionId,
          sourceWalletId,
          destinationWalletId: destWalletId,
          amount,
          type: 'TRANSFER',
        });

      expect(response.status).toBe(200);
      expect(response.body.entriesCount).toBe(2); // One debit, one credit
      expect(LedgerEntry.create).toHaveBeenCalledTimes(2);
      expect(axios.post).toHaveBeenCalledTimes(2); // Update both wallets
    });

    it('should create ledger entries for DEPOSIT', async () => {
      const transactionId = 'txn-deposit';
      const walletId = 'wallet-1';
      const amount = 5000;

      LedgerEntry.create = jest.fn().mockResolvedValue({
        id: 'entry-1',
        transactionId,
      });
      axios.post = jest.fn().mockResolvedValue({ data: {} });

      const response = await request(app)
        .post('/api/ledger/record')
        .send({
          transactionId,
          sourceWalletId: walletId,
          destinationWalletId: null,
          amount,
          type: 'DEPOSIT',
        });

      expect(response.status).toBe(200);
      expect(response.body.entriesCount).toBe(2);
      expect(LedgerEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          accountType: 'REVENUE',
        })
      );
    });

    it('should return 400 for invalid input', async () => {
      const response = await request(app)
        .post('/api/ledger/record')
        .send({
          transactionId: 'invalid-uuid',
          amount: -100, // Negative amount
          type: 'TRANSFER',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /validate', () => {
    it('should validate ledger balance', async () => {
      const transactionId = 'txn-123';

      LedgerEntry.findAll = jest.fn().mockResolvedValue([
        { debit: 1000, credit: 0 },
        { debit: 0, credit: 1000 },
      ]);

      const response = await request(app)
        .post('/api/ledger/validate')
        .send({ transactionId });

      expect(response.status).toBe(200);
      expect(response.body.totalDebits).toBe(1000);
      expect(response.body.totalCredits).toBe(1000);
      expect(response.body.isBalanced).toBe(true);
    });

    it('should detect unbalanced ledger', async () => {
      const transactionId = 'txn-unbalanced';

      LedgerEntry.findAll = jest.fn().mockResolvedValue([
        { debit: 1000, credit: 0 },
        { debit: 0, credit: 500 }, // Missing 500
      ]);

      const response = await request(app)
        .post('/api/ledger/validate')
        .send({ transactionId });

      expect(response.status).toBe(200);
      expect(response.body.isBalanced).toBe(false);
    });
  });

  describe('GET /entries/:transactionId', () => {
    it('should retrieve ledger entries for transaction', async () => {
      const transactionId = 'txn-123';

      LedgerEntry.findAll = jest.fn().mockResolvedValue([
        {
          id: 'entry-1',
          accountId: 'wallet-1',
          debit: 1000,
          credit: 0,
          createdAt: new Date(),
        },
        {
          id: 'entry-2',
          accountId: 'wallet-2',
          debit: 0,
          credit: 1000,
          createdAt: new Date(),
        },
      ]);

      const response = await request(app)
        .get(`/api/ledger/entries/${transactionId}`);

      expect(response.status).toBe(200);
      expect(response.body.entries).toHaveLength(2);
    });
  });
});
