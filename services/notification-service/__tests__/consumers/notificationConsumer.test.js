/**
 * Notification consumer tests.
 * Tests the Kafka consumer handler with email and SMS mocked.
 */

const { startNotificationConsumer } = require('../../src/consumers/notificationConsumer');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const { kafkaTopics } = require('fintech-shared-libs');
const { getUserContactFromWallet } = require('../../src/services/userWalletService');

jest.mock('nodemailer');
jest.mock('twilio');
jest.mock('../../src/services/userWalletService', () => ({
  getUserContactFromWallet: jest.fn(),
}));

describe('Notification Consumer', () => {
  let mockKafkaService;
  let topicHandlers;
  let mockEmailSend;
  let mockSmsSend;

  beforeEach(() => {
    process.env.EMAIL_USER = 'test@fintech.com';
    process.env.EMAIL_PASSWORD = 'password';
    process.env.TWILIO_ACCOUNT_SID = 'test-sid';
    process.env.TWILIO_AUTH_TOKEN = 'test-token';
    process.env.TWILIO_PHONE = '+1234567890';
    process.env.USER_SERVICE_URL = 'http://user-service:3001';

    mockEmailSend = jest.fn().mockResolvedValue({
      messageId: 'email-123',
    });

    mockSmsSend = jest.fn().mockResolvedValue({
      sid: 'sms-123',
    });

    nodemailer.createTransport = jest.fn().mockReturnValue({
      sendMail: mockEmailSend,
    });

    twilio.mockReturnValue({
      messages: {
        create: mockSmsSend,
      },
    });

    mockKafkaService = {
      subscribeToTopics: jest.fn(async (subscriptions) => {
        topicHandlers = new Map(subscriptions.map(({ topic, callback }) => [topic, callback]));
      }),
      publishEvent: jest.fn().mockResolvedValue(undefined),
    };

    getUserContactFromWallet.mockResolvedValue({
      email: 'user@example.com',
      phone: '+1987654321',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should send email and SMS for completed transaction', async () => {
    await startNotificationConsumer(mockKafkaService);
    expect(mockKafkaService.subscribeToTopics).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ topic: kafkaTopics.TOPICS.TRANSACTION_COMPLETED }),
        expect.objectContaining({ topic: kafkaTopics.TOPICS.PAYMENT_COMPLETED }),
        expect.objectContaining({ topic: kafkaTopics.TOPICS.PAYMENT_INITIATED }),
        expect.objectContaining({ topic: kafkaTopics.TOPICS.FRAUD_ALERT }),
      ])
    );
    await topicHandlers.get(kafkaTopics.TOPICS.TRANSACTION_COMPLETED)({
      transactionId: 'txn-123',
      status: 'COMPLETED',
      amount: 1000,
      type: 'TRANSFER',
      sourceWalletId: 'wallet-1',
    });

    // Should fetch user contact
    expect(getUserContactFromWallet).toHaveBeenCalledWith('wallet-1');

    // Should send email
    expect(mockEmailSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: expect.stringContaining('txn-123'),
      })
    );

    // Should send SMS
    expect(mockSmsSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '+1987654321',
        body: expect.stringContaining('TRANSFER'),
      })
    );
  });

  it('should skip notification for non-completed transaction', async () => {
    await startNotificationConsumer(mockKafkaService);
    await topicHandlers.get(kafkaTopics.TOPICS.TRANSACTION_COMPLETED)({
      transactionId: 'txn-456',
      status: 'PENDING',
      amount: 1000,
      type: 'TRANSFER',
    });

    // Should not fetch user contact
    expect(getUserContactFromWallet).not.toHaveBeenCalled();

    // Should not send notifications
    expect(mockEmailSend).not.toHaveBeenCalled();
    expect(mockSmsSend).not.toHaveBeenCalled();
  });

  it('should notify the user when payment is initiated', async () => {
    await startNotificationConsumer(mockKafkaService);
    await topicHandlers.get(kafkaTopics.TOPICS.PAYMENT_INITIATED)({
      transactionId: 'payment-123',
      status: 'PENDING',
      amount: 1000,
      type: 'PAYMENT',
      sourceWalletId: 'wallet-1',
    });

    expect(mockEmailSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Payment Initiated - payment-123',
      })
    );
    expect(mockSmsSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '+1987654321',
        body: expect.stringContaining('has been initiated'),
      })
    );
  });

  it('should handle missing user contact gracefully', async () => {
    getUserContactFromWallet.mockResolvedValue({ email: null, phone: null });

    await startNotificationConsumer(mockKafkaService);
    const data = {
      transactionId: 'txn-789',
      status: 'COMPLETED',
      amount: 1000,
      type: 'TRANSFER',
      sourceWalletId: 'wallet-unknown',
    };
    await topicHandlers.get(kafkaTopics.TOPICS.TRANSACTION_COMPLETED)(data);

    expect(mockKafkaService.publishEvent).toHaveBeenCalledWith(
      kafkaTopics.TOPICS.NOTIFICATION_DLQ,
      expect.objectContaining({ originalMessage: data })
    );

    // Should not send notifications if no contact
    expect(mockEmailSend).not.toHaveBeenCalled();
    expect(mockSmsSend).not.toHaveBeenCalled();
  });

  it('should send email only if phone not available', async () => {
    getUserContactFromWallet.mockResolvedValue({ email: 'user@example.com', phone: null });

    await startNotificationConsumer(mockKafkaService);
    await topicHandlers.get(kafkaTopics.TOPICS.TRANSACTION_COMPLETED)({
      transactionId: 'txn-email-only',
      status: 'COMPLETED',
      amount: 1000,
      type: 'TRANSFER',
      sourceWalletId: 'wallet-1',
    });

    // Should send email
    expect(mockEmailSend).toHaveBeenCalled();

    // Should not send SMS
    expect(mockSmsSend).not.toHaveBeenCalled();
  });
});
