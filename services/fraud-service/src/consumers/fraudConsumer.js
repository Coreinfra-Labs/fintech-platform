
const { createLogger, kafkaTopics } = require('fintech-shared-libs');
const { FraudAlert } = require('../models');
const { DLQService } = require('../services/dlqService');

const logger = createLogger('Fraud-Consumer');

const HIGH_AMOUNT_THRESHOLD = Number(
  process.env.FRAUD_THRESHOLD || 500000
);
const HIGH_RISK_THRESHOLD = Number(
  process.env.HIGH_RISK_THRESHOLD || 50
);

const startFraudConsumer = async (kafkaService) => {
  const dlqService = new DLQService(kafkaService);

  await kafkaService.subscribeToTopic(
    kafkaTopics.TOPICS.TRANSACTIONS,
    async (data) => {
      try {
        logger.info(`Checking transaction for fraud: ${data.transactionId}`);

        const { riskScore, triggeredRules } = await calculateFraudScore(data);
        const isFraudulent = riskScore > HIGH_RISK_THRESHOLD;

        logger.info(
          `Fraud check completed for transaction ${data.transactionId}: score=${riskScore}, isFraudulent=${isFraudulent}`
        );

        if (triggeredRules.length === 0) {
          return;
        }

        await FraudAlert.create({
          transactionId: data.transactionId,
          alertType: triggeredRules[0],
          riskScore,
          details: {
            triggeredRules,
            amount: data.amount,
            transactionType: data.transactionType || data.type,
            timestamp: new Date(),
          },
        });
     
            
if (
  isFraudulent &&
  typeof kafkaService.publishEvent === 'function'
) {   
          await kafkaService.publishEvent(
            kafkaTopics.TOPICS.FRAUD_ALERT,
            {
              transactionId: data.transactionId,
              sourceWalletId: data.sourceWalletId,
              riskScore,
              alertType: triggeredRules[0],
              triggeredRules,
              amount: data.amount,
              timestamp: new Date(),
            }
          );
        }
      } catch (error) {
        logger.error(`Fraud consumer error: ${error.message}`, error);
        await dlqService.sendToDLQ(
          kafkaTopics.TOPICS.FRAUD_CHECK_DLQ,
          data,
          error,
          { originalTopic: kafkaTopics.TOPICS.TRANSACTIONS }
        );
      }
    }
  );
};

async function calculateFraudScore(transaction)  {
  let riskScore = 0;
  const triggeredRules = [];

  // High transaction amount: 40 points
  if (Number(transaction.amount) > HIGH_AMOUNT_THRESHOLD) {
    riskScore += 40;
    triggeredRules.push('HIGH_AMOUNT');
  }

  // Unusual transaction time: 20 points
  const timestamp = transaction.timestamp
    ? new Date(transaction.timestamp)
    : new Date();

  const hour = timestamp.getHours();

  if (hour < 6 || hour >= 22) {
    riskScore += 20;
    triggeredRules.push('UNUSUAL_TIME');
  }

  // Multiple recent failures: 30 points
const recentFailures = await FraudAlert.count();

if (recentFailures > 5) {
  riskScore += 30;
  triggeredRules.push('MULTIPLE_FAILURES');
}

  return {
    riskScore: Math.min(riskScore, 100),
    triggeredRules,
  };
}

module.exports = { startFraudConsumer };
