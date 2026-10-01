const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

/**
 * LedgerEntry model using double-entry bookkeeping.
 * Every transaction creates two entries: debit and credit.
 * This ensures the ledger always balances: sum(debits) === sum(credits)
 */
module.exports = (sequelize) => {
  const LedgerEntry = sequelize.define(
    'LedgerEntry',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: () => uuidv4(),
        primaryKey: true,
      },
      transactionId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      accountId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      accountType: {
        type: DataTypes.ENUM('WALLET', 'INTERNAL', 'REVENUE', 'EXPENSE'),
        allowNull: false,
      },
      debit: {
        type: DataTypes.DECIMAL(20, 2),
        defaultValue: 0.0,
      },
      credit: {
        type: DataTypes.DECIMAL(20, 2),
        defaultValue: 0.0,
      },
      balance: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: false,
      },
      description: DataTypes.TEXT,
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      schema: 'ledger',
      timestamps: false,
      tableName: 'ledger_entries',
    }
  );

  return LedgerEntry;
};
