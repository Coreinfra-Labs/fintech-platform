const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
  return sequelize.define(
    'DLQMessage',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: () => uuidv4(),
        primaryKey: true,
      },
      dlqTopic: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      originalMessage: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      errorMessage: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      errorStack: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      retryCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      status: {
        type: DataTypes.ENUM('PENDING', 'RETRYING', 'FAILED', 'RESOLVED'),
        defaultValue: 'PENDING',
      },
      nextRetryAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      lastRetryAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      resolvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      schema: 'transactions',
      tableName: 'dlq_messages',
      timestamps: false,
    }
  );
};
