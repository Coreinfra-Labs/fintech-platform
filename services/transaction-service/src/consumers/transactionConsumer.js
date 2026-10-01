const { Transaction } = require('../models');
const { createLogger, kafkaTopics } = require('fintech-shared-libs');
const { DLQService } = require('../services/dlqService');
const axios = require('axios');

const logger = createLogger('Transaction-Consumer');

const LEDGER_SERVICE_URL = process.env.LEDGER_SERVICE_URL || null;
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '3', 10);

let dlqService = null;

const startTransactionConsumer = async (kafkaService) => {
  dlqService = new DLQService(kafkaService);

  await kafkaService.subscribeToTopic(kafkaTopics.TOPICS.TRANSACTIONS, async (data) => {
    try {
      logger.info(`Processing transaction: ${data.transactionId}`);

      const transaction = await Transaction.findByPk(data.transactionId);
      if (!transaction) {
        logger.warn(`Transaction not found: ${data.transactionId}`);
        return;
      }

      // Update transaction to PROCESSING
      await transaction.update({ status: 'PROCESSING' });

      let ledgerRecordingSucceeded = false;

      // Attempt ledger recording if service URL is configured
      if (LEDGER_SERVICE_URL) {
        try {
          await axios.post(`${LEDGER_SERVICE_URL}/api/ledger/record`, {
            transactionId: transaction.id,
            sourceWalletId: transaction.sourceWalletId,
            destinationWalletId: transaction.destinationWalletId,
            amount: transaction.amount,
            type: transaction.type,
          }, { timeout: 5000 });
          ledgerRecordingSucceeded = true;
        } catch (error) {
          logger.error(`Ledger service error: ${error.message}`);
          
          // Send to DLQ for retry
          await dlqService.sendToDLQ(
            kafkaTopics.TOPICS.TRANSACTION_FAILED_DLQ,
            data,
            error,
            {
              originalTopic: kafkaTopics.TOPICS.TRANSACTIONS,
              reason: 'Ledger recording failed',
              retryCount: 0,
              maxRetries: MAX_RETRIES,
            }
          );

          await transaction.update({
            status: 'FAILED',
            failedReason: `Ledger recording failed: ${error.message}`,
          });
          return;
        }
      } else {
        logger.warn(
          `LEDGER_SERVICE_URL not configured; transaction ${transaction.id} will not be settled. ` +
          `Set LEDGER_SERVICE_URL environment variable to enable ledger integration.`
        );
        ledgerRecordingSucceeded = false;
      }

      // Update transaction to COMPLETED only if ledger succeeded or is not required
      if (ledgerRecordingSucceeded || !LEDGER_SERVICE_URL) {
        await transaction.update({
          status: 'COMPLETED',
          settledAt: new Date(),
        });

        // Publish completion event
        await kafkaService.publishEvent(kafkaTopics.TOPICS.TRANSACTION_COMPLETED, {
          transactionId: transaction.id,
          status: 'COMPLETED',
          amount: transaction.amount,
          type: transaction.type,
          sourceWalletId: transaction.sourceWalletId,
          destinationWalletId: transaction.destinationWalletId,
        });

        logger.info(`Transaction completed: ${transaction.id}`);
      }
    } catch (error) {
      logger.error(`Transaction processing error: ${error.message}`, error);
      
      // Send unhandled errors to DLQ
      if (data && data.transactionId) {
        await dlqService.sendToDLQ(
          kafkaTopics.TOPICS.TRANSACTION_FAILED_DLQ,
          data,
          error,
          {
            originalTopic: kafkaTopics.TOPICS.TRANSACTIONS,
            reason: 'Unhandled error in transaction consumer',
            retryCount: 0,
            maxRetries: MAX_RETRIES,
          }
        );
      }
    }
  });
};

module.exports = { startTransactionConsumer };
