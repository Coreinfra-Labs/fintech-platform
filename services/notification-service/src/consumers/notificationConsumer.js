const { createLogger, kafkaTopics } = require('fintech-shared-libs');
const { DLQService } = require('../services/dlqService');
const { getUserContactFromWallet } = require('../services/userWalletService');
const nodemailer = require('nodemailer');
const twilio = require('twilio');

const logger = createLogger('Notification-Consumer');

const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '3', 10);

const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'noreply@fintech.com',
    pass: process.env.EMAIL_PASSWORD || '',
  },
});

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sendTransactionEmail = async (userEmail, userName, transactionData) => {
  if (!userEmail) {
    logger.warn(`No email for transaction ${transactionData.transactionId}`);
    return false;
  }

  try {
    const userGreeting = userName ? `Hi ${userName},` : 'Hello,';
    
    const emailContent = `
      <p>${userGreeting}</p>
      <h2>Transaction Completed</h2>
      <p>Your transaction has been successfully completed.</p>
      <table style="border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;"><strong>Transaction ID:</strong></td>
          <td style="border: 1px solid #ddd; padding: 8px;">${transactionData.transactionId}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;"><strong>Amount:</strong></td>
          <td style="border: 1px solid #ddd; padding: 8px;">${transactionData.amount}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;"><strong>Type:</strong></td>
          <td style="border: 1px solid #ddd; padding: 8px;">${transactionData.type}</td>
        </tr>
      </table>
      <p>If you have any questions, please contact support.</p>
      <p>Best regards,<br>FinTech Platform Team</p>
    `;

    await emailTransporter.sendMail({
      from: process.env.EMAIL_USER || 'noreply@fintech.com',
      to: userEmail,
      subject: `Transaction Confirmation: ${transactionData.transactionId}`,
      html: emailContent,
    });

    logger.info(`Email sent to ${userEmail} for transaction ${transactionData.transactionId}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send email to ${userEmail}: ${error.message}`);
    return false;
  }
};

const sendTransactionSMS = async (userPhone, userName, transactionData) => {
  if (!userPhone || !process.env.TWILIO_PHONE) {
    logger.warn(`No phone or Twilio not configured for transaction ${transactionData.transactionId}`);
    return false;
  }

  try {
    const userGreeting = userName ? `${userName},` : '';
    const message = `${userGreeting} Your ${transactionData.type} of ${transactionData.amount} has been ${transactionData.status}. ` +
      `Ref: ${transactionData.transactionId}. Contact support if needed.`;

    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE,
      to: userPhone,
    });

    logger.info(`SMS sent to ${userPhone} for transaction ${transactionData.transactionId}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send SMS to ${userPhone}: ${error.message}`);
    return false;
  }
};

let dlqService = null;

const startNotificationConsumer = async (kafkaService) => {
  dlqService = new DLQService(kafkaService);

  await kafkaService.subscribeToTopic(kafkaTopics.TOPICS.TRANSACTION_COMPLETED, async (data) => {
    try {
      const { transactionId, status, amount, type, sourceWalletId } = data;

      logger.info(`Processing notification for transaction ${transactionId} (status: ${status})`);

      if (status !== 'COMPLETED') {
        logger.debug(`Skipping notification for non-completed transaction ${transactionId}`);
        return;
      }

      // Fetch user contact from wallet ID
      const userContact = await getUserContactFromWallet(sourceWalletId);

      if (!userContact.email && !userContact.phone) {
        logger.warn(`No contact info available for transaction ${transactionId} from wallet ${sourceWalletId}`);
        
        await dlqService.sendToDLQ(
          kafkaTopics.TOPICS.NOTIFICATION_DLQ,
          data,
          new Error('No contact info available'),
          {
            originalTopic: kafkaTopics.TOPICS.TRANSACTION_COMPLETED,
            reason: 'No email or phone for user',
            retryCount: 0,
            maxRetries: MAX_RETRIES,
          }
        );
        return;
      }

      const notificationData = {
        transactionId,
        status,
        amount,
        type,
      };

      const results = await Promise.allSettled([
        userContact.email ? sendTransactionEmail(userContact.email, userContact.name, notificationData) : Promise.resolve(false),
        userContact.phone ? sendTransactionSMS(userContact.phone, userContact.name, notificationData) : Promise.resolve(false),
      ]);

      const emailSent = results[0].status === 'fulfilled' && results[0].value;
      const smsSent = results[1].status === 'fulfilled' && results[1].value;

      if (emailSent || smsSent) {
        logger.info(
          `Notification sent for transaction ${transactionId} ` +
          `(email: ${emailSent}, sms: ${smsSent})`
        );
      } else {
        logger.warn(`Failed to send notifications for transaction ${transactionId}`);
        
        await dlqService.sendToDLQ(
          kafkaTopics.TOPICS.NOTIFICATION_DLQ,
          data,
          new Error('Failed to send email and SMS'),
          {
            originalTopic: kafkaTopics.TOPICS.TRANSACTION_COMPLETED,
            reason: 'Email and SMS delivery failed',
            retryCount: 0,
            maxRetries: MAX_RETRIES,
          }
        );
      }
    } catch (error) {
      logger.error(`Notification consumer error: ${error.message}`, error);
      
      if (data && data.transactionId) {
        await dlqService.sendToDLQ(
          kafkaTopics.TOPICS.NOTIFICATION_DLQ,
          data,
          error,
          {
            originalTopic: kafkaTopics.TOPICS.TRANSACTION_COMPLETED,
            reason: 'Unhandled error in notification consumer',
            retryCount: 0,
            maxRetries: MAX_RETRIES,
          }
        );
      }
    }
  });
};

module.exports = { startNotificationConsumer };
