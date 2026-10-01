/**
 * Transaction consumer tests.
 * Tests the Kafka consumer handler with database and HTTP mocked.
 */

const { startTransactionConsumer } = require('../../src/consumers/transactionConsumer');
const { Transaction } = require('../../src/models');
const axios = require('axios');

jest.mock('../../src/models');
jest.mock('axios');

describe('Transaction Consumer', () => {
  let mockKafkaService;
  let consumerCallback;

  beforeEach(() => {
    process.env.LEDGER_SERVICE_URL = 'http://ledger-service:3005';

    mockKafkaService = {
      subscribeToTopic: jest.fn((topic, callback) => {
        consumerCallback = callback;
        return Promise.resolve();
      }),
      publishEvent: jest.fn().mockResolvedValue(undefined),
    };

    Transaction.findByPk = jest.fn();
    Transaction.prototype.update = jest.fn().mockResolvedValue({});
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.LEDGER_SERVICE_URL;
  });

  it('should process transaction and publish completion event on success', async () => {
    const transactionId = 'test-txn-id';
    const sourceWalletId = 'wallet-1';
    const destinationWalletId = 'wallet-2';

    const mockTransaction = {
      id: transactionId,
      sourceWalletId,
      destinationWalletId,
      amount: 1000,
      type: 'TRANSFER',
      update: jest.fn().mockResolvedValue({}),
    };

    Transaction.findByPk.mockResolvedValue(mockTransaction);
    axios.post.mockResolvedValue({ data: { success: true } });

    await startTransactionConsumer(mockKafkaService);
    await consumerCallback({
      transactionId,
      type: 'TRANSFER',
      amount: 1000,
      sourceWalletId,
      destinationWalletId,
      status: 'PENDING',
      timestamp: new Date(),
    });

    // Should update to PROCESSING
    expect(mockTransaction.update).toHaveBeenCalledWith({ status: 'PROCESSING' });

    // Should call ledger service
    expect(axios.post).toHaveBeenCalledWith(
      'http://ledger-service:3005/api/ledger/record',
      expect.objectContaining({
        transactionId,
        sourceWalletId,
        destinationWalletId,
      }),
      { timeout: 5000 }
    );

    // Should update to COMPLETED
    expect(mockTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'COMPLETED' })
    );

    // Should publish completion event
    expect(mockKafkaService.publishEvent).toHaveBeenCalledWith(
      'transaction-completed',
      expect.objectContaining({
        transactionId,
        status: 'COMPLETED',
      })
    );
  });

  it('should mark transaction as FAILED if ledger service fails', async () => {
    const transactionId = 'test-txn-id';
    const mockTransaction = {
      id: transactionId,
      sourceWalletId: 'wallet-1',
      destinationWalletId: 'wallet-2',
      amount: 1000,
      type: 'TRANSFER',
      update: jest.fn().mockResolvedValue({}),
    };

    Transaction.findByPk.mockResolvedValue(mockTransaction);
    axios.post.mockRejectedValue(new Error('Ledger service unavailable'));

    await startTransactionConsumer(mockKafkaService);
    await consumerCallback({
      transactionId,
      type: 'TRANSFER',
      amount: 1000,
    });

    // Should update to FAILED
    expect(mockTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'FAILED' })
    );

    // Should NOT publish completion event
    expect(mockKafkaService.publishEvent).not.toHaveBeenCalled();
  });

  it('should handle missing LEDGER_SERVICE_URL gracefully', async () => {
    delete process.env.LEDGER_SERVICE_URL;

    const transactionId = 'test-txn-id';
    const mockTransaction = {
      id: transactionId,
      sourceWalletId: 'wallet-1',
      destinationWalletId: 'wallet-2',
      amount: 1000,
      type: 'TRANSFER',
      update: jest.fn().mockResolvedValue({}),
    };

    Transaction.findByPk.mockResolvedValue(mockTransaction);

    await startTransactionConsumer(mockKafkaService);
    await consumerCallback({
      transactionId,
      type: 'TRANSFER',
      amount: 1000,
    });

    // Should still mark as COMPLETED (without ledger check)
    expect(mockTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'COMPLETED' })
    );

    // Should still publish completion event
    expect(mockKafkaService.publishEvent).toHaveBeenCalledWith(
      'transaction-completed',
      expect.any(Object)
    );

    // Should NOT call ledger service
    expect(axios.post).not.toHaveBeenCalled();
  });
});
