const jwt = require('jsonwebtoken');
const { authMiddleware } = require('../src/middleware/auth');

describe('API gateway auth middleware', () => {
  let request;
  let response;
  let next;

  beforeEach(() => {
    process.env.JWT_SECRET = 'gateway-test-secret';
    request = { headers: {} };
    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('rejects requests without a bearer token', () => {
    authMiddleware(request, response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({
      error: 'Missing or invalid authorization header',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects invalid bearer tokens', () => {
    request.headers.authorization = 'Bearer invalid-token';

    authMiddleware(request, response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({
      error: 'Invalid or expired token',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches verified claims and continues', () => {
    const claims = { sub: 'user-123', role: 'customer' };
    request.headers.authorization = `Bearer ${jwt.sign(claims, process.env.JWT_SECRET)}`;

    authMiddleware(request, response, next);

    expect(request.user).toMatchObject(claims);
    expect(next).toHaveBeenCalledTimes(1);
    expect(response.status).not.toHaveBeenCalled();
  });
});