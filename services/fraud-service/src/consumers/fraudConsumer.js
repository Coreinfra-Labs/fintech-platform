const { createLogger, kafkaTopics } = require('fintech-shared-libs');
const { Fraud } = require('../models');

const logger = createLogger('Fraud-Consumer');

const FRAUD_THRESHOLD = parseInt(process.env.FRAUD_THRESHOLD || '500000', 10);
const HIGH_RISK_THRESHOLD = parseInt(process.env.HIGH_RISK_THRESHOLD || '50', 10);

const startFraudConsumer = async (kafkaService) => {
  await kafkaService.subscribeToTopic(kafkaTopics.TOPICS.TRANSACTIONS, async (data) => {
    try {
      logger.info(`Checking transaction for fraud: ${data.transactionId}`);

      // Calculate fraud score based on transaction data
      const fraudScore = calculateFraudScore(data);
      const isFraudulent = fraudScore > HIGH_RISK_THRESHOLD;
      const isLargeTransaction = data.amount > FRAUD_THRESHOLD;

      // Log the fraud check result
      logger.info(`Fraud check completed for transaction ${data.transactionId}: score=${fraudScore}, isFraudulent=${isFraudulent}`);

      // Store fraud check result
      await Fraud.create({
        transactionId: data.transactionId,
        fraudScore,
        isFraudulent,
        isLargeTransaction,
        riskLevel: isFraudulent ? 'HIGH' : isLargeTransaction ? 'MEDIUM' : 'LOW',
        checkDetails: {
          amount: data.amount,
          type: data.type,
          sourceWalletId: data.sourceWalletId,
          timestamp: new Date(),
        },
      });

      // If high risk, publish fraud alert
      if (isFraudulent) {
        logger.error(`HIGH RISK transaction detected: ${data.transactionId}, fraud score: ${fraudScore}`);

        await kafkaService.publishEvent(kafkaTopics.TOPICS.FRAUD_ALERT, {
          transactionId: data.transactionId,
          fraudScore,
          riskLevel: 'HIGH',
          amount: data.amount,
          type: data.type,
          timestamp: new Date(),
        });
      } else if (isLargeTransaction) {
        logger.warn(`Large transaction flagged for review: ${data.transactionId}, amount: ${data.amount}`);
      }
    } catch (error) {
      logger.error(`Fraud consumer error: ${error.message}`, error);
    }
  });
};

/**
 * Calculate fraud score based on transaction characteristics
 * Score > 50 is considered HIGH RISK
 * Score > 20 is considered MEDIUM RISK
 */
function calculateFraudScore(transaction) {
  let score = 0;

  // Amount-based scoring
  if (transaction.amount > 1000000) {
    score += 30;
  } else if (transaction.amount > 500000) {
    score += 20;
  } else if (transaction.amount > 100000) {
    score += 10;
  }

  // Transaction type scoring (PAYMENT typically higher risk)
  if (transaction.type === 'PAYMENT') {
    score += 15;
  } else if (transaction.type === 'TRANSFER') {
    score += 5;
  }

  // Destination scoring (cross-border would add more, but simplified here)
  if (transaction.destinationBankCode) {
    score += 5; // External bank transfer
  }

  return Math.min(score, 100); // Cap at 100
}

module.exports = { startFraudConsumer };
