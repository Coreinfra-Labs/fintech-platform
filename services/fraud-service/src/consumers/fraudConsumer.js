const { createLogger, kafkaTopics } = require('fintech-shared-libs');
const { FraudAlert } = require('../models');
const { DLQService } = require('../services/dlqService');

const logger = createLogger('Fraud-Consumer');

const FRAUD_THRESHOLD = parseFloat(process.env.FRAUD_THRESHOLD || 500000);
const HIGH_RISK_THRESHOLD = parseFloat(process.env.HIGH_RISK_THRESHOLD || 50);
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '3', 10);

let dlqService = null;

const startFraudConsumer = async (kafkaService) => {
  dlqService = new DLQService(kafkaService);

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
      const recentFailures = await FraudAlert.count({
        where: {
          sourceWalletId,
          status: 'PENDING',
          createdAt: {
            [require('sequelize').Op.gte]: new Date(Date.now() - 30 * 60 * 1000),
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
            alertType: triggeredRules[0],
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
          
          // Send to DLQ for retry
          await dlqService.sendToDLQ(
            kafkaTopics.TOPICS.FRAUD_CHECK_DLQ,
            data,
            dbError,
            {
              originalTopic: kafkaTopics.TOPICS.TRANSACTIONS,
              reason: 'Failed to create fraud alert',
              retryCount: 0,
              maxRetries: MAX_RETRIES,
            }
          );
        }
      } else {
        logger.debug(
          `Transaction ${transactionId} passed fraud check (risk: ${riskScore}%)`
        );
      }
    } catch (error) {
      logger.error(`Fraud consumer error: ${error.message}`, error);
      
      // Send to DLQ for retry
      if (data && data.transactionId) {
        await dlqService.sendToDLQ(
          kafkaTopics.TOPICS.FRAUD_CHECK_DLQ,
          data,
          error,
          {
            originalTopic: kafkaTopics.TOPICS.TRANSACTIONS,
            reason: 'Unhandled error in fraud consumer',
            retryCount: 0,
            maxRetries: MAX_RETRIES,
          }
        );
      }
    }
  });
};

module.exports = { startFraudConsumer };
