process.env.USER_SERVICE_URL = 'http://user-service:3001';
process.env.WALLET_SERVICE_URL = 'http://wallet-service:3002';
process.env.JWT_SECRET = 'notification-test-secret';

const axios = require('axios');
const jwt = require('jsonwebtoken');
const { getUserContactFromWallet } = require('../services/userWalletService');

jest.mock('axios');

describe('userWalletService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves wallet ownership and fetches authenticated profile contact fields', async () => {
    axios.get
      .mockResolvedValueOnce({ data: { userId: 'user-123' } })
      .mockResolvedValueOnce({
        data: {
          id: 'user-123',
          email: 'user@example.com',
          phoneNumber: '+1234567890',
          firstName: 'Ada',
        },
      });

    const contact = await getUserContactFromWallet('wallet-123');

    expect(axios.get).toHaveBeenNthCalledWith(
      1,
      'http://wallet-service:3002/api/wallet/wallet-123',
      expect.any(Object)
    );

    const [, profileRequest] = axios.get.mock.calls[1];
    const token = profileRequest.headers.Authorization.slice('Bearer '.length);
    expect(jwt.verify(token, 'notification-test-secret')).toMatchObject({ userId: 'user-123' });
    expect(axios.get.mock.calls[1][0]).toBe('http://user-service:3001/api/profile/user-123');
    expect(contact).toEqual({ email: 'user@example.com', phone: '+1234567890', name: 'Ada' });
  });
});