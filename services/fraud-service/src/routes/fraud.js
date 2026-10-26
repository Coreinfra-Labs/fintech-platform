const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { FraudAlert } = require('../models');
const { createLogger } = require('fintech-shared-libs');

const router = express.Router();
const logger = createLogger('Fraud-Routes');

const FRAUD_THRESHOLD = parseFloat(process.env.FRAUD_THRESHOLD || 500000);

// Check transaction for fraud
router.post('/check', async (req, res) => {
  try {
    const { userId, transactionId, amount, transactionType } = req.body;

    let riskScore = 0;
    const alerts = [];

    // Rule 1: High amount check
    if (amount > FRAUD_THRESHOLD) {
      riskScore += 40;
      alerts.push('HIGH_AMOUNT');
    }

    // Rule 2: Unusual time check (e.g., between 2-5 AM)
    const hour = new Date().getHours();
    if (hour >= 2 && hour <= 5) {
      riskScore += 20;
      alerts.push('UNUSUAL_TIME');
    }

    // Rule 3: Multiple transactions in short time
    const recentTransactions = await FraudAlert.count({
      where: {
        userId,
        createdAt: {
          [require('sequelize').Op.gte]: new Date(Date.now() - 30 * 60 * 1000), // Last 30 mins
        },
      },
    });

    if (recentTransactions > 5) {
      riskScore += 30;
      alerts.push('MULTIPLE_FAILURES');
    }

    const isRiskyTransaction = riskScore > 50;

    // Create alert if risky
    if (isRiskyTransaction) {
      const alert = await FraudAlert.create({
        userId,
        transactionId,
        riskScore,
        alertType: alerts[0],
        details: {
          alerts,
          threshold: FRAUD_THRESHOLD,
          amount,
        },
        status: 'PENDING',
      });

      logger.info(`Fraud alert created for user ${userId}: ${alert.id}`);
    }

    res.json({
      isRiskyTransaction,
      riskScore,
      alerts,
    });
  } catch (error) {
    logger.error('Fraud check error:', error);
    res.status(500).json({ error: 'Failed to perform fraud check' });
  }
});

// Get fraud alerts for user
router.get('/alerts/:userId', async (req, res) => {
  try {
    const alerts = await FraudAlert.findAll({
      where: { userId: req.params.userId },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    res.json({ alerts });
  } catch (error) {
    logger.error('Error fetching fraud alerts:', error);
    res.status(500).json({ error: 'Failed to fetch fraud alerts' });
  }
});

module.exports = router;
