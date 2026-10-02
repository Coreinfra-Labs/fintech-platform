const { Sequelize } = require('sequelize');
const TransactionModel = require('./Transaction');
const OutboxModel = require('./Outbox');
const InboxModel = require('./Inbox');
const DLQMessageModel = require('./DLQMessage');

const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'postgresql://fintech_user:fintech_secure_password@localhost:5432/fintech_db',
  {
    dialect: 'postgres',
    logging: false,
  }
);

const Transaction = TransactionModel(sequelize);
const Outbox = OutboxModel(sequelize);
const Inbox = InboxModel(sequelize);
const DLQMessage = DLQMessageModel(sequelize);

module.exports = {
  sequelize,
  Transaction,
  Outbox,
  Inbox,
  DLQMessage,
};
