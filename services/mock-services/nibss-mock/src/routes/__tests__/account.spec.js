const express = require('express');
const request = require('supertest');
const accountRoutes = require('../account');

describe('NIBSS account validation API', () => {
  const app = express();

  app.use(express.json());
  app.use('/api/validate-account', accountRoutes);

  it('validates an existing account', async () => {
    const response = await request(app)
      .post('/api/validate-account')
      .send({
        accountNumber: '0001234567',
        bankCode: '001',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      valid: true,
      accountNumber: '0001234567',
      accountName: 'John Doe',
      bankCode: '001',
    });
  });

  it('rejects a request with missing required fields', async () => {
    const response = await request(app)
      .post('/api/validate-account')
      .send({ accountNumber: '0001234567' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Missing required fields',
    });
  });

  it('rejects an account with an incorrect bank code', async () => {
    const response = await request(app)
      .post('/api/validate-account')
      .send({
        accountNumber: '0001234567',
        bankCode: '009',
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      valid: false,
      error: 'Account not found',
    });
  });
});
