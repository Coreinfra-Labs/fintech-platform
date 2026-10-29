const { createLogger, kafkaTopics } = require('fintech-shared-libs');
const nodemailer = require('nodemailer');
const { DLQService } = require('../services/dlqService');
const { getUserContactFromWallet } = require('../services/userWalletService');

const logger = createLogger('Notification-Consumer');

let emailTransporter = null;


const initializeEmailTransporter = () => {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }
};

const startNotificationConsumer = async (kafkaService) => {
  initializeEmailTransporter();
  const dlqService = new DLQService(kafkaService);

  const handleTransactionCompleted = async (data, originalTopic) => {
    try {
      if (data.status !== 'COMPLETED') {
        return;
      }

      const notification = {
        ...data,
        transactionId: data.transactionId || data.paymentId,
      };
      logger.info(`Sending notification for transaction: ${notification.transactionId}`);

      const contact = await getUserContactFromWallet(data.sourceWalletId);
      if (!contact.email && !contact.phone) {
        throw new Error(`No contact details found for wallet ${data.sourceWalletId}`);
      }

      let delivered = false;
      if (contact.email && emailTransporter) {
        await sendEmailNotification(contact.email, notification);
        logger.info(`Email notification sent to ${contact.email}`);
        delivered = true;
      }

      if (contact.phone && process.env.TWILIO_ACCOUNT_SID) {
        await sendSMSNotification(contact.phone, notification);
        logger.info(`SMS notification sent to ${contact.phone}`);
        delivered = true;
      }

      if (!delivered) {
        throw new Error('No notification provider is configured for the available contact details');
      }

    } catch (error) {
      logger.error(`Notification consumer error: ${error.message}`, error);
      await dlqService.sendToDLQ(
        kafkaTopics.TOPICS.NOTIFICATION_DLQ,
        data,
        error,
        { originalTopic }
      );
    }
  };

  const handleFraudAlert = async (data) => {
    try {
      logger.info(`Sending fraud alert notification for transaction: ${data.transactionId}`);

      const contact = await getUserContactFromWallet(data.sourceWalletId);
      if (!contact.email) {
        throw new Error(`No email address found for wallet ${data.sourceWalletId}`);
      }

      if (emailTransporter) {
        await sendFraudAlertEmail(contact.email, data);
        logger.info(`Fraud alert email sent to ${contact.email}`);
      }
    } catch (error) {
      logger.error(`Fraud alert notification error: ${error.message}`, error);
      await dlqService.sendToDLQ(
        kafkaTopics.TOPICS.NOTIFICATION_DLQ,
        data,
        error,
        { originalTopic: kafkaTopics.TOPICS.FRAUD_ALERT }
      );
    }
  };

  const handlePaymentInitiated = async (data) => {
    try {
      const paymentId = data.transactionId || data.paymentId;
      const contact = await getUserContactFromWallet(data.sourceWalletId);
      let delivered = false;

      if (contact.email && emailTransporter) {
        await sendPaymentInitiatedEmail(contact.email, { ...data, paymentId });
        delivered = true;
      }

      if (contact.phone && process.env.TWILIO_ACCOUNT_SID) {
        await sendSMSNotification(contact.phone, {
          ...data,
          transactionId: paymentId,
          type: data.type || 'PAYMENT',
        }, 'initiated');
        delivered = true;
      }

      if (!delivered) {
        throw new Error(`No notification channel available for payment ${paymentId}`);
      }
    } catch (error) {
      logger.error(`Payment initiation notification error: ${error.message}`, error);
      await dlqService.sendToDLQ(
        kafkaTopics.TOPICS.NOTIFICATION_DLQ,
        data,
        error,
        { originalTopic: kafkaTopics.TOPICS.PAYMENT_INITIATED }
      );
    }
  };

  await kafkaService.subscribeToTopics([
    {
      topic: kafkaTopics.TOPICS.TRANSACTION_COMPLETED,
      callback: (data) => handleTransactionCompleted(data, kafkaTopics.TOPICS.TRANSACTION_COMPLETED),
    },
    {
      topic: kafkaTopics.TOPICS.PAYMENT_COMPLETED,
      callback: (data) => handleTransactionCompleted(data, kafkaTopics.TOPICS.PAYMENT_COMPLETED),
    },
    { topic: kafkaTopics.TOPICS.PAYMENT_INITIATED, callback: handlePaymentInitiated },
    { topic: kafkaTopics.TOPICS.FRAUD_ALERT, callback: handleFraudAlert },
  ]);
};

async function sendEmailNotification(email, transactionData) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Transaction Confirmation - ${transactionData.transactionId}`,
    html: `
      <h2>Transaction Completed Successfully</h2>
      <p>Your transaction has been processed.</p>
      <ul>
        <li><strong>Transaction ID:</strong> ${transactionData.transactionId}</li>
        <li><strong>Amount:</strong> ${transactionData.amount}</li>
        <li><strong>Type:</strong> ${transactionData.type}</li>
        <li><strong>Status:</strong> ${transactionData.status}</li>
        <li><strong>Date:</strong> ${new Date(transactionData.timestamp).toLocaleString()}</li>
      </ul>
      <p>Thank you for using our service.</p>
    `,
  };

  return emailTransporter.sendMail(mailOptions);
}

async function sendFraudAlertEmail(email, fraudData) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `⚠️ URGENT: Suspicious Activity Detected - Transaction ${fraudData.transactionId}`,
    html: `
      <h2 style="color: red;">⚠️ Suspicious Activity Alert</h2>
      <p>We detected unusual activity on your account.</p>
      <ul>
        <li><strong>Transaction ID:</strong> ${fraudData.transactionId}</li>
        <li><strong>Amount:</strong> ${fraudData.amount}</li>
        <li><strong>Alert:</strong> <span style="color: red; font-weight: bold;">${fraudData.alertType}</span></li>
        <li><strong>Fraud Score:</strong> ${fraudData.riskScore}/100</li>
        <li><strong>Date:</strong> ${new Date(fraudData.timestamp).toLocaleString()}</li>
      </ul>
      <p><strong>Action Required:</strong> Please verify this transaction immediately. If this was not you, contact our support team.</p>
      <p>Support: support@fintech.com | Phone: +1-800-FINTECH</p>
    `,
  };

  return emailTransporter.sendMail(mailOptions);
}

async function sendPaymentInitiatedEmail(email, paymentData) {
  return emailTransporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Payment Initiated - ${paymentData.paymentId}`,
    html: `
      <h2>Payment Initiated</h2>
      <p>Your payment of ${paymentData.amount} has been initiated.</p>
      <p><strong>Reference:</strong> ${paymentData.paymentId}</p>
    `,
  });
}

async function sendSMSNotification(phone, transactionData, status = 'completed successfully') {
  // SMS implementation using Twilio
  try {
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  
    const message = `Your ${transactionData.type} transaction ${transactionData.transactionId} for ${transactionData.amount} has been ${status}.`;

    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE,
      to: phone,
    });

    logger.info(`SMS sent to ${phone}`);
  } catch (error) {
    logger.error(`Failed to send SMS via Twilio: ${error.message}`);
    throw error;
  }
}

module.exports = { startNotificationConsumer };
