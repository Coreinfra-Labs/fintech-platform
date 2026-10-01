const express = require('express');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { LedgerEntry } = require('../models');
const { createLogger } = require('fintech-shared-libs');

const router = express.Router();
const logger = createLogger('Ledger-Routes');

const WALLET_SERVICE_URL = process.env.WALLET_SERVICE_URL || 'http://localhost:3002';

/**
 * Validates ledger entry request.
 * Ensures required fields and amounts are positive.
 */
const ledgerSchema = Joi.object({
  transactionId: Joi.string().uuid().required(),
  sourceWalletId: Joi.string().uuid().required(),
  destinationWalletId: Joi.string().uuid().allow(null),
  amount: Joi.number().positive().required(),
  type: Joi.string()
    .valid('TRANSFER', 'DEPOSIT', 'WITHDRAWAL', 'PAYMENT')
    .required(),
});

/**
 * POST /api/ledger/record
 * 
 * Records a transaction using double-entry bookkeeping.
 * 
 * For a TRANSFER from wallet A to wallet B:
 * 1. Debit wallet A (money goes out)
 * 2. Credit wallet B (money comes in)
 * 
 * For a DEPOSIT:
 * 1. Debit internal account (bank records incoming)
 * 2. Credit wallet (user sees balance increase)
 * 
 * For a WITHDRAWAL:
 * 1. Debit wallet (user sees balance decrease)
 * 2. Credit internal account (bank records outgoing)
 */
router.post('/record', async (req, res) => {
  try {
    const { error, value } = ledgerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const {
      transactionId,
      sourceWalletId,
      destinationWalletId,
      amount,
      type,
    } = value;

    logger.info(`Recording ledger entries for transaction ${transactionId}`);

    const entries = [];

    // Determine entry type based on transaction type
    if (type === 'TRANSFER' && destinationWalletId) {
      // TRANSFER: Debit source, credit destination
      entries.push({
        transactionId,
        accountId: sourceWalletId,
        accountType: 'WALLET',
        debit: amount,
        credit: 0,
        description: `Transfer out to ${destinationWalletId.substring(0, 8)}...`,
      });

      entries.push({
        transactionId,
        accountId: destinationWalletId,
        accountType: 'WALLET',
        debit: 0,
        credit: amount,
        description: `Transfer in from ${sourceWalletId.substring(0, 8)}...`,
      });
    } else if (type === 'DEPOSIT') {
      // DEPOSIT: Debit internal revenue account, credit wallet
      entries.push({
        transactionId,
        accountId: 'INTERNAL_DEPOSITS',
        accountType: 'REVENUE',
        debit: amount,
        credit: 0,
        description: `Deposit received for wallet ${sourceWalletId.substring(0, 8)}...`,
      });

      entries.push({
        transactionId,
        accountId: sourceWalletId,
        accountType: 'WALLET',
        debit: 0,
        credit: amount,
        description: 'Deposit credit',
      });
    } else if (type === 'WITHDRAWAL') {
      // WITHDRAWAL: Debit wallet, credit internal expense account
      entries.push({
        transactionId,
        accountId: sourceWalletId,
        accountType: 'WALLET',
        debit: amount,
        credit: 0,
        description: 'Withdrawal debit',
      });

      entries.push({
        transactionId,
        accountId: 'INTERNAL_WITHDRAWALS',
        accountType: 'EXPENSE',
        debit: 0,
        credit: amount,
        description: `Withdrawal from wallet ${sourceWalletId.substring(0, 8)}...`,
      });
    } else if (type === 'PAYMENT') {
      // PAYMENT: Debit source wallet, credit internal payment account
      entries.push({
        transactionId,
        accountId: sourceWalletId,
        accountType: 'WALLET',
        debit: amount,
        credit: 0,
        description: 'Payment debit',
      });

      entries.push({
        transactionId,
        accountId: 'INTERNAL_PAYMENTS',
        accountType: 'EXPENSE',
        debit: 0,
        credit: amount,
        description: `Payment from wallet ${sourceWalletId.substring(0, 8)}...`,
      });
    }

    // Create ledger entries in database
    const createdEntries = [];
    for (const entry of entries) {
      const ledgerEntry = await LedgerEntry.create({
        ...entry,
        balance: entry.credit - entry.debit, // Balance from ledger perspective
      });
      createdEntries.push(ledgerEntry);
    }

    // Update wallet balances via wallet service
    if (type === 'TRANSFER' && destinationWalletId) {
      // Debit source wallet
      await updateWalletBalance(sourceWalletId, -amount);
      // Credit destination wallet
      await updateWalletBalance(destinationWalletId, amount);
    } else if (type === 'DEPOSIT') {
      // Credit wallet
      await updateWalletBalance(sourceWalletId, amount);
    } else if (type === 'WITHDRAWAL') {
      // Debit wallet
      await updateWalletBalance(sourceWalletId, -amount);
    } else if (type === 'PAYMENT') {
      // Debit wallet
      await updateWalletBalance(sourceWalletId, -amount);
    }

    logger.info(
      `Ledger entries recorded for transaction ${transactionId}: ` +
      `${createdEntries.length} entries, balances updated`
    );

    res.json({
      message: 'Ledger entries recorded successfully',
      transactionId,
      entriesCount: createdEntries.length,
      entries: createdEntries.map((e) => ({
        id: e.id,
        accountId: e.accountId,
        debit: e.debit,
        credit: e.credit,
      })),
    });
  } catch (error) {
    logger.error(`Ledger recording error: ${error.message}`, error);
    res.status(500).json({ error: 'Failed to record ledger entries' });
  }
});

/**
 * POST /api/ledger/validate
 * 
 * Validates ledger consistency.
 * Returns the sum of debits and credits to verify balance.
 */
router.post('/validate', async (req, res) => {
  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({ error: 'transactionId is required' });
    }

    const entries = await LedgerEntry.findAll({
      where: { transactionId },
    });

    const totalDebits = entries.reduce((sum, e) => sum + parseFloat(e.debit || 0), 0);
    const totalCredits = entries.reduce((sum, e) => sum + parseFloat(e.credit || 0), 0);

    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01; // Allow for floating point precision

    logger.info(
      `Ledger validation for ${transactionId}: ` +
      `debits=${totalDebits}, credits=${totalCredits}, balanced=${isBalanced}`
    );

    res.json({
      transactionId,
      totalDebits,
      totalCredits,
      isBalanced,
      entriesCount: entries.length,
    });
  } catch (error) {
    logger.error(`Ledger validation error: ${error.message}`);
    res.status(500).json({ error: 'Failed to validate ledger' });
  }
});

/**
 * GET /api/ledger/entries/:transactionId
 * 
 * Retrieves all ledger entries for a transaction.
 */
router.get('/entries/:transactionId', async (req, res) => {
  try {
    const entries = await LedgerEntry.findAll({
      where: { transactionId: req.params.transactionId },
      order: [['createdAt', 'ASC']],
    });

    res.json({
      transactionId: req.params.transactionId,
      entries: entries.map((e) => ({
        id: e.id,
        accountId: e.accountId,
        accountType: e.accountType,
        debit: e.debit,
        credit: e.credit,
        description: e.description,
        createdAt: e.createdAt,
      })),
    });
  } catch (error) {
    logger.error(`Error fetching ledger entries: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch ledger entries' });
  }
});

/**
 * Helper function to update wallet balance via wallet service.
 * Sends a request to wallet-service to adjust balance.
 */
const updateWalletBalance = async (walletId, amount) => {
  try {
    await axios.post(
      `${WALLET_SERVICE_URL}/api/wallet/${walletId}/update-balance`,
      {
        amount: Math.abs(amount),
        type: amount >= 0 ? 'CREDIT' : 'DEBIT',
      },
      { timeout: 5000 }
    );
    logger.debug(`Wallet ${walletId} balance updated by ${amount}`);
  } catch (error) {
    logger.error(
      `Failed to update wallet ${walletId} balance: ${error.message}`
    );
    throw error;
  }
};

module.exports = router;
