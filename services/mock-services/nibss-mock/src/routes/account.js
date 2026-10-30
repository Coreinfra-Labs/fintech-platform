const express = require('express');
const { createLogger } = require('../utils/logger');

const router = express.Router();
const logger = createLogger('Account-Routes');

// Mock account database
const accounts = {
  '0001234567': { name: 'John Doe', bank: '001' },
  '0009876543': { name: 'Jane Smith', bank: '009' },
  '0050123456': { name: 'ABC Company', bank: '005' },
};

// Validate account
router.post('/', (req, res) => {
  try {
    const { accountNumber, bankCode } = req.body;

    if (!accountNumber || !bankCode) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const account = accounts[accountNumber];

    if (account && account.bank === bankCode) {
      logger.info('Account validated');
      res.json({
        valid: true,
        accountNumber,
        accountName: account.name,
        bankCode,
      });
    } else {
      logger.warn('Invalid account');
      res.status(400).json({
        valid: false,
        error: 'Account not found',
      });
    }
  } catch (error) {
    logger.error('Account validation error:', error);
    res.status(500).json({ error: 'Account validation failed' });
  }
});

module.exports = router;
