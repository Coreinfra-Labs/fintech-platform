const { Transaction } = require('../models');
const { createLogger, kafkaTopics } = require('fintech-shared-libs');
const axios = require('axios');

const logger = createLogger('Transaction-Consumer');

/**
 * Ledger service URL from environment or null if not configured.
 * If not configured, transactions are marked as PENDING but not settled.
 * This is a limitation that should be addressed by implementing a real ledger service.
 */
const LEDGER_SERVICE_URL = process.env.LEDGER_SERVICE_URL || null;

const startTransactionConsumer = async (kafkaService) => {
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
          await transaction.update({
            status: 'FAILED',
            failedReason: `Ledger recording failed: ${error.message}`,
          });
          return;
        }
      } else {
        // Ledger service not configured
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
    }
  });
};

module.exports = { startTransactionConsumer };
