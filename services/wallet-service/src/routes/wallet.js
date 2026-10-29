const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { Wallet } = require('../models');
const { createLogger } = require('fintech-shared-libs');

const router = express.Router();
const logger = createLogger('Wallet-Routes');

// Generate unique account number
const generateAccountNumber = () => {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
};

// Create wallet
router.post('/create', async (req, res) => {
  try {
    const { userId, accountType = 'SAVINGS' } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const existingWallet = await Wallet.findOne({
      where: { userId, isPrimary: true },
    });

    const wallet = await Wallet.create({
      userId,
      accountNumber: generateAccountNumber(),
      accountType,
      isPrimary: !existingWallet,
      balance: 0.0,
      availableBalance: 0.0,
    });

    logger.info(`Wallet created: ${wallet.id}`);

    res.status(201).json({
      message: 'Wallet created successfully',
      wallet: {
        id: wallet.id,
        accountNumber: wallet.accountNumber,
        accountType: wallet.accountType,
        balance: wallet.balance,
        currency: wallet.currency,
      },
    });
  } catch (error) {
    logger.error('Wallet creation error:', error);
    res.status(500).json({ error: 'Failed to create wallet' });
  }
});

// Get wallet
router.get('/:walletId', async (req, res) => {
  try {
    const wallet = await Wallet.findByPk(req.params.walletId);

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    res.json({
      id: wallet.id,
      userId: wallet.userId,
      accountNumber: wallet.accountNumber,
      accountType: wallet.accountType,
      currency: wallet.currency,
      balance: wallet.balance,
      availableBalance: wallet.availableBalance,
      isPrimary: wallet.isPrimary,
      isFrozen: wallet.isFrozen,
    });
  } catch (error) {
    logger.error('Wallet retrieval error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

// Get user wallets
router.get('/user/:userId', async (req, res) => {
  try {
    const wallets = await Wallet.findAll({
      where: { userId: req.params.userId },
    });

    res.json({
      wallets: wallets.map((w) => ({
        id: w.id,
        accountNumber: w.accountNumber,
        accountType: w.accountType,
        currency: w.currency,
        balance: w.balance,
        availableBalance: w.availableBalance,
        isPrimary: w.isPrimary,
      })),
    });
  } catch (error) {
    logger.error('Error fetching user wallets:', error);
    res.status(500).json({ error: 'Failed to fetch wallets' });
  }
});

// Update balance (for ledger service)
router.post('/:walletId/update-balance', async (req, res) => {
  try {
    const { amount, type } = req.body; // type: 'DEBIT' or 'CREDIT'

    const wallet = await Wallet.findByPk(req.params.walletId);
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    let newBalance = parseFloat(wallet.balance);
    if (type === 'CREDIT') {
      newBalance += parseFloat(amount);
    } else if (type === 'DEBIT') {
      newBalance -= parseFloat(amount);
    }

    if (newBalance < 0) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    await wallet.update({
      balance: newBalance,
      availableBalance: newBalance,
    });

    logger.info(`Wallet ${wallet.id} balance updated: ${newBalance}`);

    res.json({
      message: 'Balance updated',
      wallet: {
        id: wallet.id,
        balance: wallet.balance,
        availableBalance: wallet.availableBalance,
      },
    });
  } catch (error) {
    logger.error('Balance update error:', error);
    res.status(500).json({ error: 'Failed to update balance' });
  }
});

module.exports = router;
