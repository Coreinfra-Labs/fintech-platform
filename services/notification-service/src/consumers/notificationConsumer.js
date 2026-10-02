const { createLogger, kafkaTopics } = require('fintech-shared-libs');
const nodemailer = require('nodemailer');
const axios = require('axios');

const logger = createLogger('Notification-Consumer');

let emailTransporter = null;

const initializeEmailTransporter = () => {
  if (!emailTransporter && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
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

  // Subscribe to transaction-completed topic
  await kafkaService.subscribeToTopic(kafkaTopics.TOPICS.TRANSACTION_COMPLETED, async (data) => {
    try {
      logger.info(`Sending notification for transaction: ${data.transactionId}`);

      // Get user details
      let userEmail = null;
      let userPhone = null;

      try {
        const userResponse = await axios.get(
          `${process.env.USER_SERVICE_URL}/api/profile/${data.sourceWalletId}`,
          { timeout: 5000 }
        );
        userEmail = userResponse.data?.email;
        userPhone = userResponse.data?.phone;
      } catch (error) {
        logger.warn(`Failed to fetch user details: ${error.message}`);
      }

      // Send email notification
      if (userEmail && emailTransporter) {
        try {
          await sendEmailNotification(userEmail, data);
          logger.info(`Email notification sent to ${userEmail}`);
        } catch (emailError) {
          logger.error(`Failed to send email: ${emailError.message}`);
        }
      }

      // Send SMS notification if Twilio is configured
      if (userPhone && process.env.TWILIO_ACCOUNT_SID) {
        try {
          await sendSMSNotification(userPhone, data);
          logger.info(`SMS notification sent to ${userPhone}`);
        } catch (smsError) {
          logger.error(`Failed to send SMS: ${smsError.message}`);
        }
      }

      logger.info(`Notification completed for transaction: ${data.transactionId}`);
    } catch (error) {
      logger.error(`Notification consumer error: ${error.message}`, error);
    }
  });

  // Subscribe to fraud alerts
  await kafkaService.subscribeToTopic(kafkaTopics.TOPICS.FRAUD_ALERT, async (data) => {
    try {
      logger.info(`Sending fraud alert notification for transaction: ${data.transactionId}`);

      // Get user details
      let userEmail = null;

      try {
        const userResponse = await axios.get(
          `${process.env.USER_SERVICE_URL}/api/profile/${data.sourceWalletId}`,
          { timeout: 5000 }
        );
        userEmail = userResponse.data?.email;
      } catch (error) {
        logger.warn(`Failed to fetch user details for fraud alert: ${error.message}`);
      }

      // Send high-priority fraud alert email
      if (userEmail && emailTransporter) {
        try {
          await sendFraudAlertEmail(userEmail, data);
          logger.info(`Fraud alert email sent to ${userEmail}`);
        } catch (emailError) {
          logger.error(`Failed to send fraud alert email: ${emailError.message}`);
        }
      }
    } catch (error) {
      logger.error(`Fraud alert notification error: ${error.message}`, error);
    }
  });
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
        <li><strong>Risk Level:</strong> <span style="color: red; font-weight: bold;">${fraudData.riskLevel}</span></li>
        <li><strong>Fraud Score:</strong> ${fraudData.fraudScore}/100</li>
        <li><strong>Date:</strong> ${new Date(fraudData.timestamp).toLocaleString()}</li>
      </ul>
      <p><strong>Action Required:</strong> Please verify this transaction immediately. If this was not you, contact our support team.</p>
      <p>Support: support@fintech.com | Phone: +1-800-FINTECH</p>
    `,
  };

  return emailTransporter.sendMail(mailOptions);
}

async function sendSMSNotification(phone, transactionData) {
  // SMS implementation using Twilio
  try {
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    const message = `Your transaction ${transactionData.transactionId} for ${transactionData.amount} has been completed successfully.`;

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
