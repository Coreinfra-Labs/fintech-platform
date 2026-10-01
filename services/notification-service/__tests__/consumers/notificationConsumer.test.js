/**
 * Notification consumer tests.
 * Tests the Kafka consumer handler with email and SMS mocked.
 */

const { startNotificationConsumer } = require('../../src/consumers/notificationConsumer');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const axios = require('axios');

jest.mock('nodemailer');
jest.mock('twilio');
jest.mock('axios');

describe('Notification Consumer', () => {
  let mockKafkaService;
  let consumerCallback;
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
      subscribeToTopic: jest.fn((topic, callback) => {
        consumerCallback = callback;
        return Promise.resolve();
      }),
    };

    axios.get = jest.fn().mockResolvedValue({
      data: {
        id: 'user-123',
        email: 'user@example.com',
        phone: '+1987654321',
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should send email and SMS for completed transaction', async () => {
    await startNotificationConsumer(mockKafkaService);
    await consumerCallback({
      transactionId: 'txn-123',
      status: 'COMPLETED',
      amount: 1000,
      type: 'TRANSFER',
      sourceWalletId: 'wallet-1',
    });

    // Should fetch user contact
    expect(axios.get).toHaveBeenCalledWith(
      'http://user-service:3001/api/user/wallet-1',
      expect.any(Object)
    );

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
    await consumerCallback({
      transactionId: 'txn-456',
      status: 'PENDING',
      amount: 1000,
      type: 'TRANSFER',
    });

    // Should not fetch user contact
    expect(axios.get).not.toHaveBeenCalled();

    // Should not send notifications
    expect(mockEmailSend).not.toHaveBeenCalled();
    expect(mockSmsSend).not.toHaveBeenCalled();
  });

  it('should handle missing user contact gracefully', async () => {
    axios.get.mockRejectedValue(new Error('User not found'));

    await startNotificationConsumer(mockKafkaService);
    await consumerCallback({
      transactionId: 'txn-789',
      status: 'COMPLETED',
      amount: 1000,
      type: 'TRANSFER',
      sourceWalletId: 'wallet-unknown',
    });

    // Should attempt to fetch user
    expect(axios.get).toHaveBeenCalled();

    // Should not send notifications if no contact
    expect(mockEmailSend).not.toHaveBeenCalled();
    expect(mockSmsSend).not.toHaveBeenCalled();
  });

  it('should send email only if phone not available', async () => {
    axios.get.mockResolvedValue({
      data: {
        id: 'user-123',
        email: 'user@example.com',
        phone: null,
      },
    });

    await startNotificationConsumer(mockKafkaService);
    await consumerCallback({
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
