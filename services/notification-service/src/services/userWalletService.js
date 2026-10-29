const axios = require('axios');
const jwt = require('jsonwebtoken');
const { createLogger } = require('fintech-shared-libs');

const logger = createLogger('User-Wallet-Service');

const WALLET_SERVICE_URL = process.env.WALLET_SERVICE_URL || 'http://localhost:3002';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-development-secret';

/**
 * Fetch user ID from wallet ID by calling wallet service.
 */
const getUserIdFromWallet = async (walletId) => {
  try {
    const response = await axios.get(
      `${WALLET_SERVICE_URL}/api/wallet/${walletId}`,
      { timeout: 5000 }
    );
    return response.data.userId;
  } catch (error) {
    logger.error(`Failed to fetch wallet ${walletId}: ${error.message}`);
    return null;
  }
};

/**
 * Fetch user contact info (email, phone) by user ID.
 */
const getUserContact = async (userId) => {
  try {
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1m' });
    const response = await axios.get(
      `${USER_SERVICE_URL}/api/profile/${userId}`,
      {
        timeout: 5000,
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return {
      email: response.data.email,
      phone: response.data.phoneNumber || response.data.phone,
      name: response.data.firstName || response.data.first_name,
    };
  } catch (error) {
    logger.warn(`Failed to fetch user ${userId} contact info: ${error.message}`);
    return { email: null, phone: null, name: null };
  }
};

/**
 * Resolve user contact from wallet ID (multi-step lookup).
 */
const getUserContactFromWallet = async (walletId) => {
  const userId = await getUserIdFromWallet(walletId);
  if (!userId) {
    return { email: null, phone: null, name: null };
  }
  return getUserContact(userId);
};

module.exports = {
  getUserIdFromWallet,
  getUserContact,
  getUserContactFromWallet,
};
