const { createLogger, kafkaTopics } = require('fintech-shared-libs');
const { FraudAlert } = require('../models');

const logger = createLogger('Fraud-Consumer');

/**
 * Fraud threshold from environment (amount in currency units).
 * Transactions above this amount trigger a risk score increase.
 */
const FRAUD_THRESHOLD = parseFloat(process.env.FRAUD_THRESHOLD || 500000);

/**
 * High-risk transaction threshold (risk score percentage).
 * Transactions with risk score >= this value are flagged.
 */
const HIGH_RISK_THRESHOLD = parseFloat(process.env.HIGH_RISK_THRESHOLD || 50);

const startFraudConsumer = async (kafkaService) => {
  await kafkaService.subscribeToTopic(kafkaTopics.TOPICS.TRANSACTIONS, async (data) => {
    try {
      logger.info(`Checking transaction ${data.transactionId} for fraud`);

      const {
        transactionId,
        sourceWalletId,
        destinationWalletId,
        amount,
        type,
      } = data;

      // Collect fraud rules and scoring
      let riskScore = 0;
      const triggeredRules = [];

      // Rule 1: High amount transaction
      if (amount > FRAUD_THRESHOLD) {
        riskScore += 40;
        triggeredRules.push('HIGH_AMOUNT');
        logger.debug(`High amount detected: ${amount} > ${FRAUD_THRESHOLD}`);
      }

      // Rule 2: Unusual time (2-5 AM)
      const hour = new Date().getHours();
      if (hour >= 2 && hour <= 5) {
        riskScore += 20;
        triggeredRules.push('UNUSUAL_TIME');
        logger.debug(`Unusual transaction time: ${hour}:00`);
      }

      // Rule 3: Multiple recent failures for this wallet
      // (failures indicate possible brute-force attempts)
      const recentFailures = await FraudAlert.count({
        where: {
          sourceWalletId,
          status: 'PENDING',
          createdAt: {
            [require('sequelize').Op.gte]: new Date(Date.now() - 30 * 60 * 1000), // Last 30 mins
          },
        },
      });

      if (recentFailures > 5) {
        riskScore += 30;
        triggeredRules.push('MULTIPLE_FAILURES');
        logger.debug(`Multiple recent alerts for wallet ${sourceWalletId}: ${recentFailures}`);
      }

      const isHighRisk = riskScore >= HIGH_RISK_THRESHOLD;

      // Create fraud alert only if high-risk
      if (isHighRisk) {
        try {
          const alert = await FraudAlert.create({
            transactionId,
            sourceWalletId,
            destinationWalletId,
            riskScore,
            alertType: triggeredRules[0], // Primary rule
            details: {
              triggeredRules,
              threshold: FRAUD_THRESHOLD,
              amount,
              type,
            },
            status: 'PENDING',
          });

          logger.warn(
            `High-risk transaction alert created: ${alert.id} ` +
            `(transaction: ${transactionId}, risk: ${riskScore}%, rules: ${triggeredRules.join(',')})`
          );
        } catch (dbError) {
          logger.error(
            `Failed to create fraud alert for transaction ${transactionId}: ${dbError.message}`
          );
        }
      } else {
        logger.debug(
          `Transaction ${transactionId} passed fraud check (risk: ${riskScore}%)`
        );
      }
    } catch (error) {
      logger.error(`Fraud consumer error: ${error.message}`, error);
    }
  });
};

module.exports = { startFraudConsumer };
