/**
 * Fraud consumer tests.
 * Tests the Kafka consumer handler with database mocked.
 */

const { startFraudConsumer } = require('../../src/consumers/fraudConsumer');
const { FraudAlert } = require('../../src/models');

jest.mock('../../src/models');

describe('Fraud Consumer', () => {
  let mockKafkaService;
  let consumerCallback;

  beforeEach(() => {
    process.env.FRAUD_THRESHOLD = '500000';
    process.env.HIGH_RISK_THRESHOLD = '50';

    mockKafkaService = {
      subscribeToTopic: jest.fn((topic, callback) => {
        consumerCallback = callback;
        return Promise.resolve();
      }),
    };

    FraudAlert.count = jest.fn().mockResolvedValue(0);
    FraudAlert.create = jest.fn().mockResolvedValue({
      id: 'alert-123',
      status: 'PENDING',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not create alert for low-risk transaction', async () => {
    await startFraudConsumer(mockKafkaService);
    await consumerCallback({
      transactionId: 'txn-123',
      sourceWalletId: 'wallet-1',
      destinationWalletId: 'wallet-2',
      amount: 100,
      type: 'TRANSFER',
      timestamp: new Date('2024-01-01T12:00:00Z'), // Noon, not unusual
    });

    expect(FraudAlert.create).not.toHaveBeenCalled();
  });

  it('should create alert for high-amount transaction', async () => {
    await startFraudConsumer(mockKafkaService);
    await consumerCallback({
      transactionId: 'txn-123',
      sourceWalletId: 'wallet-1',
      destinationWalletId: 'wallet-2',
      amount: 600000, // > FRAUD_THRESHOLD (500000)
      type: 'TRANSFER',
      timestamp: new Date('2024-01-01T12:00:00Z'),
    });

    expect(FraudAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: 'txn-123',
        riskScore: 40, // HIGH_AMOUNT rule
        alertType: 'HIGH_AMOUNT',
      })
    );
  });

  it('should create alert for unusual time transaction', async () => {
    // Mock current time to 3 AM
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T03:00:00Z'));

    await startFraudConsumer(mockKafkaService);
    await consumerCallback({
      transactionId: 'txn-456',
      sourceWalletId: 'wallet-1',
      destinationWalletId: 'wallet-2',
      amount: 100,
      type: 'TRANSFER',
    });

    expect(FraudAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: 'txn-456',
        riskScore: 20, // UNUSUAL_TIME rule
        alertType: 'UNUSUAL_TIME',
      })
    );

    jest.useRealTimers();
  });

  it('should create alert for multiple recent failures', async () => {
    FraudAlert.count.mockResolvedValue(10); // 10 recent alerts

    await startFraudConsumer(mockKafkaService);
    await consumerCallback({
      transactionId: 'txn-789',
      sourceWalletId: 'wallet-1',
      destinationWalletId: 'wallet-2',
      amount: 100,
      type: 'TRANSFER',
    });

    expect(FraudAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: 'txn-789',
        riskScore: 30, // MULTIPLE_FAILURES rule
        alertType: 'MULTIPLE_FAILURES',
      })
    );
  });

  it('should combine multiple fraud rules and calculate total risk', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T03:30:00Z')); // 3:30 AM (unusual)
    FraudAlert.count.mockResolvedValue(6); // Multiple failures

    await startFraudConsumer(mockKafkaService);
    await consumerCallback({
      transactionId: 'txn-multi',
      sourceWalletId: 'wallet-1',
      destinationWalletId: 'wallet-2',
      amount: 600000, // HIGH_AMOUNT
      type: 'TRANSFER',
    });

    // Total risk: 40 (HIGH_AMOUNT) + 20 (UNUSUAL_TIME) + 30 (MULTIPLE_FAILURES) = 90
    expect(FraudAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: 'txn-multi',
        riskScore: 90,
        details: expect.objectContaining({
          triggeredRules: ['HIGH_AMOUNT', 'UNUSUAL_TIME', 'MULTIPLE_FAILURES'],
        }),
      })
    );

    jest.useRealTimers();
  });
});
